import {MORSE,PROSIGNS,unitSeconds} from './morse-engine.js?v=14';

const TAU=Math.PI*2;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const lerp=(a,b,t)=>a+(b-a)*t;
const ease=t=>t*t*(3-2*t);

function seededNoise(x){
  return Math.sin(x*12.9898+78.233)*43758.5453%1;
}
function roundedRect(ctx,x,y,w,h,r){
  r=Math.min(r,w/2,h/2);ctx.beginPath();ctx.moveTo(x+r,y);ctx.arcTo(x+w,y,x+w,y+h,r);ctx.arcTo(x+w,y+h,x,y+h,r);ctx.arcTo(x,y+h,x,y,r);ctx.arcTo(x,y,x+w,y,r);ctx.closePath();
}
function patternFor(text){
  let out='';
  for(const c of String(text||'').toUpperCase()){
    if(c===' '){out+='   ';continue}
    out+=(PROSIGNS[c]||MORSE[c]||'')+' ';
  }
  return out.trim();
}
function cwSegments(text,wpm,eff){
  const u=unitSeconds(wpm), eu=unitSeconds(eff||wpm), seg=[]; let t=0;
  for(const [ci,c] of [...String(text||'').toUpperCase()].entries()){
    if(c===' '){seg.push({a:t,b:t+7*eu,on:0});t+=7*eu;continue}
    const p=PROSIGNS[c]||MORSE[c]; if(!p)continue;
    [...p].forEach((m,i)=>{
      const d=m==='.'?u:3*u;
      seg.push({a:t,b:t+d,on:1,units:m==='.'?1:3});t+=d;
      if(i<p.length-1){seg.push({a:t,b:t+u,on:0});t+=u}
    });
    if(ci<[...String(text)].length-1){const g=Math.max(3*u,3*eu);seg.push({a:t,b:t+g,on:0});t+=g}
  }
  return {seg,duration:t};
}
function resample(points,n=180){
  if(!points.length)return Array.from({length:n},()=>({x:0,y:0}));
  const d=[0]; let total=0;
  for(let i=1;i<points.length;i++){total+=Math.hypot(points[i].x-points[i-1].x,points[i].y-points[i-1].y);d.push(total)}
  if(total===0)return Array.from({length:n},()=>points[0]);
  const out=[];let j=1;
  for(let i=0;i<n;i++){
    const target=total*i/(n-1);
    while(j<d.length-1&&d[j]<target)j++;
    const p0=points[j-1],p1=points[j],span=Math.max(.0001,d[j]-d[j-1]),q=(target-d[j-1])/span;
    out.push({x:lerp(p0.x,p1.x,q),y:lerp(p0.y,p1.y,q)});
  }
  return out;
}

