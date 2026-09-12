// CW Studio v1.1
// Resolver based on the JSON indexes produced by the two Python generators.
// It does NOT assume that the pack folders are named "core" and "course".
export class VoiceEngine{
  constructor(){
    this.cache=new Map();
    this.durationCache=new Map();
    this.decodeCtx=null;
    this.coreIndex=null;
    this.courseIndex=null;
    this.coreRoot=null;
    this.courseRoot=null;
    this.discoveryDone=false;
    this.lastResolved=null;
    this.lastMissing=null;

    this.coreRoots=[
      'assets/voices/core',
      'assets/voices/morse_practice_voicepack',
      'assets/voices/morse-practice-voicepack',
      'assets/voices/practice_voicepack',
      'assets/voices/practice-voicepack',
      'assets/voices/practice voice pack',
      'assets/voices/Practice Voice Pack',
      'assets/voices'
    ];

    this.courseRoots=[
      'assets/voices/course',
      'assets/voices/morse_practice_course_voicepack',
      'assets/voices/morse-practice-course-voicepack',
      'assets/voices/course_voicepack',
      'assets/voices/course-voicepack',
      'assets/voices/course voice pack',
      'assets/voices/Course Voice Pack',
      'assets/voices'
    ];
  }

  async init(){ return true; }

  async fetchJson(url){
    try{
      const r=await fetch(url,{cache:'no-store'});
      if(!r.ok)return null;
      return await r.json();
    }catch{return null}
  }

  async discover(onStatus=()=>{}){
    if(this.discoveryDone)return this.roots();
    this.discoveryDone=true;

    let i=0;
    for(const root of this.coreRoots){
      i++; onStatus(`locating Core Voice Pack ${i}/${this.coreRoots.length}`);
      const j=await this.fetchJson(`${root}/voice_index.json`);
      if(j && typeof j==='object'){
        this.coreIndex=j;
        this.coreRoot=root;
        break;
      }
    }

    i=0;
    for(const root of this.courseRoots){
      i++; onStatus(`locating Course Voice Pack ${i}/${this.courseRoots.length}`);
      const j=await this.fetchJson(`${root}/course_voice_index.json`);
      if(j && typeof j==='object'){
        this.courseIndex=j;
        this.courseRoot=root;
        break;
      }
    }

    return this.roots();
  }

  async ensureDecodeCtx(){
    if(!this.decodeCtx||this.decodeCtx.state==='closed'){
      const Ctx=window.AudioContext||window.webkitAudioContext;
      this.decodeCtx=new Ctx();
    }
    return this.decodeCtx;
  }

  recordFor(id){
    if(this.courseIndex?.[id])return {pack:'course',root:this.courseRoot,rec:this.courseIndex[id]};
    if(this.coreIndex?.[id])return {pack:'core',root:this.coreRoot,rec:this.coreIndex[id]};
    return null;
  }

  async path(id,lang,gender){
    await this.discover();
    const found=this.recordFor(id);
    if(!found)return null;
    const rel=found.rec?.files?.[lang]?.[gender];
    if(!rel)return null;
    return `${found.root}/${rel}`;
  }

  async fetchDecode(url,ctx){
    const r=await fetch(url,{cache:'force-cache'});
    if(!r.ok)throw new Error(`HTTP ${r.status}`);
    const arr=await r.arrayBuffer();
    return await ctx.decodeAudioData(arr.slice(0));
  }

  async buffer(ctx,id,lang,gender){
    await this.discover();
    const key=`${lang}|${gender}|${id}`;
    if(this.cache.has(key))return this.cache.get(key);

    const url=await this.path(id,lang,gender);
    if(!url){
      this.lastMissing={id,url:null,reason:'clip not found in loaded JSON indexes'};
      return null;
    }

    try{
      const b=await this.fetchDecode(url,ctx);
      this.cache.set(key,b);
      this.durationCache.set(key,b.duration);
      const found=this.recordFor(id);
      this.lastResolved={id,url,pack:found?.pack||null,duration:b.duration};
      return b;
    }catch(err){
      this.lastMissing={id,url,reason:String(err?.message||err)};
      console.error('Voice asset failed:',this.lastMissing);
      return null;
    }
  }

  async duration(id,lang,gender){
    const key=`${lang}|${gender}|${id}`;
    if(this.durationCache.has(key))return this.durationCache.get(key);
    const ctx=await this.ensureDecodeCtx();
    const b=await this.buffer(ctx,id,lang,gender);
    return b?.duration||0;
  }

  async requireDuration(id,lang,gender){
    const d=await this.duration(id,lang,gender);
    if(d>0)return d;
    const url=await this.path(id,lang,gender);
    throw new Error(`Missing voice clip "${id}"${url?` at ${url}`:' (not found in voice indexes)'}`);
  }

  async preflight(ids,lang,gender,onStatus=()=>{}){
    await this.discover(onStatus);
    const unique=[...new Set(ids.filter(Boolean))];
    const ctx=await this.ensureDecodeCtx();
    const missing=[];
    let done=0;
    for(const id of unique){
      done++;
      onStatus(`checking lesson audio ${done}/${unique.length} · ${id}`);
      const b=await this.buffer(ctx,id,lang,gender);
      if(!b)missing.push({id,url:await this.path(id,lang,gender)});
    }
    return {ok:missing.length===0,total:unique.length,missing};
  }

  roots(){
    return {
      core:this.coreRoot,
      course:this.courseRoot,
      coreClips:this.coreIndex?Object.keys(this.coreIndex).length:0,
      courseClips:this.courseIndex?Object.keys(this.courseIndex).length:0,
      last:this.lastResolved,
      missing:this.lastMissing
    };
  }
}
