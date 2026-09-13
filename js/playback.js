import {scheduleText,scheduleCheckTone} from './morse-engine.js?v=351';

export class Playback{
  constructor(voice){
    this.voice=voice;
    this.ctx=null;
    this.sources=[];
    this.timer=null;
    this.ended=false;
    this.playing=false;
    this.paused=false;
    this.startAt=0;
    this.base=0;
    this.current=0;
  }

  stop(){
    this.sources.forEach(s=>{try{s.stop()}catch{}});
    this.sources=[];
    if(this.ctx){this.ctx.close().catch(()=>{});this.ctx=null}
    clearInterval(this.timer);
    this.timer=null;
    this.playing=false;
    this.paused=false;
  }

  async pause(){
    if(this.ctx&&this.playing&&!this.paused){
      await this.ctx.suspend();
      this.paused=true;
      return true;
    }
    return false;
  }

  async resume(){
    if(this.ctx&&this.playing&&this.paused){
      await this.ctx.resume();
      this.paused=false;
      return true;
    }
    return false;
  }

  isPaused(){return !!this.paused}
  isPlaying(){return !!this.playing}
  position(){return this.current||this.startAt||0}

  async play(tl,{
    lang='es',
    gender='female',
    tone=700,
    onTick=()=>{},
    onEnd=()=>{},
    onStatus=()=>{},
    limit=null,
    destination=null,
    startAt=0
  }={}){
    this.stop();

    const Ctx=window.AudioContext||window.webkitAudioContext;
    const ctx=new Ctx();
    this.ctx=ctx;
    try{await ctx.resume()}catch{}

    // Keep synthesized CW/check tones and spoken voice on separate buses.
    // Short English letter names (B, S, F, etc.) are especially sensitive to
    // aggressive compression; send voice directly to the analyser/output.
    const cwBus=ctx.createGain();
    cwBus.gain.value=.85;

    const voiceBus=ctx.createGain();
    voiceBus.gain.value=.92;

    const comp=ctx.createDynamicsCompressor();
    comp.threshold.value=-3;
    comp.ratio.value=6;
    comp.attack.value=.003;
    comp.release.value=.18;

    const analyser=ctx.createAnalyser();
    analyser.fftSize=1024;

    cwBus.connect(comp).connect(analyser);
    voiceBus.connect(analyser);
    analyser.connect(destination||ctx.destination);
    this.analyser=analyser;

    const from=Math.max(0,Math.min(startAt||0,tl.duration));
    const endAt=Math.min(limit||tl.duration,tl.duration);
    this.startAt=from;
    this.current=from;

    const needed=new Map();
    for(const e of tl.events){
      if(e.start>=endAt)continue;
      const ends=e.start+(e.duration||0);
      if(ends<from)continue;
      if(e.type==='voice'||e.type==='charVoice'){
        const id=e.type==='voice'
          ?e.data.id
          :`char_${String(e.data.char).toLowerCase()}`;
        if(!needed.has(id))needed.set(id,null);
      }
    }

    let i=0;
    for(const id of needed.keys()){
      i++;
      onStatus(`loading audio ${i}/${needed.size} · ${id}`);
      const b=await this.voice.buffer(ctx,id,lang,gender);
      if(!b)throw new Error(`Unable to load ${id}`);
      needed.set(id,b);
    }

    try{await ctx.resume()}catch{}
    const base=ctx.currentTime+.30;
    this.base=base;
    onStatus(`audio ready · ${needed.size} voice clips`);

    for(const e of tl.events){
      if(e.start>=endAt)continue;
      const eventEnd=e.start+(e.duration||0);
      if(eventEnd<from)continue;

      const when=base+Math.max(0,e.start-from);

      if(e.type==='cw'){
        // If seek lands inside an active CW element, skip that partial element and
        // continue from the next scheduled event. This avoids malformed partial Morse.
        if(e.start<from)continue;
        scheduleText(ctx,cwBus,e.data.text,when,{
          wpm:e.data.wpm||15,
          effectiveWpm:e.data.eff||e.data.wpm||15,
          tone:e.data.tone||tone,
          amp:.30
        });
      }else if(e.type==='check'){
        if(e.start<from)continue;
        scheduleCheckTone(ctx,cwBus,when,{amp:.12});
      }else if(e.type==='voice'||e.type==='charVoice'){
        const id=e.type==='voice'
          ?e.data.id
          :`char_${String(e.data.char).toLowerCase()}`;
        const b=needed.get(id);
        if(!b)continue;

        const s=ctx.createBufferSource();
        s.buffer=b;
        s.connect(voiceBus);

        if(e.start<from && eventEnd>from){
          const offset=Math.min(b.duration-.01,Math.max(0,from-e.start));
          s.start(base,offset);
        }else if(e.start>=from){
          s.start(when);
        }else{
          continue;
        }
        this.sources.push(s);
      }
    }

    this.ended=false;
    this.playing=true;
    this.paused=false;

    this.timer=setInterval(()=>{
      const t=Math.max(from,from+(ctx.currentTime-base));
      this.current=Math.min(t,endAt);
      onTick(this.current,analyser);

      if(t>=endAt+.05&&!this.ended){
        this.ended=true;
        this.playing=false;
        this.paused=false;
        clearInterval(this.timer);
        this.timer=null;
        onEnd();
      }
    },33);

    return {ctx,analyser,base,endAt,master:cwBus,voiceBus,startAt:from};
  }
}
