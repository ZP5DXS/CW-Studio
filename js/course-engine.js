import {Timeline} from './timeline.js?v=12';
import {tokenDuration,wordDuration} from './morse-engine.js?v=12';

export const COURSE=[
[1,'HEAR',['T','E','A'],6,'Discover complete CW sounds'],
[2,'HEAR',['N','I','M'],6,'First deliberate recognition'],
[3,'HEAR',['S','O','R'],6,'Short groups and simple words'],
[4,'RECOGNIZE',['K','D','U'],7,'Cumulative recognition'],
[5,'RECOGNIZE',['G','W','H'],7,'Groups of two and three'],
[6,'RECOGNIZE',['L','P','F'],7,'Recognition without reconstruction'],
[7,'RECALL',['B','V','C'],8,'Less visual assistance'],
[8,'RECALL',['Y','X','J'],8,'Harder recognition and recovery'],
[9,'RECALL',['Q','Z'],8,'Complete A–Z'],
[10,'CONSOLIDATE',[],8,'Alphabet consolidation'],
[11,'EXPAND',['1','2','3'],9,'Introduce numbers'],
[12,'EXPAND',['4','5','6'],9,'Mix letters and numbers'],
[13,'EXPAND',['7','8','9','0'],9,'Complete A–Z and 0–9'],
[14,'REAL WORLD',[],9,'Real callsign recognition'],
[15,'UNDERSTAND',['CQ','DE','K'],10,'Making a call'],
[16,'UNDERSTAND',['R','RST','73'],10,'Signal reports'],
[17,'UNDERSTAND',['NAME','QTH','BT'],10,'Operator information'],
[18,'UNDERSTAND',['KN','AR','SK','TNX','FER','PSE','AGN','FB','GM','GA','GE'],11,'Control and close a QSO'],
[19,'COMMUNICATE',[],12,'Build a complete QSO'],
[20,'COPY',[],12,'Your First QSO']
].map(([lesson,phase,newItems,eff,focus])=>({lesson,phase,newItems,charWpm:15,effectiveWpm:Math.min(eff,15),focus}));

const T={
  afterFirstCw:.62,
  afterVoice:.34,
  betweenConfirmations:.18,
  beforeChime:.62,
  chimeDuration:.18,
  afterChime:.82,
  responseEarly:1.40,
  responseLater:1.12,
  revealTail:.25,
  narrationGap:.95
};

function learnedFor(n){
  let out='';
  for(const l of COURSE.filter(x=>x.lesson<=n)){
    for(const c of l.newItems)if(c.length===1&&!out.includes(c))out+=c;
  }
  return out;
}
function rng(seed){let h=2166136261;for(const ch of seed)h=Math.imul(h^ch.charCodeAt(0),16777619);return()=>((h=Math.imul(h^(h>>>13),2246822507))>>>0)/4294967296}
function pickChars(set,count,r){let s='';for(let i=0;i<count;i++)s+=set[Math.floor(r()*set.length)];return s}

async function addVoice(tl,t,voice,id,lang,gender,gap=T.narrationGap){
  const d=await voice.requireDuration(id,lang,gender);
  tl.add('voice',t,d,{id,required:true});
  return t+d+gap;
}

function addChime(tl,t){
  tl.add('check',t,T.chimeDuration,{label:'NEXT'});
  return t+T.chimeDuration+T.afterChime;
}
function addConfirmationCw(tl,t,text,wpm,eff,mode='confirmation'){
  const d=tokenDuration(text,wpm);
  tl.add('cw',t,d,{text,wpm,eff,mode});
  return t+d;
}

