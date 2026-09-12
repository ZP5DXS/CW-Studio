// CW Studio v1.0
// Exact voice resolver generated from the two Python voice-pack scripts.
// No directory guessing, no fallback narration substitution.
import {audioPath,packFor,CORE_ROOT,COURSE_ROOT,CORE_CATALOG,COURSE_CATALOG} from './audio-catalog.js?v=10';

export class VoiceEngine{
  constructor(){
    this.cache=new Map();
    this.durationCache=new Map();
    this.decodeCtx=null;
    this.lastResolved=null;
    this.lastMissing=null;
  }

  async init(){return {core:true,course:true}}

  path(id,lang,gender){
    const pack=packFor(id);
    if(!pack)return null;
    return audioPath(pack,id,lang,gender);
  }

  async ensureDecodeCtx(){
    if(!this.decodeCtx||this.decodeCtx.state==='closed'){
      const Ctx=window.AudioContext||window.webkitAudioContext;
      this.decodeCtx=new Ctx();
    }
    return this.decodeCtx;
  }

  async fetchDecode(url,ctx){
    const r=await fetch(url,{cache:'force-cache'});
    if(!r.ok)throw new Error(`HTTP ${r.status}`);
    const arr=await r.arrayBuffer();
    return await ctx.decodeAudioData(arr.slice(0));
  }

  async buffer(ctx,id,lang,gender){
    const key=`${lang}|${gender}|${id}`;
    if(this.cache.has(key))return this.cache.get(key);

    const url=this.path(id,lang,gender);
    if(!url){
      this.lastMissing={id,url:null,reason:'ID is not present in generated audio catalog'};
      console.warn('Unknown generated voice ID:',id);
      return null;
    }

    try{
      const b=await this.fetchDecode(url,ctx);
      this.cache.set(key,b);
      this.durationCache.set(key,b.duration);
      this.lastResolved={id,url,pack:packFor(id),duration:b.duration};
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
    const url=this.path(id,lang,gender);
    throw new Error(`Missing voice clip "${id}" at ${url||'unknown path'}`);
  }

  async preflight(ids,lang,gender,onStatus=()=>{}){
    const unique=[...new Set(ids.filter(Boolean))];
    const ctx=await this.ensureDecodeCtx();
    const missing=[];
    let done=0;
    for(const id of unique){
      done++;
      onStatus(`checking audio ${done}/${unique.length} · ${id}`);
      const b=await this.buffer(ctx,id,lang,gender);
      if(!b)missing.push({id,url:this.path(id,lang,gender)});
    }
    return {ok:missing.length===0,total:unique.length,missing};
  }

  roots(){return {
    core:CORE_ROOT,
    course:COURSE_ROOT,
    last:this.lastResolved,
    missing:this.lastMissing,
    coreClips:Object.keys(CORE_CATALOG).length,
    courseClips:Object.keys(COURSE_CATALOG).length
  }}
}
