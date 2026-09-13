import {MORSE,PROSIGNS} from './morse-engine.js?v=34';
import {mnemonicFor,mnemonicEntries} from './mnemonics.js?v=34';

const TAU=Math.PI*2;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const lerp=(a,b,t)=>a+(b-a)*t;
const ease=t=>t*t*(3-2*t);

function resample(points,n=240){
  if(!points?.length)return [];
  const d=[0];let total=0;
  for(let i=1;i<points.length;i++){
    total+=Math.hypot(points[i].x-points[i-1].x,points[i].y-points[i-1].y);
    d.push(total);
  }
  if(total===0)return Array.from({length:n},()=>({...points[0]}));
  const out=[];let j=1;
  for(let i=0;i<n;i++){
    const target=total*i/(n-1);
    while(j<d.length-1&&d[j]<target)j++;
    const a=points[j-1],b=points[j];
    const span=Math.max(.0001,d[j]-d[j-1]);
    const q=(target-d[j-1])/span;
    out.push({x:lerp(a.x,b.x,q),y:lerp(a.y,b.y,q)});
  }
  return out;
}

function circle(cx,cy,r,n=96,a0=0,a1=TAU){
  const p=[];
  for(let i=0;i<=n;i++){
    const a=a0+(a1-a0)*i/n;
    p.push({x:cx+Math.cos(a)*r,y:cy+Math.sin(a)*r});
  }
  return p;
}
function poly(cx,cy,s,arr){return arr.map(([x,y])=>({x:cx+x*s,y:cy+y*s}))}
function concat(...parts){return parts.flat()}

export class VisualEngine{
  constructor(canvas){
    this.c=canvas;
    this.x=canvas.getContext('2d');
    this.audioAnalyser=null;
    this.wave=new Uint8Array(1024);
    this.energy=.03;
    this.language='es';
    this.shapeName='idle';
    this.shapeStart=0;
    this.prevShape=null;
    this.lastRendered=null;
    this.lastSize='';
    this.offlineAudio=null;
    this.mnemonicImages=new Map();
    this.mnemonicPromises=new Map();
    this.mnemonicFailures=new Set();
  }

  setLanguage(l){this.language=l||'es'}
  setOfflineAudio(buffer){this.offlineAudio=buffer||null}

  mnemonicKey(char,lang=this.language){
    return `${lang}|${String(char||'').toUpperCase()}`;
  }

