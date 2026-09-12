// CW Studio v0.5 - resilient, non-blocking voice resolver.
// The UI never waits for directory probing. Audio is resolved lazily when needed,
// and the first successful root is remembered for the rest of the session.
export class VoiceEngine{
  constructor(){
    this.cache=new Map();
    this.coreIndex=null;this.courseIndex=null;
    this.coreRoot=null;this.courseRoot=null;
    this.decodeCtx=null;
    this.rootCandidates={
      core:[
        'assets/voices/core',
        'assets/voices/core/morse_practice_voicepack',
        'assets/voices/core/morse-practice-voicepack',
        'assets/voices/core/practice_voice_pack',
        'assets/voices/core/practice-voice-pack',
        'assets/voices/core/practice voice pack',
        'assets/voices/morse_practice_voicepack',
        'assets/voices/morse-practice-voicepack',
        'assets/voices/practice_voice_pack',
        'assets/voices/practice-voice-pack',
        'assets/voices/practice voice pack',
        'assets/voices/Morse Practice Voice Pack',
        'assets/voices/Practice Voice Pack',
        'assets/voices'
      ],
      course:[
        'assets/voices/course',
        'assets/voices/course/morse_practice_course_voicepack',
        'assets/voices/course/morse-practice-course-voicepack',
        'assets/voices/course/course_voice_pack',
        'assets/voices/course/course-voice-pack',
        'assets/voices/course/course voice pack',
        'assets/voices/morse_practice_course_voicepack',
        'assets/voices/morse-practice-course-voicepack',
        'assets/voices/course_voice_pack',
        'assets/voices/course-voice-pack',
        'assets/voices/course voice pack',
        'assets/voices/Morse Practice Course Voice Pack',
        'assets/voices/Course Voice Pack',
        'assets/voices'
      ]
    };
  }

  async init(){
    // Intentionally non-blocking. Indexes are optional and are loaded in the background.
    this.loadIndexesInBackground();
    return {core:true,course:true};
  }

  async loadIndexesInBackground(){
    const jobs=[];
    for(const root of this.rootCandidates.core){
      jobs.push(this.tryJson(`${root}/voice_index.json`).then(j=>{if(j&&!this.coreIndex){this.coreIndex=j;this.coreRoot=this.coreRoot||root}}));
    }
    for(const root of this.rootCandidates.course){
      jobs.push(this.tryJson(`${root}/course_voice_index.json`).then(j=>{if(j&&!this.courseIndex){this.courseIndex=j;this.courseRoot=this.courseRoot||root}}));
    }
    Promise.allSettled(jobs).catch(()=>{});
  }

  async tryJson(path){
    try{const r=await fetch(encodeURI(path),{cache:'no-store'});return r.ok?await r.json():null}catch{return null}
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
    return null;
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
    return null;
  }

  directPath(kind,root,id,lang,gender){
    const cat=kind==='core'?this.coreCategory(id):this.courseCategory(id);
    return cat?`${root}/${lang}/${gender}/${cat}/${id}.mp3`:null;
  }

  indexPath(kind,root,id,lang,gender){
    const index=kind==='core'?this.coreIndex:this.courseIndex;
    const rel=index?.[id]?.files?.[lang]?.[gender];
    return rel?`${root}/${rel}`:null;
  }

  candidateUrls(id,lang,gender){
    const out=[];
    const push=(kind,root,url)=>{if(url)out.push({kind,root,url})};
    // Remembered successful roots always win.
    if(this.courseRoot){push('course',this.courseRoot,this.indexPath('course',this.courseRoot,id,lang,gender));push('course',this.courseRoot,this.directPath('course',this.courseRoot,id,lang,gender));}
    if(this.coreRoot){push('core',this.coreRoot,this.indexPath('core',this.coreRoot,id,lang,gender));push('core',this.coreRoot,this.directPath('core',this.coreRoot,id,lang,gender));}
    // Then all supported layouts. Course first because lesson narration is course-specific.
    for(const kind of ['course','core'])for(const root of this.rootCandidates[kind]){
      push(kind,root,this.indexPath(kind,root,id,lang,gender));
      push(kind,root,this.directPath(kind,root,id,lang,gender));
    }
    const seen=new Set();return out.filter(x=>!seen.has(x.url)&&seen.add(x.url));
  }

  async ensureDecodeCtx(){
    if(!this.decodeCtx||this.decodeCtx.state==='closed'){
      const Ctx=window.AudioContext||window.webkitAudioContext;this.decodeCtx=new Ctx();
    }
    return this.decodeCtx;
  }

  async fetchDecode(url,ctx){
    const r=await fetch(encodeURI(url),{cache:'force-cache'});if(!r.ok)throw new Error(String(r.status));
    const arr=await r.arrayBuffer();return await ctx.decodeAudioData(arr.slice(0));
  }

  async buffer(ctx,id,lang,gender){
    const key=`${lang}|${gender}|${id}`;if(this.cache.has(key))return this.cache.get(key);
    const candidates=this.candidateUrls(id,lang,gender);
    for(const c of candidates){
      try{
        const b=await this.fetchDecode(c.url,ctx);
        this.cache.set(key,b);
        if(c.kind==='core')this.coreRoot=c.root;else this.courseRoot=c.root;
        return b;
      }catch{}
    }
    console.warn('CW Studio voice asset not found:',id,candidates.map(x=>x.url));
    return null;
  }

  async duration(id,lang,gender){
    const ctx=await this.ensureDecodeCtx();const b=await this.buffer(ctx,id,lang,gender);return b?.duration||0;
  }

  roots(){return {core:this.coreRoot,course:this.courseRoot}}
}