export function lessonVoicePlan(lesson){
  const specificIntro=`lesson_${String(lesson).padStart(2,'0')}_intro`;
  const specificOutro=`lesson_${String(lesson).padStart(2,'0')}_outro`;
  const plan={before:[],sections:[],after:[specificOutro]};

  // General course material is used where it was actually designed to be useful.
  if(lesson===1){
    plan.before.push('course_welcome','course_daily_guidance',specificIntro,'familiarization_intro');
    plan.sections.push({at:'recognition',ids:['recognition_intro']});
  }else{
    plan.before.push(specificIntro);
    if(lesson<=9)plan.sections.push({at:'before-familiarization',ids:['begin_review','new_characters','familiarization_short']});
  }

  if(lesson===6)plan.sections.push({at:'recognition',ids:['recognition_say_before_answer']});
  if(lesson===7)plan.sections.push({at:'recognition',ids:['less_visual_help']});
  if(lesson===10){
    plan.before.push('lesson_consolidation');
    plan.sections.push({at:'recognition',ids:['groups_intro']},{at:'marathon',ids:['marathon_intro']});
    plan.after.unshift('milestone_all_letters');
  }
  if(lesson===11)plan.before.push('milestone_numbers_begin','numbers','familiarization_short');
  if(lesson===12)plan.before.push('letters_numbers');
  if(lesson===14){
    plan.before.push('milestone_callsigns_begin','callsigns');
    plan.after.unshift('first_callsign');
  }
  if(lesson===15){
    plan.before.push('milestone_operating_begin');
    plan.sections.push({at:'concepts',ids:['cq_full','de_full','k_full']});
    plan.after.unshift('first_complete_call');
  }
  if(lesson===16)plan.sections.push({at:'concepts',ids:['r_full','rst_full','599_full','73_full']});
  if(lesson===17)plan.sections.push({at:'concepts',ids:['name_full','qth_full','bt_full']});
  if(lesson===18)plan.sections.push({at:'concepts',ids:[
    'kn_full','ar_full','sk_full',
    'tnx_explain','fer_explain','pse_explain','agn_explain','fb_explain',
    'gm_explain','ga_explain','ge_explain'
  ]});
  if(lesson===19){
    plan.before.push('qso_fragments');
    plan.after.unshift('first_complete_qso');
  }
  if(lesson===20){
    plan.before.push('qso_complete');
    plan.sections.push({at:'challenge',ids:['lesson_20_final_challenge','headcopy_transition']});
    plan.after.unshift('course_final_message');
  }
  return plan;
}

export function requiredLessonVoiceIds(lesson){
  const p=lessonVoicePlan(lesson),ids=[...p.before,...p.after];
  for(const s of p.sections)ids.push(...s.ids);
  const cfg=COURSE.find(x=>x.lesson===lesson);
  if(lesson<=13)for(const c of learnedFor(lesson))ids.push(`char_${String(c).toLowerCase()}`);
  return [...new Set(ids)];
}

async function addSectionAudio(tl,t,plan,at,voice,lang,gender){
  for(const section of plan.sections.filter(s=>s.at===at)){
    for(const id of section.ids)t=await addVoice(tl,t,voice,id,lang,gender,.85);
  }
  return t;
}

