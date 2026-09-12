export class VoiceEngine{
  constructor(){
    this.coreIndex=null;this.courseIndex=null;this.cache=new Map();
    this.coreRoot=null;this.courseRoot=null;this.status={core:false,course:false};
  }

  async fetchJsonCandidates(paths){
    for(const path of paths){
      try{const r=await fetch(path,{cache:'no-store'});if(r.ok)return await r.json()}catch{}
    }
    return null
  }

  async exists(path){
    try{
      let r=await fetch(path,{method:'HEAD',cache:'no-store'});
      if(r.ok)return true;
      // Some static hosts do not handle HEAD consistently. Fall back to GET.
      r=await fetch(path,{cache:'no-store'});
      return r.ok;
    }catch{return false}
  }

  async discoverRoot(kind){
    const isCore=kind==='core';
    const candidates=isCore?[
      'assets/voices/core',
      'assets/voices/morse_practice_voicepack',
      'assets/voices/practice_voice_pack',
      'assets/voices/practice-voice-pack',
      'assets/voices/morse-practice-voicepack',
      'assets/voices'
    ]:[
      'assets/voices/course',
      'assets/voices/morse_practice_course_voicepack',
      'assets/voices/course_voice_pack',
      'assets/voices/course-voice-pack',
      'assets/voices/morse-practice-course-voicepack',
      'assets/voices'
    ];
    const probe=isCore?'es/female/characters/char_a.mp3':'es/female/lesson_intros/lesson_01_intro.mp3';
    for(const root of candidates){if(await this.exists(`${root}/${probe}`))return root}
    return null
  }

  async init(){
    // Auto-detect the folders that already exist in GitHub. Nothing has to be moved.
    this.coreRoot=await this.discoverRoot('core');
    this.courseRoot=await this.discoverRoot('course');

    if(this.coreRoot){
      this.coreIndex=await this.fetchJsonCandidates([
        `${this.coreRoot}/voice_index.json`,
        `${this.coreRoot}/index.json`
      ]);
    }
    if(this.courseRoot){
      this.courseIndex=await this.fetchJsonCandidates([
        `${this.courseRoot}/course_voice_index.json`,
        `${this.courseRoot}/voice_index.json`,
        `${this.courseRoot}/index.json`
      ]);
    }
    this.status.core=!!this.coreRoot;
    this.status.course=!!this.courseRoot;
    return this.status
  }

  infer(id,lang,gender){
    if(/^char_[a-z0-9]$/.test(id)&&this.coreRoot)return `${this.coreRoot}/${lang}/${gender}/characters/${id}.mp3`;
    if(/^lesson_\d\d_intro$/.test(id)&&this.courseRoot)return `${this.courseRoot}/${lang}/${gender}/lesson_intros/${id}.mp3`;
    if(/^lesson_\d\d_outro$/.test(id)&&this.courseRoot)return `${this.courseRoot}/${lang}/${gender}/lesson_outros/${id}.mp3`;
    if(id==='lesson_20_final_challenge'&&this.courseRoot)return `${this.courseRoot}/${lang}/${gender}/lesson_special/${id}.mp3`;
    const coreCategories={
      familiarization_intro:'instructions',familiarization_short:'instructions',recognition_intro:'instructions',recognition_variable_speed:'instructions',recognition_say_before_answer:'instructions',marathon_intro:'instructions',groups_intro:'instructions',no_response_required:'instructions',less_visual_help:'instructions',
      begin_review:'context',new_characters:'context',letters:'context',numbers:'context',letters_numbers:'context',punctuation:'context',prosigns:'context',abbreviations:'context',callsigns:'context',prefixes:'context',rst:'context',words:'context',qso_fragments:'context',qso_complete:'context',custom_text:'context',groups_two:'context',groups_three:'context',groups_five:'context',
      good_job_01:'coaching',good_job_02:'coaching',good_job_03:'coaching',relax_01:'coaching',relax_02:'coaching',whole_sound:'coaching',missed_character_01:'coaching',missed_character_02:'coaching',not_everything:'coaching',stay_flow:'coaching',trust_ear:'coaching',one_more_round:'coaching',
      prepare:'session',begin:'session',continue:'session',brief_pause:'session',pause_over:'session',last_round:'session',last_exercise:'session',one_minute_left:'session',section_complete:'session',session_almost_done:'session',
      session_complete_short:'outros',session_complete_general:'outros',signature:'outros',full_outro:'outros',daily_course_outro:'outros'
    };
    const cat=coreCategories[id];if(cat&&this.coreRoot)return `${this.coreRoot}/${lang}/${gender}/${cat}/${id}.mp3`;
    if(/_(full|short)$/.test(id)&&this.coreRoot)return `${this.coreRoot}/${lang}/${gender}/nomenclature/${id}.mp3`;
    return null
  }

  resolve(id,lang,gender){
    const course=this.courseIndex?.[id];
    if(course?.files?.[lang]?.[gender]&&this.courseRoot)return `${this.courseRoot}/${course.files[lang][gender]}`;
    const core=this.coreIndex?.[id];
    if(core?.files?.[lang]?.[gender]&&this.coreRoot)return `${this.coreRoot}/${core.files[lang][gender]}`;
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
    const out={core:false,course:false,coreRoot:this.coreRoot,courseRoot:this.courseRoot};
    const Ctx=window.AudioContext||window.webkitAudioContext;const ctx=new Ctx();
    try{
      out.core=!!(await this.buffer(ctx,'char_a',lang,gender));
      out.course=!!(await this.buffer(ctx,'lesson_01_intro',lang,gender));
    }finally{await ctx.close().catch(()=>{})}
    return out
  }
}