  restyleNotoSvg(svgText){
    // Preserve Noto's professional geometry/details but remap its palette into
    // the CW Studio cyan/ice/dark visual language.
    const mapHex=(hex)=>{
      let h=hex.slice(1);
      if(h.length===3)h=h.split('').map(c=>c+c).join('');
      if(h.length!==6)return hex;
      const r=parseInt(h.slice(0,2),16),g=parseInt(h.slice(2,4),16),b=parseInt(h.slice(4,6),16);
      if([r,g,b].some(Number.isNaN))return hex;
      const lum=(.2126*r+.7152*g+.0722*b)/255;
      if(lum<.17)return '#07151f';
      if(lum<.36)return '#1a6072';
      if(lum<.57)return '#42b8cf';
      if(lum<.78)return '#79e5ff';
      return '#d9fbff';
    };
    let out=String(svgText||'');
    out=out.replace(/#[0-9a-fA-F]{6}\b/g,m=>mapHex(m));
    out=out.replace(/#[0-9a-fA-F]{3}\b/g,m=>mapHex(m));
    return out;
  }

  async loadMnemonic(char,lang=this.language){
    const key=this.mnemonicKey(char,lang);
    if(this.mnemonicImages.has(key))return this.mnemonicImages.get(key);
    if(this.mnemonicFailures.has(key))return null;
    if(this.mnemonicPromises.has(key))return this.mnemonicPromises.get(key);

    const rec=mnemonicFor(char,lang);
    if(!rec?.asset)return null;

    const promise=(async()=>{
      try{
        const r=await fetch(rec.asset,{cache:'force-cache'});
        if(!r.ok)throw new Error(`${rec.asset} → HTTP ${r.status}`);
        const styled=this.restyleNotoSvg(await r.text());
        const blob=new Blob([styled],{type:'image/svg+xml'});
        const url=URL.createObjectURL(blob);
        const img=new Image();
        await new Promise((resolve,reject)=>{
          img.onload=resolve;
          img.onerror=()=>reject(new Error(`Could not decode ${rec.asset}`));
          img.src=url;
        });
        URL.revokeObjectURL(url);
        this.mnemonicImages.set(key,img);
        return img;
      }catch(err){
        console.warn('[CW Studio] mnemonic asset fallback:',key,err);
        this.mnemonicFailures.add(key);
        return null;
      }finally{
        this.mnemonicPromises.delete(key);
      }
    })();

    this.mnemonicPromises.set(key,promise);
    return promise;
  }

  async preloadMnemonics(lang=this.language,onStatus=()=>{}){
    const entries=mnemonicEntries(lang);
    let done=0,cursor=0;
    const workers=Math.min(8,Math.max(1,entries.length));
    const worker=async()=>{
      while(cursor<entries.length){
        const i=cursor++;
        const rec=entries[i];
        await this.loadMnemonic(rec.char,lang);
        done++;
        onStatus(`mnemonics ${done}/${entries.length}`);
      }
    };
    await Promise.all(Array.from({length:workers},()=>worker()));
    const failed=entries.filter(rec=>this.mnemonicFailures.has(this.mnemonicKey(rec.char,lang))).length;
    return {loaded:entries.length-failed,total:entries.length,failed};
  }

  mnemonicImage(char,lang=this.language){
    const key=this.mnemonicKey(char,lang);
    const img=this.mnemonicImages.get(key)||null;
    if(!img&&!this.mnemonicFailures.has(key)&&!this.mnemonicPromises.has(key)){
      // Lazy safety net; normal lesson/custom loading preloads the pack.
      this.loadMnemonic(char,lang);
    }
    return img;
  }

  drawMnemonicAsset(char,lang,w,h,time,event){
    const img=this.mnemonicImage(char,lang);
    if(!img)return false;

    const local=event?.duration?clamp((time-event.start)/event.duration,0,1):1;
    const enter=ease(clamp(local/.18,0,1));
    const leave=ease(clamp((1-local)/.14,0,1));
    const alpha=Math.min(enter,leave);
    const scale=.90+.10*enter;

    const maxW=w*.30,maxH=h*.39;
    const ratio=(img.naturalWidth||1)/(img.naturalHeight||1);
    let dw=maxW,dh=dw/ratio;
    if(dh>maxH){dh=maxH;dw=dh*ratio}
    dw*=scale;dh*=scale;

    const cx=w/2,cy=h*.61;
    const x=cx-dw/2,y=cy-dh/2;

    const ctx=this.x;
    ctx.save();

    // Mask the baseline behind the icon so it reads as one line arriving at,
    // becoming, and leaving the mnemonic rather than a pasted sticker.
    const halo=ctx.createRadialGradient(cx,cy,0,cx,cy,Math.max(dw,dh)*.72);
    halo.addColorStop(0,'rgba(3,8,12,.96)');
    halo.addColorStop(.66,'rgba(3,8,12,.80)');
    halo.addColorStop(1,'rgba(3,8,12,0)');
    ctx.fillStyle=halo;
    ctx.fillRect(cx-dw*.82,cy-dh*.82,dw*1.64,dh*1.64);

    ctx.globalAlpha=.22*alpha;
    ctx.shadowBlur=36;
    ctx.shadowColor='#79e5ff';
    ctx.drawImage(img,x,y,dw,dh);

    ctx.globalAlpha=.96*alpha;
    ctx.shadowBlur=15;
    ctx.shadowColor='rgba(121,229,255,.75)';
    ctx.drawImage(img,x,y,dw,dh);

    // Small luminous anchor where the Living Line meets the visual.
    ctx.globalAlpha=.40*alpha;
    ctx.beginPath();
    ctx.arc(cx,cy+dh*.50,3.6,0,TAU);
    ctx.fillStyle='#b9ffde';
    ctx.shadowBlur=12;
    ctx.shadowColor='#79e5ff';
    ctx.fill();

    ctx.restore();
    return true;
  }
  setAnalyser(a){
    this.audioAnalyser=a;
    if(a)this.wave=new Uint8Array(a.fftSize);
  }

  syncCanvas(){
    const rect=this.c.getBoundingClientRect();
    if(!rect.width||!rect.height)return;
    const dpr=Math.min(window.devicePixelRatio||1,1.5);
    const w=Math.max(640,Math.round(rect.width*dpr));
    const h=Math.max(360,Math.round(rect.height*dpr));
    const key=`${w}x${h}`;
    if(key!==this.lastSize){
      this.c.width=w;
      this.c.height=h;
      this.lastSize=key;
      this.lastRendered=null;
      this.prevShape=null;
    }
  }

  background(ctx,w,h){
    const g=ctx.createRadialGradient(w*.5,h*.42,0,w*.5,h*.42,w*.78);
    g.addColorStop(0,'#102838');
    g.addColorStop(.38,'#071119');
    g.addColorStop(1,'#020406');
    ctx.fillStyle=g;
    ctx.fillRect(0,0,w,h);

    const sheen=ctx.createLinearGradient(0,0,w,h);
    sheen.addColorStop(0,'rgba(121,229,255,.025)');
    sheen.addColorStop(.5,'rgba(255,255,255,0)');
    sheen.addColorStop(1,'rgba(185,255,222,.018)');
    ctx.fillStyle=sheen;
    ctx.fillRect(0,0,w,h);
  }

  baseline(w,h){
    return [{x:w*.035,y:h*.67},{x:w*.965,y:h*.67}];
  }

  voiceEnergy(){
    let target=.02;
    if(this.audioAnalyser){
      this.audioAnalyser.getByteTimeDomainData(this.wave);
      let sum=0;
      for(const v of this.wave){
        const q=(v-128)/128;
        sum+=q*q;
      }
      target=clamp(Math.sqrt(sum/this.wave.length)*5.6,0,1);
    }
    const speed=target>this.energy?.18:.08;
    this.energy=lerp(this.energy,target,speed);
    return this.energy;
  }

  voiceLine(time,w,h){
    const left=w*.035,right=w*.965,cy=h*.67,N=220;
    let e=this.voiceEnergy();
    const out=[];
    let offline=null,rate=0,start=0,windowSize=0;

    if(this.offlineAudio){
      offline=this.offlineAudio.getChannelData(0);
      rate=this.offlineAudio.sampleRate;
      const centerSample=Math.floor(Math.max(0,time)*rate);
      windowSize=Math.min(4096,Math.max(512,Math.floor(rate*.035)));
      start=Math.max(0,Math.min(offline.length-windowSize,centerSample-Math.floor(windowSize/2)));
      let sum=0;
      for(let i=0;i<windowSize;i+=8){const q=offline[start+i]||0;sum+=q*q}
      e=clamp(Math.sqrt(sum/Math.max(1,windowSize/8))*5.0,0,1);
    }

    for(let i=0;i<N;i++){
      const u=i/(N-1);
      const x=left+u*(right-left);
      const center=Math.pow(Math.sin(Math.PI*u),.82);
      let raw;
      if(offline){
        raw=offline[start+Math.min(windowSize-1,Math.floor(u*(windowSize-1)))]||0;
      }else{
        const wi=Math.floor(u*(this.wave.length-1));
        raw=this.audioAnalyser?((this.wave[wi]-128)/128):Math.sin(u*TAU*2+time*3)*.04;
      }
      const harmonics=Math.sin(u*TAU*6-time*8)*.12+Math.sin(u*TAU*11+time*5)*.06;
      const amp=(34+158*e)*center;
      const y=cy+(raw*.86+harmonics*e*.34)*amp;
      out.push({x,y});
    }
    return out;
  }

  flowLine(time,w,h,complexity=1){
    const left=w*.035,right=w*.965,cy=h*.67,N=220,pts=[];
    for(let i=0;i<N;i++){
      const u=i/(N-1);
      const env=Math.pow(Math.sin(Math.PI*u),.78);
      const y=cy
        +Math.sin(u*TAU*(1.15+.06*complexity)-time*2.6)*16*env
        +Math.sin(u*TAU*(3.8+.04*complexity)+time*1.8)*5*env;
      pts.push({x:left+u*(right-left),y});
    }
    return pts;
  }

  cwLine(event,w,h){
    const text=String(event?.data?.text||'').toUpperCase();
    const seq=[];

    // Morse timing represented literally:
    // dit = 1 unit high
    // dah = 3 units high
    // gap between elements of the SAME character = 1 unit low
    // gap between characters = 3 units low
    // gap between words = 7 units low
    const chars=[...text];

    for(let ci=0;ci<chars.length;ci++){
      const c=chars[ci];

      if(c===' '){
        // Replace a preceding character gap with a word gap.
        if(seq.at(-1)==='charGap')seq.pop();
        if(seq.at(-1)!=='wordGap')seq.push('wordGap');
        continue;
      }

      const pat=PROSIGNS[c]||MORSE[c];
      if(!pat)continue;

      const marks=[...pat];
      for(let mi=0;mi<marks.length;mi++){
        seq.push(marks[mi]);
        if(mi<marks.length-1)seq.push('elementGap');
      }

      // Character spacing is added only when another Morse character follows.
      const next=chars.slice(ci+1).find(x=>x===' ' || PROSIGNS[x] || MORSE[x]);
      if(next && next!==' ')seq.push('charGap');
    }

    while(['elementGap','charGap','wordGap'].includes(seq.at(-1)))seq.pop();

    let units=0;
    for(const s of seq){
      units+=s==='.'?1
        :s==='-'?3
        :s==='elementGap'?1
        :s==='charGap'?3
        :s==='wordGap'?7
        :0;
    }
    units=Math.max(units,1);

    const left=w*.035,right=w*.965,cy=h*.67,high=h*.565;
    const available=right-left;
    const unit=Math.min(42,available*.52/units);
    const signalWidth=units*unit;
    let x=(w-signalWidth)/2;

    // One uninterrupted baseline from edge to edge.
    const pts=[{x:left,y:cy},{x,y:cy}];

    for(const s of seq){
      if(s==='.'||s==='-'){
        const ww=(s==='.'?1:3)*unit;
        pts.push(
          {x,y:cy},
          {x,y:high},
          {x:x+ww,y:high},
          {x:x+ww,y:cy}
        );
        x+=ww;
      }else{
        const gapUnits=s==='elementGap'?1:s==='charGap'?3:7;
        x+=gapUnits*unit;
        pts.push({x,y:cy});
      }
    }

    pts.push({x:right,y:cy});
    return pts;
  }

  mnemonicShape(char,lang,w,h){
    const m=mnemonicFor(char,lang||this.language);
    if(!m)return this.baseline(w,h);

    const cx=w/2,cy=h*.66,s=Math.min(w,h)/4.65;
    const P=a=>poly(cx,cy,s,a);
    const shape=m.shape;

    switch(shape){
      case 'bow':
        return concat(
          P([[-.95,.55],[-.72,.05],[-.42,-.42],[0,-.72],[.42,-.42],[.72,.05],[.95,.55]]),
          P([[-.95,.55],[.95,.55]]),
          P([[.05,.48],[.82,-.02],[.52,-.02],[.82,-.02],[.68,.24]])
        );
      case 'arrow':
        return P([[-.95,.08],[.5,.08],[.2,-.22],[.5,.08],[.2,.38]]);
      case 'boat': case 'yacht':
        return concat(P([[-.9,.32],[-.62,.65],[.6,.65],[.9,.32],[-.9,.32]]),P([[0,.3],[0,-.78],[.62,.14],[0,.14]]));
      case 'bridge':
        return concat(P([[-.95,.58],[-.62,.08],[-.3,-.24],[0,-.38],[.3,-.24],[.62,.08],[.95,.58]]),P([[-.95,.58],[.95,.58]]));
      case 'bell':
        return concat(P([[-.62,.45],[-.48,-.18],[-.26,-.58],[.26,-.58],[.48,-.18],[.62,.45],[-.62,.45]]),circle(cx,cy+s*.58,s*.10,28));
      case 'crown':
        return P([[-.85,.46],[-.68,-.42],[-.28,.05],[0,-.64],[.28,.05],[.68,-.42],[.85,.46],[-.85,.46]]);
      case 'cube':
        return concat(P([[-.56,-.26],[0,-.58],[.56,-.26],[0,.05],[-.56,-.26],[-.56,.42],[0,.74],[.56,.42],[.56,-.26]]),P([[0,.05],[0,.74]]));
      case 'drum':
        return concat(P([[-.62,-.45],[.62,-.45],[.62,.45],[-.62,.45],[-.62,-.45]]),P([[-.82,-.72],[.76,.72],[.72,-.72],[-.76,.72]]));
      case 'star':
        return P([[0,-.82],[.19,-.25],[.78,-.25],[.3,.11],[.48,.7],[0,.35],[-.48,.7],[-.3,.11],[-.78,-.25],[-.19,-.25],[0,-.82]]);
      case 'eye':
        return concat(P([[-.92,0],[-.5,-.4],[0,-.52],[.5,-.4],[.92,0],[.5,.4],[0,.52],[-.5,.4],[-.92,0]]),circle(cx,cy,s*.2,32));
      case 'lighthouse':
        return concat(P([[-.34,.72],[-.2,-.54],[.2,-.54],[.34,.72],[-.34,.72]]),P([[-.38,-.56],[.38,-.56],[.2,-.8],[-.2,-.8],[-.38,-.56]]),P([[.28,-.64],[.98,-.84],[.28,-.47]]));
      case 'flag':
        return concat(P([[-.58,.72],[-.58,-.78]]),P([[-.58,-.72],[.58,-.58],[.18,-.15],[-.58,-.3]]));
      case 'cat':
        return P([[-.9,.45],[-.62,.34],[-.5,-.14],[-.62,-.55],[-.28,-.36],[0,-.58],[.28,-.36],[.62,-.55],[.5,-.14],[.62,.32],[.25,.52],[-.28,.52],[-.62,.34],[-.34,.68],[.12,.72],[.52,.58],[.76,.38],[.9,.08],[.82,-.18]]);
      case 'guitar':
        return P([[-.72,.36],[-.55,.02],[-.68,-.26],[-.42,-.48],[-.08,-.38],[.14,-.18],[.34,-.34],[.78,-.78],[.9,-.68],[.46,-.22],[.3,.08],[.18,.42],[-.08,.62],[-.42,.58],[-.72,.36]]);
      case 'axe':
        return concat(P([[-.56,.72],[.56,-.72]]),P([[.3,-.65],[.78,-.54],[.56,-.05],[.16,-.28],[.3,-.65]]));
      case 'hammer':
        return concat(P([[-.2,.74],[.18,-.18]]),P([[-.38,-.64],[.58,-.64],[.58,-.28],[-.38,-.28],[-.38,-.64]]));
      case 'magnet':
        return P([[-.68,-.56],[-.68,.16],[-.46,.56],[-.15,.72],[.15,.72],[.46,.56],[.68,.16],[.68,-.56],[.26,-.56],[.26,.04],[.12,.26],[-.12,.26],[-.26,.04],[-.26,-.56],[-.68,-.56]]);
      case 'ice':
        return P([[0,-.82],[.58,-.26],[.4,.56],[-.26,.78],[-.68,.16],[0,-.82]]);
      case 'giraffe':
        return P([[-.72,.7],[-.68,.14],[-.5,-.02],[-.32,.04],[-.18,-.6],[-.26,-.82],[-.02,-.7],[.18,-.78],[.36,-.62],[.18,-.52],[.16,.08],[.56,.1],[.72,.3],[.62,.52],[.2,.5],[.18,.72],[-.02,.72],[-.06,.34],[-.46,.34],[-.5,.72],[-.72,.7]]);
      case 'jet':
        return P([[-.94,.1],[-.22,-.1],[.1,-.68],[.32,-.68],[.18,-.05],[.92,.08],[.18,.22],[.3,.74],[.08,.74],[-.23,.23],[-.94,.1]]);
      case 'kayak':
        return concat(P([[-.92,0],[-.46,-.22],[.46,-.22],[.92,0],[.46,.22],[-.46,.22],[-.92,0]]),P([[-.58,-.62],[.58,.62]]));
      case 'kite':
        return concat(P([[0,-.82],[.58,0],[0,.6],[-.58,0],[0,-.82]]),P([[0,.6],[.18,.82],[.05,.94],[.3,1.06]]));
      case 'moon':
        return concat(circle(cx,cy,s*.66,68,-1.15,1.15),circle(cx+s*.24,cy,s*.48,60,1.12,-1.12));
      case 'mountain':
        return P([[-.94,.68],[-.36,-.52],[-.08,-.14],[.26,-.78],[.94,.68],[-.94,.68]]);
      case 'cloud':
        return P([[-.86,.34],[-.78,.02],[-.58,-.2],[-.3,-.22],[-.18,-.5],[.12,-.66],[.4,-.52],[.5,-.28],[.74,-.22],[.9,.02],[.82,.34],[.56,.5],[-.62,.5],[-.86,.34]]);
      case 'needle':
        return concat(P([[-.82,.68],[.68,-.68]]),circle(cx+s*.58,cy-s*.58,s*.1,24));
      case 'orbit':
        return concat(circle(cx,cy,s*.5,48),circle(cx,cy,s*.8,68,-.35,3.65),circle(cx+s*.7,cy-s*.18,s*.08,20));
      case 'piano': {
        const p=P([[-.88,-.44],[.88,-.44],[.88,.44],[-.88,.44],[-.88,-.44]]);
        for(let i=-3;i<=3;i++)p.push(...P([[i*.2,-.44],[i*.2,.44]]));
        return p;
      }
      case 'cheese':
        return P([[-.8,.55],[-.58,-.26],[.2,-.64],[.78,-.06],[.62,.58],[-.8,.55],[-.52,.2],[-.28,.28],[-.18,.08],[.08,.18],[.28,.4],[.48,.24],[.62,.58]]);
      case 'quill':
        return concat(P([[-.68,.72],[.58,-.74],[.36,-.26],[-.1,.15],[.58,-.74],[-.42,-.08],[-.68,.72]]),P([[-.68,.72],[.78,.8]]));
      case 'clock':
        return concat(circle(cx,cy,s*.62,80),P([[0,0],[0,-.38],[0,0],[.35,.12]]));
      case 'rocket':
        return concat(P([[0,-.88],[.38,-.3],[.26,.36],[0,.64],[-.26,.36],[-.38,-.3],[0,-.88]]),P([[-.26,.3],[-.6,.58],[-.22,.54],[0,.64],[.22,.54],[.6,.58],[.26,.3]]));
      case 'snake': {
        const p=[];for(let i=0;i<=110;i++){const u=i/110;p.push({x:cx-s*.86+u*s*1.72,y:cy+Math.sin(u*Math.PI*3)*s*.35})}
        return p;
      }
      case 'tower':
        return concat(P([[-.36,.74],[-.2,-.72],[.2,-.72],[.36,.74],[-.36,.74]]),P([[-.52,.2],[.52,.2],[-.44,-.16],[.44,-.16]]));
      case 'grapes':
        return concat(...[[-.3,-.4],[0,-.5],[.3,-.35],[-.15,-.08],[.18,-.02],[0,.28]].map(([x,y])=>circle(cx+x*s,cy+y*s,s*.18,24)),P([[0,-.66],[.28,-.92]]));
      case 'umbrella':
        return concat(P([[-.84,0],[-.56,-.36],[-.2,-.58],[.2,-.58],[.56,-.36],[.84,0],[-.84,0]]),P([[0,-.58],[0,.62],[.18,.8],[.38,.64]]));
      case 'sailboat':
        return concat(P([[-.84,.42],[.76,.42],[.5,.72],[-.58,.72],[-.84,.42]]),P([[0,.4],[0,-.78],[.58,.2],[0,.2],[-.44,.05],[0,-.68]]));
      case 'violin':
        return P([[-.38,.68],[-.55,.42],[-.38,.14],[-.52,-.08],[-.28,-.38],[0,-.26],[.22,-.5],[.66,-.9],[.78,-.78],[.38,-.34],[.26,-.02],[.42,.22],[.24,.5],[-.04,.42],[-.18,.7],[-.38,.68]]);
      case 'wok':
        return concat(P([[-.82,-.1],[-.56,.52],[0,.7],[.56,.52],[.82,-.1]]),P([[.74,-.08],[1.08,-.28]]));
      case 'wave': {
        const p=[];for(let i=0;i<=110;i++){const u=i/110;p.push({x:cx-s*.94+u*s*1.88,y:cy+Math.sin(u*Math.PI*2)*s*.36})}
        return p;
      }
      case 'xylophone':
        return P([[-.86,-.5],[-.66,.5],[-.5,-.46],[-.3,.48],[-.12,-.4],[.08,.42],[.24,-.34],[.44,.36],[.56,-.28],[.76,.3],[.86,-.22],[.7,.58],[-.84,.64],[-.86,-.5]]);
      case 'shoe':
        return P([[-.78,-.26],[-.36,-.26],[-.12,.18],[.68,.3],[.88,.58],[.62,.7],[-.72,.64],[-.78,-.26]]);
      case 'zipper': {
        let p=P([[-.68,-.72],[.68,.72]]);
        for(let i=0;i<8;i++){const u=i/7,x=-.54+u*1.08,y=-.6+u*1.2;p.push(...P([[x-.12,y],[x+.12,y]]))}
        return p;
      }
      case 'ring':
        return circle(cx,cy,s*.64,96);
      case 'candle':
        return concat(P([[-.18,.72],[-.18,-.26],[.18,-.26],[.18,.72],[-.18,.72]]),P([[0,-.26],[-.16,-.58],[0,-.84],[.16,-.58],[0,-.26]]));
      case 'swan':
        return P([[-.78,.38],[-.54,.58],[-.18,.62],[.18,.5],[.38,.28],[.28,.04],[.18,-.16],[.28,-.48],[.5,-.72],[.72,-.66],[.52,-.5],[.34,-.28],[.22,.04],[.44,.14],[.72,.18],[.9,.06],[.72,.18],[.42,.34],[.1,.52],[-.36,.58],[-.78,.38]]);
      case 'clover':
        return concat(circle(cx-s*.2,cy-s*.2,s*.25,30),circle(cx+s*.2,cy-s*.2,s*.25,30),circle(cx-s*.2,cy+s*.18,s*.25,30),circle(cx+s*.2,cy+s*.18,s*.25,30),P([[0,.35],[0,.88]]));
      case 'chair':
        return concat(P([[-.58,-.68],[-.58,.26],[.52,.26],[.52,.52],[-.58,.52]]),P([[-.48,.52],[-.58,.88],[.42,.52],[.52,.88]]));
      case 'hand':
        return P([[-.62,.7],[-.66,.05],[-.58,-.44],[-.4,-.5],[-.34,-.08],[-.28,-.72],[-.08,-.76],[-.06,-.06],[.02,-.84],[.22,-.84],[.2,-.04],[.3,-.68],[.48,-.62],[.42,.06],[.52,-.42],[.68,-.32],[.6,.3],[.34,.68],[-.06,.78],[-.62,.7]]);
      case 'snail':
        return P([[-.82,.42],[-.62,.18],[-.46,-.18],[-.18,-.42],[.18,-.38],[.38,-.12],[.36,.18],[.14,.34],[-.1,.28],[-.2,.06],[-.08,-.1],[.12,-.08],[.22,.08],[.16,.24],[-.18,.44],[.52,.44],[.72,.28],[.82,.02],[.9,-.18],[.82,.02],[.68,-.22]]);
      case 'scythe':
        return concat(P([[-.58,.8],[.14,-.68]]),P([[.05,-.58],[.36,-.78],[.78,-.68],[.94,-.42]]));
      case 'hourglass':
        return P([[-.58,-.74],[.58,-.74],[.2,-.1],[.58,.74],[-.58,.74],[-.2,-.1],[-.58,-.74]]);
      case 'balloon':
        return concat(circle(cx,cy-s*.12,s*.5,68),P([[0,.4],[.08,.58],[-.05,.74],[.12,.92]]));
      default:
        return this.baseline(w,h);
    }
  }

  drawLine(points,time,emphasis=1){
    if(!points?.length)return;
    const ctx=this.x;
    const p=resample(points,240);
    ctx.save();
    ctx.lineCap='round';
    ctx.lineJoin='round';

    for(const [lw,alpha,blur] of [[12,.035,32],[5,.10,18],[2.1,.86,9]]){
      ctx.beginPath();
      p.forEach((pt,i)=>i?ctx.lineTo(pt.x,pt.y):ctx.moveTo(pt.x,pt.y));
      ctx.strokeStyle=`rgba(126,232,255,${alpha*emphasis})`;
      ctx.lineWidth=lw;
      ctx.shadowBlur=blur;
      ctx.shadowColor='#6fe5ff';
      ctx.stroke();
    }

    ctx.shadowBlur=0;
    ctx.lineWidth=.75;
    for(let i=5;i<p.length-5;i+=8){
      const u=i/(p.length-1);
      const center=1-Math.abs(u-.5)*2;
      const pt=p[i];
      const nx=p[i+1].y-p[i-1].y;
      const ny=-(p[i+1].x-p[i-1].x);
      const len=Math.max(1,Math.hypot(nx,ny));
      const j=(Math.sin(i*8.7+time*18)*.5+.5)*(1.5+6*Math.max(0,center));
      ctx.beginPath();
      ctx.moveTo(pt.x,pt.y);
      ctx.lineTo(pt.x+nx/len*j,pt.y+ny/len*j);
      ctx.strokeStyle=`rgba(185,255,222,${.05+.16*Math.max(0,center)})`;
      ctx.stroke();
    }
    ctx.restore();
  }

  drawMnemonicText(char,lang,w,h){
    const m=mnemonicFor(char,lang||this.language);
    if(!m)return;
    const ctx=this.x;
    const word=String(m.word||'');
    const target=String(char||'').toUpperCase();

    ctx.save();
    ctx.textAlign='center';
    ctx.font='800 52px system-ui';
    const upper=word.toUpperCase();
    const idx=upper.indexOf(target);

    if(idx>=0&&/^[A-Z]$/.test(target)){
      const before=word.slice(0,idx),hit=word.slice(idx,idx+1),after=word.slice(idx+1);
      const total=ctx.measureText(before+hit+after).width;
      let x=w/2-total/2;
      ctx.textAlign='left';
      ctx.fillStyle='#f3f8ff';
      ctx.fillText(before,x,h*.27);
      x+=ctx.measureText(before).width;
      ctx.fillStyle='#79e5ff';
      ctx.shadowBlur=16;
      ctx.shadowColor='#79e5ff';
      ctx.fillText(hit,x,h*.27);
      x+=ctx.measureText(hit).width;
      ctx.shadowBlur=0;
      ctx.fillStyle='#f3f8ff';
      ctx.fillText(after,x,h*.27);
    }else{
      ctx.fillStyle='#f3f8ff';
      ctx.fillText(word,w/2,h*.27);
    }
    ctx.restore();
  }

  drawProgress(time,timeline,w,h){
    const prog=timeline?.duration?clamp(time/timeline.duration,0,1):0;
    const x=w*.035,y=h-18,width=w*.93;

    this.x.fillStyle='rgba(255,255,255,.055)';
    this.x.fillRect(x,y,width,2);

    this.x.fillStyle='#79e5ff';
    this.x.fillRect(x,y,width*prog,2);

    const knobX=x+width*prog;
    this.x.beginPath();
    this.x.arc(knobX,y+1,4.5,0,TAU);
    this.x.fillStyle='#b9ffde';
    this.x.shadowBlur=12;
    this.x.shadowColor='#79e5ff';
    this.x.fill();
    this.x.shadowBlur=0;
  }

  draw(time,timeline){
    this.syncCanvas();
    const ctx=this.x,w=this.c.width,h=this.c.height;
    this.background(ctx,w,h);

    const ev=timeline?.at(time)||[];
    const active=type=>ev.find(e=>e.type===type);

    const mnemonicEv=active('mnemonic');
    const titleEv=active('title');
    const voiceEv=active('voice');
    const charVoiceEv=active('charVoice');
    const cwEv=active('cw');
    const revealEv=active('reveal');
    const checkEv=active('check');
    const outroEv=active('outro');

    let shapeName='idle';
    let target=this.baseline(w,h);
    let main='',sub='';

    let mnemonicAsset=null;
    if(mnemonicEv){
      shapeName='mnemonic';
      const mLang=mnemonicEv.data.lang||this.language;
      // Noto asset is now the visual mnemonic. The Living Line itself stays
      // continuous underneath and visually feeds into the icon.
      target=this.baseline(w,h);
      mnemonicAsset={char:mnemonicEv.data.text,lang:mLang,event:mnemonicEv};
      this.drawMnemonicText(mnemonicEv.data.text,mLang,w,h);
    }else if(voiceEv||charVoiceEv){
      shapeName='voice';
      target=this.voiceLine(time,w,h);
      if(voiceEv){
        main=voiceEv.data.visual?.title||'';
        sub=voiceEv.data.visual?.subtitle||'';
      }else{
        main=charVoiceEv.data.char||'';
      }
    }else if(cwEv){
      if(cwEv.data.mode==='familiarization'||cwEv.data.mode==='familiarization-confirmation'){
        shapeName='cw';
        target=this.cwLine(cwEv,w,h);
      }else{
        shapeName='flow';
        target=this.flowLine(time,w,h,String(cwEv.data.text||'').length);
      }
    }else if(titleEv){
      shapeName='idle';
      target=this.baseline(w,h);
      main=titleEv.data.title||'';
      sub=titleEv.data.subtitle||'';
    }else if(revealEv){
      shapeName='idle';
      target=this.baseline(w,h);
      main=revealEv.data.text||'';
    }else if(checkEv){
      shapeName='idle';
      target=this.baseline(w,h);
      main='✓';
    }else if(outroEv){
      shapeName='idle';
      target=this.baseline(w,h);
      main=outroEv.data.title||'';
      sub=outroEv.data.subtitle||'';
    }else{
      shapeName='idle';
      target=this.baseline(w,h);
    }

    const targetRes=resample(target,240);
    if(shapeName!==this.shapeName){
      this.prevShape=this.lastRendered?.length?this.lastRendered.map(p=>({...p})):resample(this.baseline(w,h),240);
      this.shapeStart=performance.now();
      this.shapeName=shapeName;
    }

    const morphMs=shapeName==='mnemonic'?220:shapeName==='voice'?90:shapeName==='cw'?40:shapeName==='flow'?90:120;
    const m=ease(clamp((performance.now()-this.shapeStart)/morphMs,0,1));
    const points=targetRes.map((p,i)=>({
      x:lerp(this.prevShape?.[i]?.x??p.x,p.x,m),
      y:lerp(this.prevShape?.[i]?.y??p.y,p.y,m)
    }));
    this.lastRendered=points;
    this.drawLine(points,time,1);

    if(mnemonicAsset){
      const ok=this.drawMnemonicAsset(
        mnemonicAsset.char,
        mnemonicAsset.lang,
        w,h,time,mnemonicAsset.event
      );
      if(!ok && this.mnemonicFailures.has(this.mnemonicKey(mnemonicAsset.char,mnemonicAsset.lang))){
        // Safe fallback only when an SVG truly failed. This keeps CW Studio
        // usable even if a single production asset is accidentally missing.
        const fallback=resample(this.mnemonicShape(mnemonicAsset.char,mnemonicAsset.lang,w,h),240);
        this.drawLine(fallback,time,.82);
      }
    }

    if(main){
      ctx.textAlign='center';
      ctx.fillStyle='#f3f8ff';
      const fs=main.length>28?40:main.length>16?52:main.length>8?64:82;
      ctx.font=`800 ${fs}px system-ui`;
      ctx.fillText(main,w/2,h*.22);
    }
    if(sub){
      ctx.textAlign='center';
      ctx.fillStyle='#93a5b8';
      ctx.font='500 21px system-ui';
      ctx.fillText(sub,w/2,h*.31);
    }

    this.drawProgress(time,timeline,w,h);
  }
}