export async function buildLesson(lesson,{lang='es',gender='female',voice,onStatus=()=>{}}={}){
  const cfg=COURSE.find(x=>x.lesson===lesson);
  if(!cfg)throw new Error(`Unknown lesson ${lesson}`);

  const required=requiredLessonVoiceIds(lesson);
  const check=await voice.preflight(required,lang,gender,onStatus);
  if(!check.ok){
    const detail=check.missing.map(x=>`${x.id} → ${x.url}`).join(' | ');
    throw new Error(`Required lesson audio missing: ${detail}`);
  }

  const tl=new Timeline({kind:'course',lesson,title:`Learn CW · Lesson ${String(lesson).padStart(2,'0')}`,cfg});
  const plan=lessonVoicePlan(lesson);
  let t=0;

  tl.add('title',t,4,{title:`LESSON ${String(lesson).padStart(2,'0')}`,subtitle:cfg.newItems.length?cfg.newItems.join(' · '):cfg.focus});
  t+=4.4;

  for(const id of plan.before)t=await addVoice(tl,t,voice,id,lang,gender,1.0);

  const r=rng(`course-${lesson}`);
  const learned=learnedFor(lesson)||'TEA';
  const wpm=cfg.charWpm;

  t=await addSectionAudio(tl,t,plan,'before-familiarization',voice,lang,gender);

  if(lesson<=13&&cfg.newItems.length){
    for(const c of cfg.newItems){
      const d=tokenDuration(c,wpm),id=`char_${String(c).toLowerCase()}`;
      tl.add('cw',t,d,{text:c,wpm,eff:cfg.effectiveWpm,mode:'familiarization',mnemonic:true});
      t+=d+T.afterFirstCw;

      const vd=await voice.requireDuration(id,lang,gender);
      tl.add('reveal',t,vd+T.revealTail,{text:c,mnemonic:true});
      tl.add('charVoice',t,vd,{char:c});
      t+=vd+T.afterVoice;

      t=addConfirmationCw(tl,t,c,wpm,cfg.effectiveWpm,'familiarization-confirmation');
      t+=T.beforeChime;
      t=addChime(tl,t);
    }
  }

  t=await addSectionAudio(tl,t,plan,'recognition',voice,lang,gender);

  const rounds=lesson<10?30:lesson<14?36:24;
  for(let i=0;i<rounds;i++){
    const text=lesson>=14
      ?pickChars(learned,lesson===14?5:Math.min(5,2+Math.floor(r()*4)),r)
      :learned[Math.floor(r()*learned.length)];

    const dur=wordDuration(text,wpm,cfg.effectiveWpm);
    tl.add('cw',t,dur,{text,wpm,eff:cfg.effectiveWpm,mode:'recognition'});
    t+=dur+(lesson<7?T.responseEarly:T.responseLater);

    if(lesson<=13&&text.length===1){
      const id=`char_${String(text).toLowerCase()}`;
      const vd=await voice.requireDuration(id,lang,gender);
      tl.add('reveal',t,vd+T.revealTail,{text});
      tl.add('charVoice',t,vd,{char:text});
      t+=vd+T.afterVoice;
      t=addConfirmationCw(tl,t,text,wpm,cfg.effectiveWpm);
    }else{
      tl.add('reveal',t,.92,{text});
      t+=1.02;
    }

    t+=T.beforeChime;
    t=addChime(tl,t);
  }

  if(lesson===10)t=await addSectionAudio(tl,t,plan,'marathon',voice,lang,gender);

  if(lesson>=15){
    t=await addSectionAudio(tl,t,plan,'concepts',voice,lang,gender);
    const samples={
      15:'CQ CQ DE ZP5DXS ZP5DXS K',
      16:'R UR RST 579 579 73',
      17:'NAME MATT BT QTH ASUNCION',
      18:'TNX FER QSO 73 SK',
      19:'CQ CQ DE ZP5DXS ZP5DXS K',
      20:'CQ CQ DE ZP5DXS ZP5DXS K'
    };
    const q=samples[lesson];
    for(let i=0;i<(lesson>=19?3:2);i++){
      const d=wordDuration(q,wpm,cfg.effectiveWpm);
      tl.add('cw',t,d,{text:q,wpm,eff:cfg.effectiveWpm,mode:lesson===20?'headcopy':'sequence'});
      t+=d+(lesson===20?3:2);
      tl.add('reveal',t,2,{text:q});
      t+=2.15+T.beforeChime;
      t=addChime(tl,t);
    }
  }

  if(lesson===20)t=await addSectionAudio(tl,t,plan,'challenge',voice,lang,gender);

  for(const id of plan.after)t=await addVoice(tl,t,voice,id,lang,gender,.9);

  tl.add('outro',t,5,{title:'LESSON COMPLETE'});
  t+=5;
  tl.duration=t;
  return tl.sort();
}
