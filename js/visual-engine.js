import {MORSE,PROSIGNS,unitSeconds} from './morse-engine.js?v=16';
import {mnemonicFor} from './mnemonics.js?v=16';

const TAU=Math.PI*2;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const lerp=(a,b,t)=>a+(b-a)*t;
const ease=t=>t*t*(3-2*t);

function resample(points,n=220){
  if(!points?.length)return Array.from({length:n},()=>({x:0,y:0}));
  const d=[0];let total=0;
  for(let i=1;i<points.length;i++){total+=Math.hypot(points[i].x-points[i-1].x,points[i].y-points[i-1].y);d.push(total)}
  if(!total)return Array.from({length:n},()=>({...points[0]}));
  const out=[];let j=1;
  for(let i=0;i<n;i++){
    const target=total*i/(n-1);
    while(j<d.length-1&&d[j]<target)j++;
    const a=points[j-1],b=points[j],span=Math.max(.0001,d[j]-d[j-1]),q=(target-d[j-1])/span;
    out.push({x:lerp(a.x,b.x,q),y:lerp(a.y,b.y,q)});
  }
  return out;
}
function poly(cx,cy,s,arr){return arr.map(([x,y])=>({x:cx+x*s,y:cy+y*s}))}
function circle(cx,cy,r,n=90,a0=0,a1=TAU){const p=[];for(let i=0;i<=n;i++){const a=a0+(a1-a0)*i/n;p.push({x:cx+Math.cos(a)*r,y:cy+Math.sin(a)*r})}return p}
function concat(...lists){return lists.flat()}

