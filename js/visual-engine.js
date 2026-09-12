import {MORSE,PROSIGNS,unitSeconds} from './morse-engine.js?v=13';

function clamp(v,a,b){return Math.max(a,Math.min(b,v))}
function roundRect(ctx,x,y,w,h,r){
  const rr=Math.min(r,w/2,h/2);
  ctx.beginPath();ctx.moveTo(x+rr,y);ctx.arcTo(x+w,y,x+w,y+h,rr);ctx.arcTo(x+w,y+h,x,y+h,rr);ctx.arcTo(x,y+h,x,y,rr);ctx.arcTo(x,y,x+w,y,rr);ctx.closePath();
}

function pulseSegments(text,wpm,eff){
  const u=unitSeconds(wpm),eu=unitSeconds(eff||wpm);
  const seg=[];let t=0;
  const chars=[...String(text||'').toUpperCase()];
  chars.forEach((c,ci)=>{
    if(c===' '){seg.push({a:t,b:t+7*eu,v:0});t+=7*eu;return}
    const p=PROSIGNS[c]||MORSE[c];
    if(!p)return;
    [...p].forEach((m,i)=>{
      const d=m==='.'?u:3*u;
      seg.push({a:t,b:t+d,v:1});t+=d;
      if(i<p.length-1){seg.push({a:t,b:t+u,v:0});t+=u}
    });
    if(ci<chars.length-1){const g=Math.max(3*u,3*eu);seg.push({a:t,b:t+g,v:0});t+=g}
  });
  return {segments:seg,duration:t};
}

