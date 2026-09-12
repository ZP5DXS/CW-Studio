import {scheduleText,scheduleCheckTone} from './morse-engine.js?v=9';

export class Playback{
  constructor(voice){
    this.voice=voice;
    this.ctx=null;
    this.sources=[];
    this.timer=null;
    this.ended=false;
  }

  stop(){
    this.sources.forEach(s=>{try{s.stop()}catch{}});
    this.sources=[];
    if(this.ctx){this.ctx.close().catch(()=>{});this.ctx=null}
    clearInterval(this.timer);
    this.timer=null;
  }

  async play(tl,{
    lang='es',
    gender='female',
    tone=700,
    onTick=()=>{},
    onEnd=()=>{},
    onStatus=()=>{},
    limit=null,
    destination=null
  }={}){
    this.stop();

    const Ctx=window.AudioContext||window.webkitAudioContext;
    const ctx=new Ctx();
    this.ctx=ctx;

    // Explicit resume on the user gesture path.
    try{await ctx.resume()}catch{}

    const master=ctx.createGain();
    master.gain.value=.85;

    const comp=ctx.createDynamicsCompressor();
    comp.threshold.value=-3;
    comp.ratio.value=6;
    comp.attack.value=.003;
    comp.release.value=.18;

    const analyser=ctx.createAnalyser();
    analyser.fftSize=1024;

    master.connect(comp).connect(analyser);
    analyser.connect(destination||ctx.destination);
    this.analyser=analyser;

    const endAt=Math.min(limit||tl.duration,tl.duration);

    // IMPORTANT:
    // Preload/decode every unique spoken clip BEFORE establishing the timeline base.
    // Otherwise network/decode delays make scheduled speech fall into the past while
    // locally generated CW keeps perfect timing.
    const needed=new Map();
    for(const e of tl.events){
      if(e.start>endAt) continue;
      if(e.type==='voice'||e.type==='charVoice'){
        const id=e.type==='voice'
          ? e.data.id
          : `char_${String(e.data.char).toLowerCase()}`;
        if(!needed.has(id)) needed.set(id,null);
      }
    }

    onStatus(`loading ${needed.size} voice clips…`);

    let loaded=0,missing=0;
    let loadIndex=0;
    const totalNeeded=needed.size;
    for(const id of needed.keys()){
      loadIndex++;
      onStatus(`loading lesson audio ${loadIndex}/${totalNeeded} · ${id}`);
      const b=await this.voice.buffer(ctx,id,lang,gender);
      needed.set(id,b||null);
      if(b) loaded++; else missing++;
    }
      }
      needed.set(id,b||null);
      if(b) loaded++; else missing++;
    }

    const roots=this.voice.roots();
    if(missing){
      const miss=[...needed].filter(([,b])=>!b).map(([id])=>id);
      onStatus(`voice ${loaded}/${needed.size} loaded · missing: ${miss.join(', ')}`);

      console.warn('Missing voice clips:', [...needed].filter(([,b])=>!b).map(([id])=>id));
    }else{
      onStatus(`voice ready · ${loaded} clips${roots.core?` · Core: ${roots.core}`:''}${roots.course?` · Course: ${roots.course}`:''}`);
    }

    // A second explicit resume after network/decode work matters in some browsers:
    // the context can auto-suspend while voice assets are loading.
    try{await ctx.resume()}catch{}
    if(ctx.state!=='running'){
      onStatus(`audio context is ${ctx.state} · click Play once more`);
    }

    // Establish base only AFTER voice loading is complete and context is running.
    const base=ctx.currentTime+.35;

    for(const e of tl.events){
      if(e.start>endAt) continue;

      if(e.type==='cw'){
        scheduleText(ctx,master,e.data.text,base+e.start,{
          wpm:e.data.wpm||15,
          effectiveWpm:e.data.eff||e.data.wpm||15,
          tone:e.data.tone||tone,
          amp:.30
        });
      }else if(e.type==='check'){
        scheduleCheckTone(ctx,master,base+e.start,{amp:.14});
      }else if(e.type==='voice'||e.type==='charVoice'){
        const id=e.type==='voice'
          ? e.data.id
          : `char_${String(e.data.char).toLowerCase()}`;
        const b=needed.get(id);
        if(b){
          const s=ctx.createBufferSource();
          s.buffer=b;
          s.connect(master);
          s.start(base+e.start);
          this.sources.push(s);
        }
      }
    }

    this.ended=false;
    this.timer=setInterval(()=>{
      const t=Math.max(0,ctx.currentTime-base);
      onTick(Math.min(t,endAt),analyser);
      if(t>=endAt+.05&&!this.ended){
        this.ended=true;
        clearInterval(this.timer);
        this.timer=null;
        onEnd();
      }
    },33);

    return {ctx,analyser,base,endAt,master};
  }
}
