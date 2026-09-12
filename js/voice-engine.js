export class VoiceEngine{
  constructor(){this.coreIndex=null;this.courseIndex=null;this.cache=new Map();this.status={core:false,course:false}}

  async fetchJsonCandidates(paths){
    for(const path of paths){
      try{const r=await fetch(path,{cache:'no-store'});if(r.ok)return await r.json()}catch{}
    }
    return null
  }

  async init(){
    this.coreIndex=await this.fetchJsonCandidates([
      'assets/voices/core/voice_index.json',
      'assets/voices/core/index.json'
    ]);
    this.courseIndex=await this.fetchJsonCandidates([
      'assets/voices/course/course_voice_index.json',
      'assets/voices/course/voice_index.json',
      'assets/voices/course/index.json'
    ]);
    this.status.core=!!this.coreIndex;
    this.status.course=!!this.courseIndex;
    return this.status
  }

  infer(id,lang,gender){
    const root=`assets/voices/`;
    if(/^char_[a-z0-9]$/.test(id))return `${root}core/${lang}/${gender}/characters/${id}.mp3`;
    if(/^lesson_\d\d_intro$/.test(id))return `${root}course/${lang}/${gender}/lesson_intros/${id}.mp3`;
    if(/^lesson_\d\d_outro$/.test(id))return `${root}course/${lang}/${gender}/lesson_outros/${id}.mp3`;
    if(id==='lesson_20_final_challenge')return `${root}course/${lang}/${gender}/lesson_special/${id}.mp3`;
    const coreCategories={
      familiarization_intro:'instructions',familiarization_short:'instructions',recognition_intro:'instructions',recognition_variable_speed:'instructions',recognition_say_before_answer:'instructions',marathon_intro:'instructions',groups_intro:'instructions',no_response_required:'instructions',less_visual_help:'instructions',
      begin_review:'context',new_characters:'context',letters:'context',numbers:'context',letters_numbers:'context',punctuation:'context',prosigns:'context',abbreviations:'context',callsigns:'context',prefixes:'context',rst:'context',words:'context',qso_fragments:'context',qso_complete:'context',custom_text:'context',groups_two:'context',groups_three:'context',groups_five:'context',
      good_job_01:'coaching',good_job_02:'coaching',good_job_03:'coaching',relax_01:'coaching',relax_02:'coaching',whole_sound:'coaching',missed_character_01:'coaching',missed_character_02:'coaching',not_everything:'coaching',stay_flow:'coaching',trust_ear:'coaching',one_more_round:'coaching',
      prepare:'session',begin:'session',continue:'session',brief_pause:'session',pause_over:'session',last_round:'session',last_exercise:'session',one_minute_left:'session',section_complete:'session',session_almost_done:'session',
      session_complete_short:'outros',session_complete_general:'outros',signature:'outros',full_outro:'outros',daily_course_outro:'outros'
    };
    const cat=coreCategories[id];if(cat)return `${root}core/${lang}/${gender}/${cat}/${id}.mp3`;
    if(/_(full|short)$/.test(id))return `${root}core/${lang}/${gender}/nomenclature/${id}.mp3`;
    return null
  }

  resolve(id,lang,gender){
    const course=this.courseIndex?.[id];
    if(course?.files?.[lang]?.[gender])return 'assets/voices/course/'+course.files[lang][gender];
    const core=this.coreIndex?.[id];
    if(core?.files?.[lang]?.[gender])return 'assets/voices/core/'+core.files[lang][gender];
    return this.infer(id,lang,gender)
  }

  async buffer(ctx,id,lang,gender){
    const url=this.resolve(id,lang,gender);if(!url)return null;
    if(this.cache.has(url))return this.cache.get(url);
    try{
      const r=await fetch(url);if(!r.ok)throw new Error(`${r.status} ${url}`);
      const arr=await r.arrayBuffer();const b=await ctx.decodeAudioData(arr.slice(0));this.cache.set(url,b);return b
    }catch(err){console.warn('Voice asset unavailable:',id,url,err);return null}
  }

  async duration(id,lang,gender){
    const Ctx=window.AudioContext||window.webkitAudioContext;const ctx=new Ctx();
    try{const b=await this.buffer(ctx,id,lang,gender);return b?.duration||0}finally{await ctx.close().catch(()=>{})}
  }

  async probe(lang='es',gender='female'){
    const tests=[['core',`char_a`],['course','lesson_01_intro']];const out={};
    const Ctx=window.AudioContext||window.webkitAudioContext;const ctx=new Ctx();
    try{for(const [kind,id] of tests)out[kind]=!!(await this.buffer(ctx,id,lang,gender))}finally{await ctx.close().catch(()=>{})}
    return out
  }
}
