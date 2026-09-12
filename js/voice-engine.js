export class VoiceEngine{
  constructor(){this.coreIndex=null;this.courseIndex=null;this.cache=new Map()}
  async init(){this.coreIndex=await fetch('assets/voices/core/voice_index.json').then(r=>r.ok?r.json():null).catch(()=>null);this.courseIndex=await fetch('assets/voices/course/course_voice_index.json').then(r=>r.ok?r.json():null).catch(()=>null)}
  resolve(id,lang,gender){const entry=this.courseIndex?.[id]||this.coreIndex?.[id];if(!entry)return null;const rel=entry.files?.[lang]?.[gender];if(!rel)return null;const base=this.courseIndex?.[id]?'assets/voices/course/':'assets/voices/core/';return base+rel}
  async buffer(ctx,id,lang,gender){const url=this.resolve(id,lang,gender);if(!url)return null;if(this.cache.has(url))return this.cache.get(url);const arr=await fetch(url).then(r=>{if(!r.ok)throw new Error(url);return r.arrayBuffer()});const b=await ctx.decodeAudioData(arr.slice(0));this.cache.set(url,b);return b}
}
