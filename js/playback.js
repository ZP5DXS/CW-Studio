import {scheduleText,scheduleCheckTone} from './morse-engine.js?v=14';

export class Playback{
  constructor(voice){this.voice=voice;this.ctx=null;this.sources=[];this.timer=null;this.ended=false}
  stop(){
    this.sources.forEach(s=>{try{s.stop()}catch{}});
    this.sources=[];
    if(this.ctx){this.ctx.close().catch(()=>{});this.ctx=null}
    clearInterval(this.timer);this.timer=null;
  }

  async play(tl,{lang='es',gender='female',tone=700,onTick=()=>{},onEnd=()=>{},onStatus=()=>{},limit=null,destination=null}={}){
    this.stop();
    const Ctx=window.AudioContext||window.webkitAudioContext;
    const ctx=new Ctx();this.ctx=ctx;
    try{await ctx.resume()}catch{}

    const master=ctx.createGain();master.gain.value=.85;
    const comp=ctx.createDynamicsCompressor();
    comp.threshold.value=-3;comp.ratio.value=6;comp.attack.value=.003;comp.release.value=.18;
    const analyser=ctx.createAnalyser();analyser.fftSize=1024;
    master.connect(comp).connect(analyser);analyser.connect(destination||ctx.destination);
    this.analyser=analyser;

    const endAt=Math.min(limit||tl.duration,tl.duration);
    const needed=new Map();
    for(const e of tl.events){
      if(e.start>endAt)continue;
      if(e.type==='voice'||e.type==='charVoice'){
        const id=e.type==='voice'?e.data.id:`char_${String(e.data.char).toLowerCase()}`;
        if(!needed.has(id))needed.set(id,null);
      }
    }

    let i=0;
    for(const id of needed.keys()){
      i++;onStatus(`loading lesson audio ${i}/${needed.size} · ${id}`);
      const b=await this.voice.buffer(ctx,id,lang,gender);
      if(!b)throw new Error(`Unable to load ${id}`);
      needed.set(id,b);
    }

    try{await ctx.resume()}catch{}
    const base=ctx.currentTime+.35;
    onStatus(`audio ready · ${needed.size} voice clips`);

    for(const e of tl.events){
      if(e.start>endAt)continue;
      if(e.type==='cw'){
        scheduleText(ctx,master,e.data.text,base+e.start,{
          wpm:e.data.wpm||15,effectiveWpm:e.data.eff||e.data.wpm||15,tone:e.data.tone||tone,amp:.30
        });
      }else if(e.type==='check'){
        scheduleCheckTone(ctx,master,base+e.start,{amp:.12});
      }else if(e.type==='voice'||e.type==='charVoice'){
        const id=e.type==='voice'?e.data.id:`char_${String(e.data.char).toLowerCase()}`;
        const s=ctx.createBufferSource();s.buffer=needed.get(id);s.connect(master);s.start(base+e.start);this.sources.push(s);
      }
    }

    this.ended=false;
    this.timer=setInterval(()=>{
      const t=Math.max(0,ctx.currentTime-base);
      onTick(Math.min(t,endAt),analyser);
      if(t>=endAt+.05&&!this.ended){
        this.ended=true;clearInterval(this.timer);this.timer=null;onEnd();
      }
    },33);
    return {ctx,analyser,base,endAt,master};
  }
}