export class VisualEngine{
  constructor(canvas){
    this.c=canvas;this.x=canvas.getContext('2d');
    this.audioAnalyser=null;this.wave=new Uint8Array(1024);
    this.smoothedEnergy=.03;
    this.shapeName='';this.shapeStart=0;this.prevShape=null;this.lastRendered=null;
    this.language='es';
  }
  setLanguage(l){this.language=l||'es'}
  setAnalyser(a){this.audioAnalyser=a;if(a)this.wave=new Uint8Array(a.fftSize)}
  background(ctx,w,h){
    const g=ctx.createRadialGradient(w*.5,h*.43,0,w*.5,h*.44,w*.78);
    g.addColorStop(0,'#102838');g.addColorStop(.38,'#071119');g.addColorStop(1,'#020406');
    ctx.fillStyle=g;ctx.fillRect(0,0,w,h);
    const sheen=ctx.createLinearGradient(0,0,w,h);sheen.addColorStop(0,'rgba(121,229,255,.025)');sheen.addColorStop(.5,'rgba(255,255,255,0)');sheen.addColorStop(1,'rgba(185,255,222,.018)');
    ctx.fillStyle=sheen;ctx.fillRect(0,0,w,h);
  }
  voiceEnergy(){
    let target=.025;
    if(this.audioAnalyser){
      this.audioAnalyser.getByteTimeDomainData(this.wave);
      let sum=0;for(const v of this.wave){const q=(v-128)/128;sum+=q*q}
      target=clamp(Math.sqrt(sum/this.wave.length)*6.2,0,1);
    }
    this.smoothedEnergy=lerp(this.smoothedEnergy,target,target>this.smoothedEnergy?.22:.10);
    return this.smoothedEnergy;
  }
  shapeLine(w,h){return [{x:w*.16,y:h*.66},{x:w*.84,y:h*.66}]}
  shapeMouth(time,w,h){
    const e=this.voiceEnergy(),cx=w/2,cy=h*.66,ww=w*.52,N=130,top=[],bottom=[];
    const open=12+e*92;
    for(let i=0;i<N;i++){
      const xN=-1+2*i/(N-1),edge=Math.pow(Math.max(0,1-xN*xN),.62),x=cx+xN*ww/2;
      const cupid= -13*Math.exp(-Math.pow((xN-.23)/.15,2))-13*Math.exp(-Math.pow((xN+.23)/.15,2))+11*Math.exp(-Math.pow(xN/.11,2));
      const electric=(Math.sin(i*.42+time*10)+Math.sin(i*.13-time*15))*e*3.1*edge;
      const y=cy-open*.43*edge+cupid*(.25+.7*e)+electric;
      top.push({x,y});
    }
    for(let i=N-1;i>=0;i--){
      const xN=-1+2*i/(N-1),edge=Math.pow(Math.max(0,1-xN*xN),.68),x=cx+xN*ww/2;
      const fullness=8*Math.exp(-Math.pow(xN/.47,2));
      const electric=(Math.sin(i*.36-time*11)+Math.sin(i*.15+time*12))*e*2.3*edge;
      const y=cy+open*.50*edge+fullness*(.3+.7*e)+electric;
      bottom.push({x,y});
    }
    return [...top,...bottom,top[0]];
  }
  shapeClock(w,h){const cx=w/2,cy=h*.66,r=68;return concat(circle(cx,cy,r),[{x:cx,y:cy},{x:cx,y:cy-r*.58},{x:cx,y:cy},{x:cx+r*.42,y:cy+r*.13}])}
  shapeTarget(w,h){const cx=w/2,cy=h*.66;return concat(circle(cx,cy,76),circle(cx,cy,42),circle(cx,cy,10))}
  shapeQso(time,w,h){
    const cx=w/2,cy=h*.66;
    const a=circle(cx-95,cy,31),b=circle(cx+95,cy,31),wave=[];
    for(let i=0;i<=80;i++){const u=i/80;wave.push({x:cx-58+u*116,y:cy+Math.sin(u*Math.PI*4+time*.6)*18*(.35+.65*Math.sin(Math.PI*u))})}
    return concat(a,wave,b);
  }
  shapeWaves(w,h){const cx=w/2,cy=h*.66,p=[];for(const r of [32,54,78,105])p.push(...circle(cx,cy,r,55,-1.05,1.05));return p}
  shapeCw(event,w,h){
    const text=String(event?.data?.text||'').toUpperCase(),patterns=[];
    for(const c of text){if(c===' '){patterns.push('gap');continue}const pat=PROSIGNS[c]||MORSE[c];if(pat)patterns.push(...pat.split(''),'charGap')}
    while(patterns.at(-1)==='charGap')patterns.pop();
    let units=0;for(const s of patterns){units+=s==='.'?1:s==='-'?3:s==='gap'?7:2}
    units=Math.max(units,1);
    const maxW=w*.58,unit=Math.min(28,maxW/units),total=units*unit,left=(w-total)/2,base=h*.70,high=h*.58,p=[];
    let x=left;p.push({x,y:base});
    for(const s of patterns){
      if(s==='.'||s==='-'){
        const ww=(s==='.'?1:3)*unit;p.push({x,y:base},{x,y:high},{x:x+ww,y:high},{x:x+ww,y:base});x+=ww;
      }else{x+=(s==='gap'?7:2)*unit;p.push({x,y:base})}
    }
    return p;
  }
  icon(shape,w,h){
    const cx=w/2,cy=h*.66,s=Math.min(w,h)/6.2;
    const P=(a)=>poly(cx,cy,s,a);
    switch(shape){
      case 'bow': return concat(P([[-.85,.65],[-.62,.15],[-.38,-.35],[0,-.65],[.38,-.35],[.62,.15],[.85,.65]]),P([[-.85,.65],[.85,.65]]),P([[.12,.58],[.76,.02],[.45,.02],[.76,.02],[.64,.28]]));
      case 'arrow': return P([[-.9,.15],[.45,.15],[.18,-.12],[.45,.15],[.18,.42]]);
      case 'boat': case 'yacht': return concat(P([[-.8,.35],[-.55,.68],[.55,.68],[.8,.35],[-.8,.35]]),P([[0,.35],[0,-.75],[.55,.16],[0,.16]]));
      case 'bridge': return concat(P([[-.9,.55],[-.6,.1],[-.3,-.22],[0,-.35],[.3,-.22],[.6,.1],[.9,.55]]),P([[-.9,.55],[.9,.55]]));
      case 'bell': return concat(P([[-.6,.45],[-.48,-.2],[-.25,-.58],[.25,-.58],[.48,-.2],[.6,.45],[-.6,.45]]),circle(cx,cy+s*.58,s*.10,30));
      case 'crown': return P([[-.8,.45],[-.65,-.4],[-.25,.05],[0,-.6],[.25,.05],[.65,-.4],[.8,.45],[-.8,.45]]);
      case 'cube': return concat(P([[-.55,-.25],[0,-.55],[.55,-.25],[0,.05],[-.55,-.25],[-.55,.4],[0,.72],[.55,.4],[.55,-.25]]),P([[0,.05],[0,.72]]));
      case 'drum': return concat(P([[-.6,-.45],[.6,-.45],[.6,.45],[-.6,.45],[-.6,-.45]]),P([[-.8,-.7],[.75,.7],[.7,-.7],[-.75,.7]]));
      case 'star': return P([[0,-.8],[.18,-.25],[.75,-.25],[.29,.1],[.47,.68],[0,.34],[-.47,.68],[-.29,.1],[-.75,-.25],[-.18,-.25],[0,-.8]]);
      case 'eye': return concat(P([[-.9,0],[-.5,-.38],[0,-.5],[.5,-.38],[.9,0],[.5,.38],[0,.5],[-.5,.38],[-.9,0]]),circle(cx,cy,s*.20,35));
      case 'lighthouse': return concat(P([[-.32,.7],[-.2,-.52],[.2,-.52],[.32,.7],[-.32,.7]]),P([[-.35,-.55],[.35,-.55],[.18,-.78],[-.18,-.78],[-.35,-.55]]),P([[.3,-.62],[.95,-.82],[.3,-.45]]));
      case 'flag': return concat(P([[-.55,.7],[-.55,-.75]]),P([[-.55,-.7],[.55,-.55],[.15,-.15],[-.55,-.28]]));
      case 'cat': return concat(P([[-.65,.35],[-.5,-.3],[-.25,-.55],[0,-.38],[.25,-.55],[.5,-.3],[.65,.35],[.2,.55],[-.25,.55],[-.65,.35]]),P([[.58,.2],[.9,-.05],[.78,-.35]]));
      case 'guitar': return concat(circle(cx-s*.22,cy+s*.2,s*.35,40),circle(cx+s*.12,cy-s*.12,s*.24,40),P([[.25,-.32],[.82,-.78],[.9,-.68],[.35,-.2]]));
      case 'axe': return concat(P([[-.55,.7],[.55,-.7]]),P([[.28,-.63],[.75,-.52],[.55,-.05],[.14,-.27],[.28,-.63]]));
      case 'hammer': return concat(P([[-.2,.72],[.18,-.18]]),P([[-.35,-.62],[.55,-.62],[.55,-.28],[-.35,-.28],[-.35,-.62]]));
      case 'magnet': return P([[-.65,-.55],[-.65,.15],[-.45,.55],[-.15,.7],[.15,.7],[.45,.55],[.65,.15],[.65,-.55],[.25,-.55],[.25,.05],[.12,.25],[-.12,.25],[-.25,.05],[-.25,-.55],[-.65,-.55]]);
      case 'ice': return P([[0,-.8],[.55,-.25],[.38,.55],[-.25,.75],[-.65,.15],[0,-.8]]);
      case 'giraffe': return P([[-.45,.7],[-.4,.05],[-.15,-.1],[-.05,-.72],[.22,-.72],[.18,-.25],[.55,-.1],[.42,.25],[.2,.2],[.18,.7],[-.45,.7]]);
      case 'jet': return P([[-.9,.1],[-.2,-.1],[.1,-.65],[.3,-.65],[.18,-.05],[.88,.08],[.18,.2],[.3,.72],[.08,.72],[-.22,.22],[-.9,.1]]);
      case 'kayak': return concat(P([[-.9,0],[-.45,-.2],[.45,-.2],[.9,0],[.45,.2],[-.45,.2],[-.9,0]]),P([[-.55,-.6],[.55,.6]]));
      case 'kite': return concat(P([[0,-.8],[.55,0],[0,.58],[-.55,0],[0,-.8]]),P([[0,.58],[.18,.8],[.05,.92],[.28,1.05]]));
      case 'moon': return concat(circle(cx,cy,s*.65,70,-1.15,1.15),circle(cx+s*.23,cy,s*.48,60,1.12,-1.12));
      case 'mountain': return P([[-.9,.65],[-.35,-.5],[-.08,-.12],[.25,-.75],[.9,.65],[-.9,.65]]);
      case 'cloud': return concat(circle(cx-s*.45,cy+s*.05,s*.28,35,2.8,6.2),circle(cx-s*.08,cy-s*.18,s*.34,42,3.0,6.2),circle(cx+s*.35,cy,s*.3,38,3.2,6.3),P([[.6,.28],[-.65,.28]]));
      case 'needle': return concat(P([[-.8,.65],[.65,-.65]]),circle(cx+s*.55,cy-s*.55,s*.10,24));
      case 'orbit': return concat(circle(cx,cy,s*.5,50),circle(cx,cy,s*.78,70,-.35,3.65),circle(cx+s*.68,cy-s*.18,s*.08,20));
      case 'piano': {let p=P([[-.85,-.42],[.85,-.42],[.85,.42],[-.85,.42],[-.85,-.42]]);for(let i=-3;i<=3;i++)p.push(...P([[i*.2,-.42],[i*.2,.42]]));return p}
      case 'cheese': return concat(P([[-.7,.55],[-.5,-.3],[.3,-.62],[.75,.2],[.55,.6],[-.7,.55]]),circle(cx-s*.2,cy+s*.05,s*.08,18),circle(cx+s*.28,cy+s*.22,s*.07,18));
      case 'quill': return concat(P([[-.65,.7],[.55,-.72],[.35,-.25],[-.1,.15],[.55,-.72],[-.4,-.08],[-.65,.7]]),P([[-.65,.7],[.75,.78]]));
      case 'clock': return this.shapeClock(w,h);
      case 'rocket': return concat(P([[0,-.85],[.36,-.28],[.25,.35],[0,.62],[-.25,.35],[-.36,-.28],[0,-.85]]),P([[-.25,.28],[-.58,.55],[-.22,.52],[0,.62],[.22,.52],[.58,.55],[.25,.28]]));
      case 'snake': {const p=[];for(let i=0;i<=100;i++){const u=i/100;p.push({x:cx-s*.8+u*s*1.6,y:cy+Math.sin(u*Math.PI*3)*s*.34})}return p}
      case 'tower': return concat(P([[-.35,.72],[-.2,-.7],[.2,-.7],[.35,.72],[-.35,.72]]),P([[-.5,.2],[.5,.2],[-.42,-.15],[.42,-.15]]));
      case 'grapes': return concat(...[[-.3,-.4],[0,-.5],[.3,-.35],[-.15,-.08],[.18,-.02],[0,.28]].map(([x,y])=>circle(cx+x*s,cy+y*s,s*.18,24)),P([[0,-.65],[.28,-.9]]));
      case 'umbrella': return concat(P([[-.8,0],[-.55,-.35],[-.2,-.55],[.2,-.55],[.55,-.35],[.8,0],[-.8,0]]),P([[0,-.55],[0,.6],[.18,.78],[.36,.62]]));
      case 'sailboat': return concat(P([[-.8,.4],[.72,.4],[.48,.7],[-.55,.7],[-.8,.4]]),P([[0,.38],[0,-.75],[.55,.2],[0,.2],[-.42,.05],[0,-.65]]));
      case 'violin': return concat(circle(cx-s*.15,cy+s*.2,s*.25,35),circle(cx+s*.1,cy-s*.15,s*.19,35),P([[.18,-.28],[.72,-.8],[.82,-.7],[.28,-.18]]));
      case 'wok': return concat(P([[-.8,-.1],[-.55,.5],[0,.68],[.55,.5],[.8,-.1]]),P([[.72,-.08],[1.05,-.28]]));
      case 'wave': {const p=[];for(let i=0;i<=100;i++){const u=i/100;p.push({x:cx-s*.9+u*s*1.8,y:cy+Math.sin(u*Math.PI*2)*s*.35})}return p}
      case 'xylophone': {let p=[];for(let i=0;i<7;i++){const x=-.7+i*.23;p.push(...P([[x,-.55+i*.07],[x+.14,.55-i*.07]]))}return concat(p,P([[-.8,.72],[.75,-.7]]))}
      case 'shoe': return P([[-.75,-.25],[-.35,-.25],[-.12,.18],[.65,.28],[.85,.55],[.6,.68],[-.7,.62],[-.75,-.25]]);
      case 'zipper': {let p=P([[-.65,-.7],[.65,.7]]);for(let i=0;i<8;i++){const u=i/7,x=-.52+u*1.05,y=-.58+u*1.16;p.push(...P([[x-.12,y],[x+.12,y]]))}return p}
      case 'ring': return circle(cx,cy,s*.62,100);
      case 'candle': return concat(P([[-.18,.7],[-.18,-.25],[.18,-.25],[.18,.7],[-.18,.7]]),P([[0,-.25],[-.16,-.55],[0,-.82],[.16,-.55],[0,-.25]]));
      case 'swan': return concat(circle(cx-s*.15,cy+s*.25,s*.38,55,.1,5.7),P([[.05,.15],[.18,-.45],[.45,-.72],[.65,-.55],[.48,-.4]]));
      case 'clover': return concat(circle(cx-s*.2,cy-s*.2,s*.25,30),circle(cx+s*.2,cy-s*.2,s*.25,30),circle(cx-s*.2,cy+s*.18,s*.25,30),circle(cx+s*.2,cy+s*.18,s*.25,30),P([[0,.35],[0,.85]]));
      case 'chair': return concat(P([[-.55,-.65],[-.55,.25],[.5,.25],[.5,.5],[-.55,.5]]),P([[-.45,.5],[-.55,.85],[.4,.5],[.5,.85]]));
      case 'hand': return P([[-.55,.65],[-.55,-.05],[-.42,-.62],[-.25,-.62],[-.25,-.1],[-.15,-.78],[.02,-.78],[.02,-.08],[.14,-.7],[.3,-.68],[.28,-.02],[.42,-.52],[.57,-.46],[.5,.3],[.2,.7],[-.55,.65]]);
      case 'snail': return concat(circle(cx-s*.2,cy,s*.42,65),P([[-.58,.25],[.68,.25],[.82,.05],[.65,-.05],[.78,-.35],[.65,-.05]]));
      case 'scythe': return concat(P([[-.55,.78],[.12,-.65]]),P([[.05,-.55],[.35,-.75],[.75,-.66],[.92,-.42]]));
      case 'hourglass': return P([[-.55,-.72],[.55,-.72],[.18,-.1],[.55,.72],[-.55,.72],[-.18,-.1],[-.55,-.72]]);
      case 'balloon': return concat(circle(cx,cy-s*.12,s*.48,70),P([[0,.38],[.08,.55],[-.05,.72],[.12,.9]]));
      default: return this.shapeTarget(w,h);
    }
  }
  shapeFor(shape,event,time,w,h){
    if(shape==='none')return [];
    if(shape==='mouth')return this.shapeMouth(time,w,h);
    if(shape==='cw')return this.shapeCw(event,w,h);
    if(shape==='clock')return this.shapeClock(w,h);
    if(shape==='qso'||shape==='headcopy')return this.shapeQso(time,w,h);
    if(shape==='recognition'||shape==='focus')return this.shapeTarget(w,h);
    if(shape==='mnemonic'){
      const item=mnemonicFor(event?.data?.text||event?.data?.char,event?.data?.lang||this.language);
      return item?this.icon(item.shape,w,h):this.shapeTarget(w,h);
    }
    return this.shapeWaves(w,h);
  }
  drawLivingLine(points,time){
    if(!points?.length)return;
    const ctx=this.x,p=resample(points,220);
    ctx.save();ctx.lineCap='round';ctx.lineJoin='round';
    for(const [lw,alpha,blur] of [[11,.04,30],[5,.11,18],[2.0,.86,9]]){
      ctx.beginPath();p.forEach((pt,i)=>i?ctx.lineTo(pt.x,pt.y):ctx.moveTo(pt.x,pt.y));
      ctx.strokeStyle=`rgba(126,232,255,${alpha})`;ctx.lineWidth=lw;ctx.shadowBlur=blur;ctx.shadowColor='#6fe5ff';ctx.stroke();
    }
    ctx.shadowBlur=0;ctx.lineWidth=.75;
    for(let i=5;i<p.length-5;i+=8){
      const u=i/(p.length-1),center=1-Math.abs(u-.5)*2,pt=p[i],nx=p[i+1].y-p[i-1].y,ny=-(p[i+1].x-p[i-1].x),len=Math.max(1,Math.hypot(nx,ny));
      const j=(Math.sin(i*8.7+time*18)*.5+.5)*(2+8*Math.max(0,center));
      ctx.beginPath();ctx.moveTo(pt.x,pt.y);ctx.lineTo(pt.x+nx/len*j,pt.y+ny/len*j);ctx.strokeStyle=`rgba(185,255,222,${.07+.2*Math.max(0,center)})`;ctx.stroke();
    }
    ctx.restore();
  }
  draw(time,timeline){
    const ctx=this.x,w=this.c.width,h=this.c.height;this.background(ctx,w,h);
    const ev=timeline?.at(time)||[];
    let main='',sub='',shape='none',shapeEvent=null,mnemonicLabel='';
    for(const e of ev){
      if(e.type==='title'){main=e.data.title||'';sub=e.data.subtitle||'';shape='none';shapeEvent=e}
      if(e.type==='outro'){main=e.data.title||'';sub=e.data.subtitle||'';shape='recognition';shapeEvent=e}
      if(e.type==='voice'){
        main=e.data.visual?.title||'';sub=e.data.visual?.subtitle||'';
        const g=e.data.visual?.graphic||'voice';
        shape=g==='clock'?'clock':g==='qso'?'qso':g==='headcopy'?'headcopy':g==='recognition'||g==='focus'?'recognition':'mouth';
        shapeEvent=e;
      }
      if(e.type==='charVoice'){main=e.data.char||'';sub='';shape='mouth';shapeEvent=e}
      if(e.type==='cw'){main='';sub='';shape='cw';shapeEvent=e}
      if(e.type==='reveal'){
        main=e.data.text||'';shape=e.data.mnemonic?'mnemonic':'recognition';shapeEvent=e;
        if(e.data.mnemonic){const m=mnemonicFor(e.data.text,e.data.lang||this.language);mnemonicLabel=m?.word||''}
      }
      if(e.type==='check'){main='✓';sub='';shape='recognition';shapeEvent=e}
    }

    if(shape!=='none'){
      const target=resample(this.shapeFor(shape,shapeEvent,time,w,h),220);
      if(shape!==this.shapeName){
        this.prevShape=this.lastRendered?.length?this.lastRendered.map(p=>({...p})):target;
        this.shapeStart=performance.now();this.shapeName=shape;
      }
      const morphMs=shape==='cw'?85:shape==='mouth'?150:320;
      const m=ease(clamp((performance.now()-this.shapeStart)/morphMs,0,1));
      const points=target.map((p,i)=>({x:lerp(this.prevShape?.[i]?.x??p.x,p.x,m),y:lerp(this.prevShape?.[i]?.y??p.y,p.y,m)}));
      this.lastRendered=points;this.drawLivingLine(points,time);
    }else{
      this.shapeName='none';this.lastRendered=null;
    }

    if(main){
      ctx.textAlign='center';ctx.fillStyle='#f3f8ff';const fs=main.length>28?42:main.length>16?54:main.length>8?68:88;
      ctx.font=`800 ${fs}px system-ui`;ctx.fillText(main,w/2,h*.25);
    }
    if(sub){ctx.textAlign='center';ctx.fillStyle='#93a5b8';ctx.font='500 22px system-ui';ctx.fillText(sub,w/2,h*.34)}
    if(mnemonicLabel){ctx.textAlign='center';ctx.fillStyle='#79e5ff';ctx.font='700 19px system-ui';ctx.fillText(mnemonicLabel.toUpperCase(),w/2,h*.88)}

    const prog=timeline?.duration?clamp(time/timeline.duration,0,1):0;
    ctx.fillStyle='rgba(255,255,255,.055)';ctx.fillRect(w*.08,h-22,w*.84,2);
    ctx.fillStyle='#79e5ff';ctx.fillRect(w*.08,h-22,w*.84*prog,2);
  }
}
