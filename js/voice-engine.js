// CW Studio v1.2
// Exact resolver for the repository layout confirmed from PowerShell.
//
// IMPORTANT:
//   Core Voice Pack lives in:   assets/voices/course/
//   Course Voice Pack lives in: assets/voices/core/
//
// This looks inverted by folder name, but it is the ACTUAL repository layout.
// We deliberately follow the JSON indexes rather than renaming any audio files.

const VOICE_ASSET_VERSION='20260913-en-atomic-1';

export class VoiceEngine{
  constructor(){
    this.cache=new Map();
    this.durationCache=new Map();
    this.decodeCtx=null;
    this.coreRoot='assets/voices/course';
    this.courseRoot='assets/voices/core';
    this.coreIndex=null;
    this.courseIndex=null;
    this.discoveryDone=false;
    this.lastResolved=null;
    this.lastMissing=null;
  }

  async init(){ return true; }

  async fetchJson(url){
    const r=await fetch(url,{cache:'no-store'});
    if(!r.ok)throw new Error(`${url} → HTTP ${r.status}`);
    return await r.json();
  }

  async discover(onStatus=()=>{}){
    if(this.discoveryDone)return this.roots();

    onStatus('loading Core voice index…');
    this.coreIndex=await this.fetchJson(`${this.coreRoot}/voice_index.json`);

    onStatus('loading Course voice index…');
    this.courseIndex=await this.fetchJson(`${this.courseRoot}/course_voice_index.json`);

    this.discoveryDone=true;
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
    // Voice files keep stable filenames, so after regenerating MP3s a browser
    // may otherwise serve an older cached clip indefinitely. Version the URL
    // while still allowing normal caching within this build.
    const sep=url.includes('?')?'&':'?';
    const versioned=`${url}${sep}av=${encodeURIComponent(VOICE_ASSET_VERSION)}`;
    const r=await fetch(versioned,{cache:'force-cache'});
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
      this.lastMissing={id,url:null,reason:'clip ID absent from both JSON indexes'};
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
    throw new Error(`Missing voice clip "${id}"${url?` at ${url}`:' (ID not found in JSON indexes)'}`);
  }

  async preflight(ids,lang,gender,onStatus=()=>{}){
    await this.discover(onStatus);
    const unique=[...new Set(ids.filter(Boolean))];
    const ctx=await this.ensureDecodeCtx();
    const missing=[];
    let done=0,cursor=0;
    const workers=Math.min(5,Math.max(1,unique.length));
    const worker=async()=>{
      while(cursor<unique.length){
        const i=cursor++;
        const id=unique[i];
        const b=await this.buffer(ctx,id,lang,gender);
        if(!b)missing.push({id,url:await this.path(id,lang,gender)});
        done++;
        onStatus(`checking lesson audio ${done}/${unique.length} · ${id}`);
      }
    };
    await Promise.all(Array.from({length:workers},()=>worker()));
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
