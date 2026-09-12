import {scheduleText} from './morse-engine.js';
export class Playback{
  constructor(voice){this.voice=voice;this.ctx=null;this.sources=[];this.timer=null;this.ended=false}
  stop(){this.sources.forEach(s=>{try{s.stop()}catch{}});this.sources=[];if(this.ctx){this.ctx.close().catch(()=>{});this.ctx=null}clearInterval(this.timer);this.timer=null}
  async play(tl,{lang='es',gender='female',tone=700,onTick=()=>{},onEnd=()=>{},limit=null,destination=null}={}){
    this.stop();const ctx=new AudioContext();this.ctx=ctx;const master=ctx.createGain();master.gain.value=.85;
    const comp=ctx.createDynamicsCompressor();comp.threshold.value=-3;comp.ratio.value=6;comp.attack.value=.003;comp.release.value=.18;
    const analyser=ctx.createAnalyser();analyser.fftSize=1024;master.connect(comp).connect(analyser);analyser.connect(destination||ctx.destination);this.analyser=analyser;
    const base=ctx.currentTime+.16,endAt=Math.min(limit||tl.duration,tl.duration);
    for(const e of tl.events){if(e.start>endAt)continue;
      if(e.type==='cw')scheduleText(ctx,master,e.data.text,base+e.start,{wpm:e.data.wpm||15,effectiveWpm:e.data.eff||e.data.wpm||15,tone:e.data.tone||tone,amp:.30});
      else if(e.type==='voice'||e.type==='charVoice'){
        const id=e.type==='voice'?e.data.id:`char_${String(e.data.char).toLowerCase()}`;const b=await this.voice.buffer(ctx,id,lang,gender);if(b){const s=ctx.createBufferSource();s.buffer=b;s.connect(master);s.start(base+e.start);this.sources.push(s)}
      }
    }
    this.ended=false;
    this.timer=setInterval(()=>{const t=Math.max(0,ctx.currentTime-base);onTick(Math.min(t,endAt),analyser);if(t>=endAt+.05&&!this.ended){this.ended=true;clearInterval(this.timer);this.timer=null;onEnd();}},33);
    return {ctx,analyser,base,endAt,master}
  }
}