export class VisualEngine{
  constructor(canvas){
    this.c=canvas;
    this.x=canvas.getContext('2d');
    this.audioAnalyser=null;
    this.wave=new Uint8Array(1024);
    this.loading={active:false,percent:0,label:''};
  }
  setAnalyser(a){this.audioAnalyser=a;if(a)this.wave=new Uint8Array(a.fftSize)}
  setLoading(active,percent=0,label=''){
    this.loading={active,percent:clamp(Number(percent)||0,0,1),label:String(label||'')};
    if(active)this.drawLoading();
  }
  drawLoading(){
    const ctx=this.x,w=this.c.width,h=this.c.height;
    this.background(ctx,w,h);
    const pct=Math.round(this.loading.percent*100);
    ctx.textAlign='center';
    ctx.fillStyle='#8ce8ff';ctx.font='800 18px system-ui';ctx.fillText('LOADING LESSON',w/2,h*.33);
    ctx.fillStyle='#f3f8ff';ctx.font='800 78px system-ui';ctx.fillText(`${pct}%`,w/2,h*.48);
    ctx.fillStyle='#8996aa';ctx.font='500 22px system-ui';ctx.fillText(this.loading.label||'Preparing audio…',w/2,h*.57);
    const bx=w*.22,by=h*.66,bw=w*.56,bh=8;
    ctx.fillStyle='#172333';roundRect(ctx,bx,by,bw,bh,99);ctx.fill();
    ctx.fillStyle='#8ce8ff';roundRect(ctx,bx,by,bw*this.loading.percent,bh,99);ctx.fill();
  }
  background(ctx,w,h){
    const g=ctx.createRadialGradient(w*.5,h*.15,0,w*.5,h*.35,w*.8);
    g.addColorStop(0,'#102233');g.addColorStop(.4,'#080d14');g.addColorStop(1,'#040609');
    ctx.fillStyle=g;ctx.fillRect(0,0,w,h);
    ctx.strokeStyle='#0f1b28';ctx.lineWidth=1;
    for(let y=72;y<h;y+=48){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(w,y);ctx.stroke()}
  }
  drawGraphic(ctx,w,h,graphic,time){
    const cx=w/2,cy=h*.60;
    ctx.save();ctx.strokeStyle='#8ce8ff';ctx.fillStyle='#8ce8ff';ctx.lineWidth=4;ctx.globalAlpha=.8;
    if(graphic==='familiarization'){
      const xs=[cx-140,cx,cx+140];xs.forEach((x,i)=>{ctx.beginPath();ctx.arc(x,cy,34+Math.sin(time*3+i)*3,0,Math.PI*2);ctx.stroke()});
      ctx.beginPath();ctx.moveTo(xs[0]+44,cy);ctx.lineTo(xs[1]-44,cy);ctx.moveTo(xs[1]+44,cy);ctx.lineTo(xs[2]-44,cy);ctx.stroke();
    }else if(graphic==='recognition'||graphic==='focus'){
      ctx.beginPath();ctx.arc(cx,cy,70+Math.sin(time*2)*5,0,Math.PI*2);ctx.stroke();
      ctx.beginPath();ctx.arc(cx,cy,22,0,Math.PI*2);ctx.fill();
    }else if(graphic==='groups'||graphic==='mix'){
      for(let i=-2;i<=2;i++){const hh=26+Math.abs(i)*12;ctx.fillRect(cx+i*52-8,cy-hh/2,16,hh)}
    }else if(graphic==='callsign'){
      ctx.font='800 42px ui-monospace,monospace';ctx.textAlign='center';ctx.fillText('ZP5DXS',cx,cy+14);
    }else if(graphic==='qso'||graphic==='headcopy'){
      ctx.beginPath();ctx.arc(cx-85,cy,34,0,Math.PI*2);ctx.arc(cx+85,cy,34,0,Math.PI*2);ctx.stroke();
      ctx.beginPath();ctx.moveTo(cx-45,cy);ctx.bezierCurveTo(cx-15,cy-45,cx+15,cy+45,cx+45,cy);ctx.stroke();
    }else if(graphic==='clock'){
      ctx.beginPath();ctx.arc(cx,cy,58,0,Math.PI*2);ctx.stroke();ctx.beginPath();ctx.moveTo(cx,cy);ctx.lineTo(cx,cy-34);ctx.moveTo(cx,cy);ctx.lineTo(cx+28,cy+12);ctx.stroke();
    }else if(graphic==='milestone'||graphic==='finish'){
      for(let i=0;i<8;i++){const a=i*Math.PI/4+time*.2;ctx.beginPath();ctx.moveTo(cx+Math.cos(a)*42,cy+Math.sin(a)*42);ctx.lineTo(cx+Math.cos(a)*82,cy+Math.sin(a)*82);ctx.stroke()}
      ctx.beginPath();ctx.arc(cx,cy,28,0,Math.PI*2);ctx.fill();
    }else if(graphic==='concept'){
      ctx.beginPath();ctx.arc(cx,cy,54,0,Math.PI*2);ctx.stroke();ctx.font='800 38px system-ui';ctx.textAlign='center';ctx.fillText('?',cx,cy+14);
    }else{
      ctx.beginPath();ctx.arc(cx,cy,54+Math.sin(time*2)*4,0,Math.PI*2);ctx.stroke();
    }
    ctx.restore();
  }
  drawVoiceMouth(ctx,w,h){
    const y=h*.78,left=110,right=w-110,width=right-left;
    let amp=0.16;
    if(this.audioAnalyser){
      this.audioAnalyser.getByteTimeDomainData(this.wave);
      let sum=0;for(const v of this.wave){const n=(v-128)/128;sum+=n*n}
      amp=Math.sqrt(sum/this.wave.length);
    }
    const open=10+Math.min(68,amp*260);
    ctx.save();ctx.strokeStyle='#8ce8ff';ctx.lineWidth=3;ctx.shadowBlur=14;ctx.shadowColor='#8ce8ff';
    const samples=120;
    ctx.beginPath();
    for(let i=0;i<samples;i++){
      const x=left+width*i/(samples-1),u=i/(samples-1),shape=Math.sin(Math.PI*u);
      const jitter=this.audioAnalyser?((this.wave[Math.floor(i*(this.wave.length-1)/(samples-1))]-128)/128)*18:Math.sin(i*.25)*3;
      const yy=y-open*shape*.55-jitter*.28;
      i?ctx.lineTo(x,yy):ctx.moveTo(x,yy);
    }
    ctx.stroke();
    ctx.beginPath();
    for(let i=0;i<samples;i++){
      const x=left+width*i/(samples-1),u=i/(samples-1),shape=Math.sin(Math.PI*u);
      const jitter=this.audioAnalyser?((this.wave[Math.floor(i*(this.wave.length-1)/(samples-1))]-128)/128)*18:Math.sin(i*.25)*3;
      const yy=y+open*shape*.55+jitter*.28;
      i?ctx.lineTo(x,yy):ctx.moveTo(x,yy);
    }
    ctx.stroke();ctx.restore();
  }
  drawCwEcg(ctx,w,h,event,time){
    const y=h*.79,left=100,right=w-100,width=right-left;
    const elapsed=clamp(time-event.start,0,event.duration);
    const data=pulseSegments(event.data.text,event.data.wpm||15,event.data.eff||event.data.wpm||15);
    const windowSec=Math.max(3.2,Math.min(9,data.duration+1));
    const start=Math.max(0,elapsed-windowSec),end=start+windowSec;
    const baseline=y+24,high=y-45;

    ctx.save();
    ctx.strokeStyle='#173145';ctx.lineWidth=1;
    for(let i=0;i<=8;i++){const x=left+i*width/8;ctx.beginPath();ctx.moveTo(x,y-70);ctx.lineTo(x,y+42);ctx.stroke()}
    ctx.strokeStyle='#8ce8ff';ctx.lineWidth=3;ctx.shadowBlur=13;ctx.shadowColor='#8ce8ff';
    ctx.beginPath();
    let started=false;
    const point=(t,v)=>{
      const x=right-(end-t)/windowSec*width;
      if(x<left||x>right)return;
      const yy=v?high:baseline;
      if(!started){ctx.moveTo(x,yy);started=true}else ctx.lineTo(x,yy);
    };
    point(start,0);
    for(const s of data.segments){
      if(s.b<start||s.a>end)continue;
      const a=Math.max(start,s.a),b=Math.min(end,s.b);
      point(a,0); point(a,s.v); point(b,s.v); point(b,0);
    }
    point(end,0);ctx.stroke();
    ctx.shadowBlur=0;
    ctx.fillStyle='#5f7389';ctx.font='600 12px ui-monospace,monospace';ctx.textAlign='right';ctx.fillText('BINARY KEYING TRACE',right,y+62);
    ctx.restore();
  }
  draw(time,timeline){
    if(this.loading.active){this.drawLoading();return}
    const ctx=this.x,w=this.c.width,h=this.c.height;
    this.background(ctx,w,h);
    const ev=timeline?.at(time)||[];
    let main='',sub='',mode='',graphic='voice';
    let cwEvent=null,voiceEvent=null;

    for(const e of ev){
      if(e.type==='title'||e.type==='outro'){main=e.data.title||'';sub=e.data.subtitle||'';mode=e.type==='title'?'LESSON':'COMPLETE';graphic=e.type==='title'?'lesson':'finish'}
      if(e.type==='reveal'){main=e.data.text||'';mode=e.data.mnemonic?'FAMILIARIZATION':'RECOGNITION';graphic=e.data.mnemonic?'familiarization':'recognition'}
      if(e.type==='cw'){cwEvent=e;main=e.data.mode==='headcopy'?'HEAD COPY':(e.data.mode==='familiarization'?'LISTEN':'LISTEN');sub=e.data.mode==='recognition'?'Answer before the reveal':'';mode=(e.data.mode||'CW').toUpperCase();graphic='cw'}
      if(e.type==='voice'){voiceEvent=e;main=e.data.visual?.title||'MORSE PRACTICE';sub=e.data.visual?.subtitle||'GUIDED INSTRUCTION';mode='GUIDED AUDIO';graphic=e.data.visual?.graphic||'voice'}
      if(e.type==='charVoice'){voiceEvent=e;main=e.data.char||'';sub='';mode='ANSWER';graphic='voice'}
      if(e.type==='check'){main='✓';sub='NEXT';mode='';graphic='finish'}
    }

    ctx.textAlign='center';
    ctx.fillStyle='#8ce8ff';ctx.font='800 17px system-ui';ctx.fillText(mode,w/2,74);
    ctx.fillStyle='#f3f8ff';
    const fs=main.length>22?54:main.length>10?66:88;
    ctx.font=`800 ${fs}px system-ui`;ctx.fillText(main,w/2,h*.35);
    ctx.fillStyle='#93a1b4';ctx.font='500 24px system-ui';
    if(sub)ctx.fillText(sub,w/2,h*.43);

    if(voiceEvent){
      this.drawGraphic(ctx,w,h,graphic,time);
      this.drawVoiceMouth(ctx,w,h);
    }else if(cwEvent){
      this.drawCwEcg(ctx,w,h,cwEvent,time);
    }else{
      this.drawGraphic(ctx,w,h,graphic,time);
    }

    const p=timeline?.duration?Math.min(1,time/timeline.duration):0;
    ctx.fillStyle='#172333';ctx.fillRect(90,h-38,w-180,4);
    ctx.fillStyle='#8ce8ff';ctx.fillRect(90,h-38,(w-180)*p,4);
  }
}
