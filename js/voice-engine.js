export class VoiceEngine{
  constructor(){
    this.coreIndex=null;this.courseIndex=null;this.cache=new Map();
    this.coreRoot=null;this.courseRoot=null;this.status={core:false,course:false};
    this.rootCandidates={
      core:[
        'assets/voices/core',
        'assets/voices/morse_practice_voicepack',
        'assets/voices/morse-practice-voicepack',
        'assets/voices/morse practice voicepack',
        'assets/voices/morse practice voice pack',
        'assets/voices/practice_voice_pack',
        'assets/voices/practice-voice-pack',
        'assets/voices/practice voice pack',
        'assets/voices/Practice Voice Pack',
        'assets/voices/Morse Practice Voice Pack',
        'assets/voices'
      ],
      course:[
        'assets/voices/course',
        'assets/voices/morse_practice_course_voicepack',
        'assets/voices/morse-practice-course-voicepack',
        'assets/voices/morse practice course voicepack',
        'assets/voices/morse practice course voice pack',
        'assets/voices/course_voice_pack',
        'assets/voices/course-voice-pack',
        'assets/voices/course voice pack',
        'assets/voices/Course Voice Pack',
        'assets/voices/Morse Practice Course Voice Pack',
        'assets/voices'
      ]
    };
  }

  async fetchJsonCandidates(paths){
    for(const path of paths){
      try{const r=await fetch(encodeURI(path),{cache:'no-store'});if(r.ok)return await r.json()}catch{}
    }
    return null
  }

  async exists(path){
    const url=encodeURI(path);
    try{
      let r=await fetch(url,{method:'HEAD',cache:'no-store'});
      if(r.ok)return true;
      r=await fetch(url,{cache:'no-store'});
      return r.ok;
    }catch{return false}
  }

  probePath(kind,root){
    return kind==='core'
      ?`${root}/es/female/characters/char_a.mp3`
      :`${root}/es/female/lesson_intros/lesson_01_intro.mp3`;
  }

  async discoverRoot(kind){
    for(const root of this.rootCandidates[kind]){
      if(await this.exists(this.probePath(kind,root)))return root;
    }
    return null
  }

  async init(){
    // Best-effort discovery only. Playback also resolves assets lazily across every
    // supported generated-folder layout, so users never need to move audio files.
    this.coreRoot=await this.discoverRoot('core');
    this.courseRoot=await this.discoverRoot('course');

    if(this.coreRoot){
      this.coreIndex=await this.fetchJsonCandidates([
        `${this.coreRoot}/voice_index.json`,`${this.coreRoot}/index.json`,`${this.coreRoot}/manifest.json`
      ]);
    }
    if(this.courseRoot){
      this.courseIndex=await this.fetchJsonCandidates([
        `${this.courseRoot}/course_voice_index.json`,`${this.courseRoot}/voice_index.json`,`${this.courseRoot}/index.json`
      ]);
    }
    this.status.core=!!this.coreRoot;this.status.course=!!this.courseRoot;
    return this.status
  }

  coreCategory(id){
    if(/^char_[a-z0-9]$/.test(id))return 'characters';
    const m={
      familiarization_intro:'instructions',familiarization_short:'instructions',recognition_intro:'instructions',recognition_variable_speed:'instructions',recognition_say_before_answer:'instructions',marathon_intro:'instructions',groups_intro:'instructions',no_response_required:'instructions',less_visual_help:'instructions',
      begin_review:'context',new_characters:'context',letters:'context',numbers:'context',letters_numbers:'context',punctuation:'context',prosigns:'context',abbreviations:'context',callsigns:'context',prefixes:'context',rst:'context',words:'context',qso_fragments:'context',qso_complete:'context',custom_text:'context',groups_two:'context',groups_three:'context',groups_five:'context',
      speed_up:'difficulty',speed_down:'difficulty',less_response_time:'difficulty',more_response_time:'difficulty',longer_groups:'difficulty',challenge_round:'difficulty',easy_round:'difficulty',mixed_content:'difficulty',
      good_job_01:'coaching',good_job_02:'coaching',good_job_03:'coaching',relax_01:'coaching',relax_02:'coaching',whole_sound:'coaching',missed_character_01:'coaching',missed_character_02:'coaching',not_everything:'coaching',stay_flow:'coaching',trust_ear:'coaching',one_more_round:'coaching',
      prepare:'session',begin:'session',continue:'session',brief_pause:'session',pause_over:'session',last_round:'session',last_exercise:'session',one_minute_left:'session',section_complete:'session',session_almost_done:'session',
      lesson_welcome_generic:'course',lesson_new_characters_generic:'course',lesson_consolidation:'course',milestone_all_letters:'course',milestone_numbers_begin:'course',milestone_callsigns_begin:'course',milestone_operating_begin:'course',milestone_first_qso:'course',course_final_message:'course',
      session_complete_short:'outros',session_complete_general:'outros',signature:'outros',full_outro:'outros',daily_course_outro:'outros'
    };
    if(m[id])return m[id];
    if(/^lesson_\d\d_number$/.test(id))return 'course_lessons';
    if(/_(full|short)$/.test(id))return 'nomenclature';
    return null
  }

  courseCategory(id){
    if(/^lesson_\d\d_intro$/.test(id))return 'lesson_intros';
    if(/^lesson_\d\d_outro$/.test(id))return 'lesson_outros';
    if(id==='lesson_20_final_challenge')return 'lesson_special';
    if(/_explain$/.test(id))return 'operational_vocabulary';
    if(['alphabet_complete','alphanumeric_complete','first_callsign','first_complete_call','first_complete_qso','headcopy_transition'].includes(id))return 'course_milestones';
    if(/_intro$/.test(id)&&/^(100_|qso_head_copy|endless_head_copy)/.test(id))return 'bonus_intros';
    if(/_outro$/.test(id)&&/^(100_|qso_head_copy|endless_head_copy)/.test(id))return 'bonus_outros';
    if(/^headcopy_|^challenge_complete$/.test(id))return 'bonus_coaching';
    return null
  }

  directPath(kind,root,id,lang,gender){
    const cat=kind==='core'?this.coreCategory(id):this.courseCategory(id);
    return cat?`${root}/${lang}/${gender}/${cat}/${id}.mp3`:null
  }

  indexPath(kind,id,lang,gender){
    const root=kind==='core'?this.coreRoot:this.courseRoot;
    const index=kind==='core'?this.coreIndex:this.courseIndex;
    const rel=index?.[id]?.files?.[lang]?.[gender];
    return root&&rel?`${root}/${rel}`:null
  }

  candidateUrls(id,lang,gender){
    const out=[];
    const preferred=[['course',this.courseRoot],['core',this.coreRoot]];
    for(const [kind,root] of preferred){
      const p=this.indexPath(kind,id,lang,gender);if(p)out.push({kind,root,url:p});
      if(root){const d=this.directPath(kind,root,id,lang,gender);if(d)out.push({kind,root,url:d})}
    }
    // If discovery failed, try every known generated folder layout lazily.
    for(const kind of ['course','core'])for(const root of this.rootCandidates[kind]){
      const d=this.directPath(kind,root,id,lang,gender);if(d)out.push({kind,root,url:d});
    }
    const seen=new Set();return out.filter(x=>{const k=x.url;if(seen.has(k))return false;seen.add(k);return true});
  }

  async buffer(ctx,id,lang,gender){
    const key=`${lang}|${gender}|${id}`;if(this.cache.has(key))return this.cache.get(key);
    for(const c of this.candidateUrls(id,lang,gender)){
      try{
        const r=await fetch(encodeURI(c.url),{cache:'force-cache'});if(!r.ok)continue;
        const arr=await r.arrayBuffer();const b=await ctx.decodeAudioData(arr.slice(0));
        this.cache.set(key,b);
        if(c.kind==='core'&&!this.coreRoot)this.coreRoot=c.root;
        if(c.kind==='course'&&!this.courseRoot)this.courseRoot=c.root;
        return b;
      }catch{}
    }
    console.warn('Voice asset unavailable after trying all known pack layouts:',id);
    return null
  }

  async duration(id,lang,gender){
    const Ctx=window.AudioContext||window.webkitAudioContext,ctx=new Ctx();
    try{const b=await this.buffer(ctx,id,lang,gender);return b?.duration||0}finally{await ctx.close().catch(()=>{})}
  }

  async probe(lang='es',gender='female'){
    const Ctx=window.AudioContext||window.webkitAudioContext,ctx=new Ctx();
    try{
      const core=!!(await this.buffer(ctx,'char_a',lang,gender));
      const course=!!(await this.buffer(ctx,'lesson_01_intro',lang,gender));
      return {core,course,coreRoot:this.coreRoot,courseRoot:this.courseRoot};
    }finally{await ctx.close().catch(()=>{})}
  }
}
