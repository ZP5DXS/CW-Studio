import {scheduleText,scheduleCheckTone} from './morse-engine.js?v=36';

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
    const endAt=Math.min(limit??tl.duration,tl.duration);
    this.startAt=from;
    this.current=from;

    // Voice clips are few and reusable. Decode them once, but NEVER build the
    // entire CW oscillator graph up front for a long session.
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

    let loaded=0;
    const ids=[...needed.keys()];
    const workers=Math.min(5,Math.max(1,ids.length));
    let cursor=0;
    const loadWorker=async()=>{
      while(cursor<ids.length){
        const id=ids[cursor++];
        const b=await this.voice.buffer(ctx,id,lang,gender);
        if(!b)throw new Error(`Unable to load ${id}`);
        needed.set(id,b);
        loaded++;
        onStatus(`loading audio ${loaded}/${ids.length} · ${id}`);
      }
    };
    await Promise.all(Array.from({length:workers},()=>loadWorker()));

    try{await ctx.resume()}catch{}
    const base=ctx.currentTime+.12;
    this.base=base;
    onStatus(`audio ready · ${needed.size} voice clips`);

    const events=tl.events;
    let nextIndex=0;
    while(nextIndex<events.length && (events[nextIndex].start+(events[nextIndex].duration||0))<from)nextIndex++;

    // Rolling Web Audio scheduling:
    // keep only ~40 s of future CW nodes scheduled, extending every few seconds.
    // This turns 30/60/120-minute sessions into a constant-memory playback job.
    const LOOKAHEAD=40;
    const REFILL_AT=18;
    let scheduledThrough=from;

    const scheduleWindow=(windowEnd)=>{
      const target=Math.min(windowEnd,endAt);
      while(nextIndex<events.length){
        const e=events[nextIndex];
        if(e.start>=target)break;
        nextIndex++;

        const eventEnd=e.start+(e.duration||0);
        if(eventEnd<from)continue;
        const when=base+Math.max(0,e.start-from);

        if(e.type==='cw'){
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

          const src=ctx.createBufferSource();
          src.buffer=b;
          src.connect(voiceBus);

          if(e.start<from && eventEnd>from){
            const offset=Math.min(b.duration-.01,Math.max(0,from-e.start));
            src.start(base,offset);
          }else if(e.start>=from){
            src.start(when);
          }
          this.sources.push(src);
        }
      }
      scheduledThrough=target;
    };

    scheduleWindow(from+LOOKAHEAD);

    this.ended=false;
    this.playing=true;
    this.paused=false;

    this.timer=setInterval(()=>{
      const t=Math.max(from,from+(ctx.currentTime-base));
      this.current=Math.min(t,endAt);
      onTick(this.current,analyser);

      if(scheduledThrough<endAt && scheduledThrough-t<REFILL_AT){
        scheduleWindow(t+LOOKAHEAD);
      }

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