export class VisualEngine{
  constructor(canvas){
    this.c=canvas;this.x=canvas.getContext('2d');
    this.audioAnalyser=null;this.wave=new Uint8Array(1024);
    this.prevShape=null;this.shapeStart=0;this.shapeName='';
  }
  setAnalyser(a){this.audioAnalyser=a;if(a)this.wave=new Uint8Array(a.fftSize)}
  background(ctx,w,h){
    const g=ctx.createRadialGradient(w*.52,h*.36,10,w*.5,h*.46,w*.72);
    g.addColorStop(0,'#112838');g.addColorStop(.36,'#08121a');g.addColorStop(1,'#020407');
    ctx.fillStyle=g;ctx.fillRect(0,0,w,h);
    const g2=ctx.createLinearGradient(0,0,w,h);g2.addColorStop(0,'rgba(98,217,255,.025)');g2.addColorStop(.5,'rgba(255,255,255,0)');g2.addColorStop(1,'rgba(185,255,222,.025)');
    ctx.fillStyle=g2;ctx.fillRect(0,0,w,h);
  }
  voiceEnergy(){
    if(!this.audioAnalyser)return .05;
    this.audioAnalyser.getByteTimeDomainData(this.wave);
    let sum=0;for(const v of this.wave){const q=(v-128)/128;sum+=q*q}
    return clamp(Math.sqrt(sum/this.wave.length)*5.2,0,1);
  }
  shapeLine(time,w,h){
    const pts=[],N=180,y=h*.69;
    for(let i=0;i<N;i++){
      const u=i/(N-1),x=w*.13+u*w*.74;
      pts.push({x,y:y+Math.sin(u*TAU*2+time*1.4)*1.4});
    }
    return pts;
  }
  shapeMouth(time,w,h){
    const e=this.voiceEnergy(),pts=[],N=220,cx=w/2,cy=h*.67,ww=w*.55;
    // closed perimeter, denser/electric in center, feathered at ends.
    for(let i=0;i<N/2;i++){
      const u=i/(N/2-1),x=cx-ww/2+u*ww;
      const edge=Math.pow(Math.sin(Math.PI*u),.68);
      const core=Math.pow(Math.sin(Math.PI*u),2.2);
      const jitter=(Math.sin(i*.7+time*9)+Math.sin(i*.17-time*13))*(1.2+e*4)*edge;
      const open=(16+e*92)*edge;
      pts.push({x,y:cy-open*.55-jitter-core*e*7});
    }
    for(let i=N/2-1;i>=0;i--){
      const u=i/(N/2-1),x=cx-ww/2+u*ww;
      const edge=Math.pow(Math.sin(Math.PI*u),.68);
      const core=Math.pow(Math.sin(Math.PI*u),2.2);
      const jitter=(Math.sin(i*.7+time*9)+Math.sin(i*.17-time*13))*(1.2+e*4)*edge;
      const open=(16+e*92)*edge;
      pts.push({x,y:cy+open*.55+jitter+core*e*7});
    }
    pts.push(pts[0]);
    return pts;
  }
  shapeClock(time,w,h){
    const pts=[],cx=w/2,cy=h*.67,r=70;
    for(let i=0;i<=120;i++){const a=TAU*i/120;pts.push({x:cx+Math.cos(a)*r,y:cy+Math.sin(a)*r})}
    pts.push({x:cx,y:cy},{x:cx,y:cy-r*.58},{x:cx,y:cy},{x:cx+r*.42,y:cy+r*.14});
    return pts;
  }
  shapeTarget(time,w,h){
    const pts=[],cx=w/2,cy=h*.67;
    for(const r of [76,42,10]){
      for(let i=0;i<=70;i++){const a=TAU*i/70;pts.push({x:cx+Math.cos(a)*r,y:cy+Math.sin(a)*r})}
    }
    return pts;
  }
  shapeQso(time,w,h){
    const pts=[],cx=w/2,cy=h*.67;
    for(const off of [-95,95]){
      for(let i=0;i<=55;i++){const a=TAU*i/55;pts.push({x:cx+off+Math.cos(a)*31,y:cy+Math.sin(a)*31})}
    }
    for(let i=0;i<=70;i++){const u=i/70;pts.push({x:cx-55+u*110,y:cy+Math.sin(u*Math.PI*3)*20*(1-Math.abs(u-.5)*1.3)})}
    return pts;
  }
  shapeWaves(time,w,h){
    const pts=[],cx=w/2,cy=h*.67;
    for(const r of [32,54,78,105]){
      for(let i=0;i<=55;i++){const a=-1.08+2.16*i/55;pts.push({x:cx+Math.cos(a)*r,y:cy+Math.sin(a)*r})}
    }
    return pts;
  }
  shapeMnemonic(char,time,w,h){
    // Abstract mnemonic silhouettes for first-pass visual language.
    // Dedicated ES/EN assets can later replace these paths without changing the renderer.
    const c=String(char||'').toUpperCase(),cx=w/2,cy=h*.67,pts=[];
    const seed=c.charCodeAt(0)||65;
    if('ATMN'.includes(c)){
      // arch / bow-like silhouette
      for(let i=0;i<=100;i++){const u=i/100;pts.push({x:cx-110+u*220,y:cy+60-Math.sin(Math.PI*u)*(80+(seed%4)*8)})}
      pts.push({x:cx-110,y:cy+60},{x:cx+110,y:cy+60});
    }else if('DOGQ'.includes(c)){
      // animal-ish long body
      pts.push({x:cx-115,y:cy+20},{x:cx-70,y:cy-35},{x:cx+45,y:cy-35},{x:cx+92,y:cy-5},{x:cx+110,y:cy+30},{x:cx+45,y:cy+32},{x:cx+20,y:cy+65},{x:cx-12,y:cy+32},{x:cx-78,y:cy+32},{x:cx-115,y:cy+20});
    }else{
      const lobes=3+(seed%5);
      for(let i=0;i<=160;i++){const a=TAU*i/160,r=65+24*Math.sin(lobes*a+time*.4);pts.push({x:cx+Math.cos(a)*r,y:cy+Math.sin(a)*r})}
    }
    return pts;
  }
  shapeCw(event,time,w,h){
    const info=cwSegments(event.data.text,event.data.wpm||15,event.data.eff||event.data.wpm||15);
    const elapsed=clamp(time-event.start,0,event.duration),windowSec=Math.max(3.2,Math.min(8.5,info.duration+1));
    const start=Math.max(0,elapsed-windowSec),end=start+windowSec;
    const left=w*.12,right=w*.88,base=h*.72,high=h*.61,pts=[];
    const map=t=>right-(end-t)/windowSec*(right-left);
    pts.push({x:left,y:base});
    for(const s of info.seg){
      if(s.b<start||s.a>end)continue;
      const a=Math.max(start,s.a),b=Math.min(end,s.b),x1=map(a),x2=map(b);
      if(x2<left||x1>right)continue;
      pts.push({x:clamp(x1,left,right),y:base});
      if(s.on){
        pts.push({x:clamp(x1,left,right),y:high});
        pts.push({x:clamp(x2,left,right),y:high});
        pts.push({x:clamp(x2,left,right),y:base});
      }else pts.push({x:clamp(x2,left,right),y:base});
    }
    pts.push({x:right,y:base});
    return pts;
  }
  shapeFor(name,event,time,w,h){
    if(name==='mouth')return this.shapeMouth(time,w,h);
    if(name==='cw')return this.shapeCw(event,time,w,h);
    if(name==='clock')return this.shapeClock(time,w,h);
    if(name==='recognition'||name==='focus')return this.shapeTarget(time,w,h);
    if(name==='qso'||name==='headcopy')return this.shapeQso(time,w,h);
    if(name==='voice'||name==='course'||name==='lesson')return this.shapeWaves(time,w,h);
    if(name==='mnemonic')return this.shapeMnemonic(event?.data?.text||event?.data?.char,time,w,h);
    return this.shapeLine(time,w,h);
  }
  drawLivingLine(points,time){
    const ctx=this.x;
    const p=resample(points,190);
    // halo
    ctx.save();
    ctx.lineCap='round';ctx.lineJoin='round';
    for(const [lw,alpha,blur] of [[10,.045,28],[5,.10,18],[2.1,.82,9]]){
      ctx.beginPath();
      p.forEach((pt,i)=>i?ctx.lineTo(pt.x,pt.y):ctx.moveTo(pt.x,pt.y));
      ctx.strokeStyle=`rgba(126,232,255,${alpha})`;ctx.lineWidth=lw;ctx.shadowBlur=blur;ctx.shadowColor='#6fe5ff';ctx.stroke();
    }
    // electric sparks concentrated near center
    ctx.shadowBlur=0;ctx.lineWidth=.8;
    for(let i=4;i<p.length-4;i+=7){
      const u=i/(p.length-1),center=1-Math.abs(u-.5)*2;
      const a=.08+.24*Math.max(0,center);
      const pt=p[i],nx=p[i+1].y-p[i-1].y,ny=-(p[i+1].x-p[i-1].x),len=Math.max(1,Math.hypot(nx,ny));
      const j=(Math.sin(i*9.3+time*17)*.5+.5)*(3+9*center);
      ctx.beginPath();ctx.moveTo(pt.x,pt.y);ctx.lineTo(pt.x+nx/len*j,pt.y+ny/len*j);
      ctx.strokeStyle=`rgba(185,255,222,${a})`;ctx.stroke();
    }
    ctx.restore();
  }
  draw(time,timeline){
    const ctx=this.x,w=this.c.width,h=this.c.height;this.background(ctx,w,h);
    const ev=timeline?.at(time)||[];
    let main='',sub='',mode='',shape='line',shapeEvent=null;
    for(const e of ev){
      if(e.type==='title'){main=e.data.title||'';sub=e.data.subtitle||'';mode='';shape='clock';shapeEvent=e}
      if(e.type==='outro'){main=e.data.title||'';sub=e.data.subtitle||'';shape='target';shapeEvent=e}
      if(e.type==='voice'){main=e.data.visual?.title||'';sub=e.data.visual?.subtitle||'';mode='';shape=e.data.visual?.graphic==='clock'?'clock':e.data.visual?.graphic==='qso'?'qso':'mouth';shapeEvent=e}
      if(e.type==='charVoice'){main=e.data.char||'';sub='';shape='mouth';shapeEvent=e}
      if(e.type==='cw'){main=e.data.mode==='headcopy'?'HEAD COPY':'';sub='';shape='cw';shapeEvent=e}
      if(e.type==='reveal'){main=e.data.text||'';sub='';shape=e.data.mnemonic?'mnemonic':'recognition';shapeEvent=e}
      if(e.type==='check'){main='✓';sub='';shape='target';shapeEvent=e}
    }
    const points=this.shapeFor(shape,shapeEvent,time,w,h);
    this.drawLivingLine(points,time);

    if(mode){ctx.textAlign='center';ctx.fillStyle='#75e6ff';ctx.font='800 14px system-ui';ctx.fillText(mode,w/2,74)}
    if(main){
      ctx.textAlign='center';ctx.fillStyle='#f3f8ff';
      const fs=main.length>28?42:main.length>16?54:main.length>8?68:88;
      ctx.font=`800 ${fs}px system-ui`;ctx.fillText(main,w/2,h*.29);
    }
    if(sub){
      ctx.textAlign='center';ctx.fillStyle='#93a5b8';ctx.font='500 22px system-ui';ctx.fillText(sub,w/2,h*.38);
    }
    const prog=timeline?.duration?clamp(time/timeline.duration,0,1):0;
    ctx.fillStyle='rgba(255,255,255,.06)';ctx.fillRect(w*.08,h-30,w*.84,2);
    ctx.fillStyle='#79e5ff';ctx.fillRect(w*.08,h-30,w*.84*prog,2);
  }
}
