import {Timeline} from './timeline.js?v=36';
import {tokenDuration,wordDuration} from './morse-engine.js?v=36';

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
[14,'REAL WORLD',[],9,'Callsign recognition'],
[15,'UNDERSTAND',['CQ','DE','K'],10,'Making a call'],
[16,'UNDERSTAND',['R','RST','73'],10,'Signal reports'],
[17,'UNDERSTAND',['NAME','QTH','BT'],10,'Operator information'],
[18,'UNDERSTAND',['KN','AR','SK','TNX','FER','PSE','AGN','FB','GM','GA','GE'],11,'Control and close a QSO'],
[19,'COMMUNICATE',[],12,'Build a complete QSO'],
[20,'COPY',[],12,'Your First QSO']
].map(([lesson,phase,newItems,eff,focus])=>({lesson,phase,newItems,charWpm:15,effectiveWpm:Math.min(eff,15),focus}));

const FOCUS_ES={
1:'Primeros sonidos CW',2:'Primer reconocimiento deliberado',3:'Grupos cortos y palabras simples',
4:'Reconocimiento acumulativo',5:'Grupos de dos y tres',6:'Reconocer sin reconstruir',
7:'Menos ayuda visual',8:'Reconocimiento difícil y recuperación',9:'Alfabeto A–Z completo',
10:'Consolidación del alfabeto',11:'Introducción a los números',12:'Mezclar letras y números',
13:'Conjunto A–Z y 0–9 completo',14:'Reconocimiento de indicativos',15:'Realizar una llamada',
16:'Reportes de señal',17:'Información del operador',18:'Control y cierre de un QSO',
19:'Construir un QSO completo',20:'Tu primer QSO'
};
export function courseFocus(lesson,lang='en'){
  const cfg=COURSE.find(x=>x.lesson===lesson);
  return lang==='es'?(FOCUS_ES[lesson]||cfg?.focus||''):(cfg?.focus||'');
}

const T={
  afterFirstCw:.62, afterVoice:.34, beforeChime:.62, chimeDuration:.18, afterChime:.82,
  responseEarly:1.40, responseLater:1.12, revealTail:.25, narrationGap:.95
};

const REAL_CALLSIGNS=[
'W1AW','K1JT','N0AX','K3LR','W3LPL','N6RO','K5ZD','K9CT','N2IC','G3TXQ','G4FON','F6HKA',
'DL6RAI','DJ5MW','EA8RM','CT1BOH','OH2BH','SM5IMO','LA8OM','PA3AAV','ON4UN','HB9CVQ',
'IK0YVV','S51WO','OK1RR','OM2VL','HA8BE','LZ9W','VE3EJ','VE7CC','LU5FC','CX6VM','PY2NY',
'ZP5DXS','CE2LR','YV5JBI','XE2X','KP4AA','JA1NUT','JH4UYB','VK6LW','ZL3X'
];

const NAMES=['MATT','ANA','JOHN','LUIS','CARLOS','MARIA','JACK','PETER'];
const QTHS=['ASUNCION','LONDON','MADRID','MIAMI','TOKYO','BERLIN','LIMA','MONTEVIDEO'];

function learnedFor(n){
  let out='';
  for(const l of COURSE.filter(x=>x.lesson<=n)){
    for(const c of l.newItems)if(c.length===1&&!out.includes(c))out+=c;
  }
  return out;
}
function priorLearnedFor(n){return learnedFor(Math.max(0,n-1))}
function rng(seed){let h=2166136261;for(const ch of seed)h=Math.imul(h^ch.charCodeAt(0),16777619);return()=>((h=Math.imul(h^(h>>>13),2246822507))>>>0)/4294967296}
function shuffle(arr,r){const a=[...arr];for(let i=a.length-1;i>0;i--){const j=Math.floor(r()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a}
function pick(set,r){return set[Math.floor(r()*set.length)]}
function pickChars(set,count,r){let s='';for(let i=0;i<count;i++)s+=set[Math.floor(r()*set.length)];return s}

function voiceCard(id,tl,lang){
  const es=lang==='es', cfg=tl.meta?.cfg||{}, lesson=tl.meta?.lesson||1;
  const lessonNo=String(lesson).padStart(2,'0'), fresh=(cfg.newItems||[]).join(' · '), focus=courseFocus(lesson,lang);
  const cards={
    course_welcome:[es?'LEARN CW':'LEARN CW',es?'Aprende por el sonido, no por puntos y rayas.':'Learn by sound, not dots and dashes.','course'],
    course_daily_guidance:[es?'UNA SESIÓN A LA VEZ':'ONE SESSION AT A TIME',es?'Breve, enfocada y constante.':'Short, focused and consistent.','clock'],
    familiarization_intro:[es?'FAMILIARIZACIÓN':'FAMILIARIZATION',es?'Escucha → mira → nómbralo → escucha otra vez':'Hear → see → name it → hear it again','familiarization'],
    familiarization_short:[es?'FAMILIARIZACIÓN':'FAMILIARIZATION',es?'Escucha el carácter completo.':'Hear the complete character.','familiarization'],
    recognition_intro:[es?'RECONOCIMIENTO':'RECOGNITION',es?'Escucha primero. Responde antes de la voz.':'Hear it first. Answer before the voice.','recognition'],
    recognition_say_before_answer:[es?'RESPONDE PRIMERO':'ANSWER FIRST',es?'Di el carácter antes de escuchar la respuesta.':'Say the character before hearing the answer.','recognition'],
    less_visual_help:[es?'MENOS AYUDA VISUAL':'LESS VISUAL HELP',es?'Confía cada vez más en tu oído.':'Trust your ear more and more.','focus'],
    begin_review:[es?'REPASO':'REVIEW',es?'Primero activamos lo que ya conoces.':'First we reactivate what you already know.','review'],
    new_characters:[es?'NUEVOS SONIDOS':'NEW SOUNDS',fresh||focus,'new'],
    groups_intro:[es?'GRUPOS':'GROUPS',es?'Escucha la secuencia completa.':'Hear the complete sequence.','groups'],
    marathon_intro:[es?'ESCUCHA CONTINUA':'CONTINUOUS LISTENING',es?'Mantén el flujo y deja pasar los errores.':'Stay with the flow and let mistakes go.','flow'],
    no_response_required:[es?'SOLO ESCUCHA':'JUST LISTEN',es?'No necesitas responder durante esta parte.':'No response is required during this part.','flow'],
    numbers:[es?'NÚMEROS':'NUMBERS',es?'El mismo principio: sonido completo.':'Same principle: one complete sound.','numbers'],
    letters_numbers:[es?'LETRAS + NÚMEROS':'LETTERS + NUMBERS',es?'Ahora empezamos a mezclarlos.':'Now we begin mixing them.','mix'],
    callsigns:[es?'INDICATIVOS':'CALLSIGNS',es?'Escucha y retén la unidad completa.':'Hear and retain the complete unit.','callsign'],
    qso_fragments:[es?'CONSTRUYENDO UN QSO':'BUILDING A QSO',es?'Llamada · reporte · información · cierre':'Call · report · information · close','qso'],
    qso_complete:[es?'QSO COMPLETO':'COMPLETE QSO',es?'Ahora escucha el intercambio como una conversación.':'Now hear the exchange as a conversation.','qso'],
    lesson_consolidation:[es?'CONSOLIDAR':'CONSOLIDATE',es?'Nada nuevo. Hacemos más fuerte lo aprendido.':'Nothing new. We strengthen what you know.','review'],
    milestone_all_letters:[es?'A–Z COMPLETO':'A–Z COMPLETE',es?'Ya conoces todas las letras.':'You now know every letter.','milestone'],
    milestone_numbers_begin:[es?'NUEVA ETAPA':'NEW STAGE',es?'Comenzamos con números.':'We begin with numbers.','milestone'],
    milestone_callsigns_begin:[es?'RADIO REAL':'REAL RADIO',es?'Empezamos a escuchar indicativos completos.':'We begin hearing complete callsigns.','milestone'],
    milestone_operating_begin:[es?'OPERACIÓN CW':'CW OPERATING',es?'Los sonidos empiezan a convertirse en comunicación.':'Sounds begin turning into communication.','milestone'],
    first_callsign:[es?'PRIMER INDICATIVO':'FIRST CALLSIGN',es?'Acabas de reconocer un indicativo completo.':'You just recognized a complete callsign.','milestone'],
    first_complete_call:[es?'PRIMERA LLAMADA COMPLETA':'FIRST COMPLETE CALL',es?'Ya puedes reconocer la estructura.':'You can recognize the structure.','milestone'],
    first_complete_qso:[es?'QSO COMPLETO':'COMPLETE QSO',es?'Ya seguiste la estructura completa.':'You followed the complete structure.','milestone'],
    headcopy_transition:[es?'HEAD COPY':'HEAD COPY',es?'Escucha ideas y datos, no caracteres aislados.':'Hear ideas and data, not isolated characters.','headcopy'],
    course_final_message:[es?'YA ESTÁS ESCUCHANDO CW':'YOU ARE LISTENING TO CW',es?'Ahora empieza la parte divertida: usarlo en el aire.':'Now the fun part begins: use it on the air.','finish']
  };
  if(/^lesson_\d\d_intro$/.test(id))return {title:`${es?'LECCIÓN':'LESSON'} ${lessonNo}`,subtitle:fresh?`${fresh} · ${focus}`:focus,graphic:'lesson'};
  if(/^lesson_\d\d_outro$/.test(id))return {title:es?'LECCIÓN COMPLETADA':'LESSON COMPLETE',subtitle:focus,graphic:'finish'};
  if(/_full$/.test(id)||/_explain$/.test(id)){
    const concept=id.replace(/_(full|explain)$/,'').toUpperCase();
    return {title:concept,subtitle:es?'Significado y uso en CW':'Meaning and use in CW',graphic:'concept'};
  }
  const v=cards[id];
  return v?{title:v[0],subtitle:v[1],graphic:v[2]}:{title:'MORSE PRACTICE',subtitle:es?'Instrucción guiada':'Guided instruction',graphic:'voice'};
}

async function addVoice(tl,t,voice,id,lang,gender,gap=T.narrationGap){
  const d=await voice.requireDuration(id,lang,gender);
  tl.add('voice',t,d,{id,required:true,visual:voiceCard(id,tl,lang)});
  return t+d+gap;
}
function addChime(tl,t){
  tl.add('check',t,T.chimeDuration,{label:'NEXT'});
  return t+T.chimeDuration+T.afterChime;
}
function addNeutral(tl,t,d=.35){tl.add('neutral',t,d,{});return t+d}
function addCw(tl,t,text,wpm,eff,mode='recognition',tone=null){
  const d=wordDuration(String(text),wpm,eff);
  tl.add('cw',t,d,{text:String(text),wpm,eff,mode,...(tone?{tone}:{})});
  return t+d;
}
async function addSpokenCharacterAnswer(tl,t,voice,char,lang,gender,wpm,eff,{confirmation=true}={}){
  const id=`char_${String(char).toLowerCase()}`;
  const vd=await voice.requireDuration(id,lang,gender);
  tl.add('reveal',t,Math.max(.9,vd+T.revealTail),{text:char,lang,mnemonic:false});
  tl.add('charVoice',t,vd,{char});
  t+=vd+T.afterVoice;
  if(confirmation)t=addCw(tl,t,char,wpm,eff,'confirmation');
  t+=T.beforeChime;
  return addChime(tl,t);
}
async function addRecognitionItem(tl,t,voice,text,lang,gender,wpm,eff,response=1.25,{speakSingle=true,confirmSingle=true,show=1.0,mode='recognition'}={}){
  t=addCw(tl,t,text,wpm,eff,mode);
  t+=response;
  if(speakSingle && String(text).length===1 && /[A-Z0-9]/.test(String(text))){
    return addSpokenCharacterAnswer(tl,t,voice,String(text),lang,gender,wpm,eff,{confirmation:confirmSingle});
  }
  tl.add('reveal',t,show,{text:String(text),lang});
  t+=show+.15;
  t+=T.beforeChime;
  return addChime(tl,t);
}
async function addFamiliarization(tl,t,voice,items,lang,gender,wpm,eff){
  for(const c of items){
    const d=tokenDuration(c,wpm),id=`char_${String(c).toLowerCase()}`;
    const vd=await voice.requireDuration(id,lang,gender);
    const start=t,voiceAt=start+d+T.afterFirstCw,mnemonicEnd=voiceAt+vd+.42;
    tl.add('mnemonic',start,mnemonicEnd-start,{text:c,lang});
    tl.add('cw',start,d,{text:c,wpm,eff,mode:'familiarization'});
    t=voiceAt;
    tl.add('charVoice',t,vd,{char:c});
    t+=vd+.42;
    t=addCw(tl,t,c,wpm,eff,'familiarization-confirmation');
    t=addNeutral(tl,t,.22);
    t+=T.beforeChime;
    t=addChime(tl,t);
  }
  return t;
}

async function addReview(tl,t,voice,pool,lang,gender,wpm,eff,r,count=9){
  const arr=shuffle([...pool],r);
  for(let i=0;i<count;i++){
    const c=arr[i%arr.length];
    t=await addRecognitionItem(tl,t,voice,c,lang,gender,wpm,eff,1.05,{speakSingle:true,confirmSingle:false,show:.85,mode:'review'});
  }
  return t;
}
async function addSingleRecognition(tl,t,voice,pool,lang,gender,wpm,eff,r,count=24,response=1.25){
  for(let i=0;i<count;i++){
    const c=pick(pool,r);
    t=await addRecognitionItem(tl,t,voice,c,lang,gender,wpm,eff,response,{speakSingle:true,confirmSingle:true,show:.9});
  }
  return t;
}
async function addGroups(tl,t,pool,lang,wpm,eff,r,count=14,minLen=2,maxLen=3,mode='groups'){
  for(let i=0;i<count;i++){
    const len=minLen+Math.floor(r()*(maxLen-minLen+1));
    const text=pickChars(pool,len,r);
    t=addCw(tl,t,text,wpm,eff,mode);
    t+=1.65;
    tl.add('reveal',t,1.1,{text,lang});
    t+=1.25+T.beforeChime;
    t=addChime(tl,t);
  }
  return t;
}
async function addMarathon(tl,t,pool,wpm,eff,r,count=22){
  for(let i=0;i<count;i++){
    const len=2+Math.floor(r()*3);
    const text=pickChars(pool,len,r);
    t=addCw(tl,t,text,wpm,eff,'marathon');
    t+=.42;
  }
  return t;
}
async function addTextPractice(tl,t,items,lang,wpm,eff,{response=2.0,reveal=1.6,repetitions=1,mode='sequence'}={}){
  for(let rep=0;rep<repetitions;rep++){
    for(const text of items){
      t=addCw(tl,t,text,wpm,eff,mode);
      t+=response;
      tl.add('reveal',t,reveal,{text,lang});
      t+=reveal+.15+T.beforeChime;
      t=addChime(tl,t);
    }
  }
  return t;
}

function specificIntro(n){return `lesson_${String(n).padStart(2,'0')}_intro`}
function specificOutro(n){return `lesson_${String(n).padStart(2,'0')}_outro`}

export function requiredLessonVoiceIds(lesson){
  const ids=[specificIntro(lesson),specificOutro(lesson)];
  if(lesson===1)ids.push('course_welcome','course_daily_guidance','familiarization_intro','recognition_intro');
  if(lesson>=2&&lesson<=9)ids.push('begin_review','new_characters','familiarization_short');
  if(lesson>=3&&lesson<=13)ids.push('groups_intro');
  if(lesson===6)ids.push('recognition_say_before_answer');
  if(lesson===7)ids.push('less_visual_help');
  if(lesson===10)ids.push('lesson_consolidation','groups_intro','marathon_intro','no_response_required','milestone_all_letters');
  if(lesson===11)ids.push('milestone_numbers_begin','numbers','familiarization_short');
  if(lesson===12)ids.push('begin_review','new_characters','familiarization_short','letters_numbers');
  if(lesson===13)ids.push('begin_review','new_characters','familiarization_short');
  if(lesson===14)ids.push('milestone_callsigns_begin','callsigns','first_callsign');
  if(lesson===15)ids.push('milestone_operating_begin','cq_full','de_full','k_full','first_complete_call');
  if(lesson===16)ids.push('r_full','rst_full','599_full','73_full');
  if(lesson===17)ids.push('name_full','qth_full','bt_full');
  if(lesson===18)ids.push('kn_full','ar_full','sk_full','tnx_explain','fer_explain','pse_explain','agn_explain','fb_explain','gm_explain','ga_explain','ge_explain');
  if(lesson===19)ids.push('qso_fragments','first_complete_qso');
  if(lesson===20)ids.push('qso_complete','lesson_20_final_challenge','headcopy_transition','course_final_message');

  if(lesson<=13){
    for(const c of learnedFor(lesson))ids.push(`char_${String(c).toLowerCase()}`);
  }
  return [...new Set(ids)];
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
  const r=rng(`course-${lesson}`);
  const wpm=cfg.charWpm, eff=cfg.effectiveWpm;
  let t=0;

  tl.add('title',t,4,{
    title:`${lang==='es'?'LECCIÓN':'LESSON'} ${String(lesson).padStart(2,'0')}`,
    subtitle:cfg.newItems.length?cfg.newItems.join(' · '):courseFocus(lesson,lang),
    blankVisual:true
  });
  t+=4.4;

  // ---- Common lesson intro ----
  if(lesson===1){
    t=await addVoice(tl,t,voice,'course_welcome',lang,gender,1.0);
    t=await addVoice(tl,t,voice,'course_daily_guidance',lang,gender,1.0);
  }
  t=await addVoice(tl,t,voice,specificIntro(lesson),lang,gender,1.0);

  // ---- Lessons 1–9: progressive alphabet ----
  if(lesson===1){
    t=await addVoice(tl,t,voice,'familiarization_intro',lang,gender,.9);
    t=await addFamiliarization(tl,t,voice,cfg.newItems,lang,gender,wpm,eff);
    t=addNeutral(tl,t,.55);
    t=await addVoice(tl,t,voice,'recognition_intro',lang,gender,.85);
    t=await addSingleRecognition(tl,t,voice,learnedFor(1),lang,gender,wpm,eff,r,24,1.4);
  }
  else if(lesson>=2&&lesson<=9){
    // The narration "Comenzaremos con un breve repaso" now has an actual review immediately after it.
    t=await addVoice(tl,t,voice,'begin_review',lang,gender,.65);
    t=await addReview(tl,t,voice,priorLearnedFor(lesson),lang,gender,wpm,eff,r,Math.min(10,Math.max(6,priorLearnedFor(lesson).length)));
    t=addNeutral(tl,t,.45);

    t=await addVoice(tl,t,voice,'new_characters',lang,gender,.55);
    t=await addVoice(tl,t,voice,'familiarization_short',lang,gender,.65);
    t=await addFamiliarization(tl,t,voice,cfg.newItems,lang,gender,wpm,eff);
    t=addNeutral(tl,t,.55);

    if(lesson===6)t=await addVoice(tl,t,voice,'recognition_say_before_answer',lang,gender,.6);
    if(lesson===7)t=await addVoice(tl,t,voice,'less_visual_help',lang,gender,.6);

    const rounds=lesson<=5?28:lesson<=7?30:32;
    t=await addSingleRecognition(tl,t,voice,learnedFor(lesson),lang,gender,wpm,eff,r,rounds,lesson<7?1.35:1.15);

    // Lessons 3–9 actually practice the grouped material promised by their curriculum.
    if(lesson>=3){
      t=addNeutral(tl,t,.45);
      t=await addVoice(tl,t,voice,'groups_intro',lang,gender,.65);
      t=await addGroups(tl,t,learnedFor(lesson),lang,wpm,eff,r,lesson<5?8:12,2,lesson>=5?3:2);
    }
  }

  // ---- Lesson 10: alphabet consolidation ----
  if(lesson===10){
    t=await addVoice(tl,t,voice,'lesson_consolidation',lang,gender,.75);
    t=await addSingleRecognition(tl,t,voice,learnedFor(10),lang,gender,wpm,eff,r,24,1.05);
    t=addNeutral(tl,t,.45);
    t=await addVoice(tl,t,voice,'groups_intro',lang,gender,.6);
    t=await addGroups(tl,t,learnedFor(10),lang,wpm,eff,r,18,2,4);
    t=addNeutral(tl,t,.45);
    t=await addVoice(tl,t,voice,'marathon_intro',lang,gender,.5);
    t=await addVoice(tl,t,voice,'no_response_required',lang,gender,.45);
    t=await addMarathon(tl,t,learnedFor(10),wpm,eff,r,26);
    t=await addVoice(tl,t,voice,'milestone_all_letters',lang,gender,.75);
  }

  // ---- Lessons 11–13: numbers mixed with letters ----
  if(lesson>=11&&lesson<=13){
    if(lesson===11){
      t=await addVoice(tl,t,voice,'milestone_numbers_begin',lang,gender,.6);
      t=await addVoice(tl,t,voice,'numbers',lang,gender,.5);
      t=await addVoice(tl,t,voice,'familiarization_short',lang,gender,.55);
    }else{
      t=await addVoice(tl,t,voice,'begin_review',lang,gender,.55);
      const priorNums=[...priorLearnedFor(lesson)].filter(x=>/[0-9]/.test(x));
      const reviewPool=priorNums.length?priorNums:[...priorLearnedFor(lesson)];
      t=await addReview(tl,t,voice,reviewPool,lang,gender,wpm,eff,r,Math.max(6,reviewPool.length*2));
      t=addNeutral(tl,t,.4);
      if(lesson===12)t=await addVoice(tl,t,voice,'letters_numbers',lang,gender,.5);
      t=await addVoice(tl,t,voice,'new_characters',lang,gender,.5);
      t=await addVoice(tl,t,voice,'familiarization_short',lang,gender,.55);
    }

    t=await addFamiliarization(tl,t,voice,cfg.newItems,lang,gender,wpm,eff);
    t=addNeutral(tl,t,.55);

    const all=learnedFor(lesson);
    const nums=[...all].filter(x=>/[0-9]/.test(x));
    const letters=[...all].filter(x=>/[A-Z]/.test(x));
    const weighted=[...letters,...nums,...nums,...nums];
    t=await addSingleRecognition(tl,t,voice,weighted.join(''),lang,gender,wpm,eff,r,34,1.1);

    t=addNeutral(tl,t,.4);
    t=await addVoice(tl,t,voice,'groups_intro',lang,gender,.55);
    t=await addGroups(tl,t,all,lang,wpm,eff,r,14,2,4);
  }

  // ---- Lesson 14: real callsigns, not random fake strings ----
  if(lesson===14){
    t=await addVoice(tl,t,voice,'milestone_callsigns_begin',lang,gender,.6);
    t=await addVoice(tl,t,voice,'callsigns',lang,gender,.65);
    const calls=shuffle(REAL_CALLSIGNS,r).slice(0,24);
    for(let i=0;i<calls.length;i++){
      t=addCw(tl,t,calls[i],wpm,eff,'callsign');
      t+=2.25;
      tl.add('reveal',t,1.35,{text:calls[i],lang});
      t+=1.5+T.beforeChime;
      t=addChime(tl,t);
      if(i===0)t=await addVoice(tl,t,voice,'first_callsign',lang,gender,.55);
    }
  }

  // ---- Lesson 15: CQ / DE / K and complete general calls ----
  if(lesson===15){
    t=await addVoice(tl,t,voice,'milestone_operating_begin',lang,gender,.65);
    for(const id of ['cq_full','de_full','k_full'])t=await addVoice(tl,t,voice,id,lang,gender,.65);
    const calls=shuffle(REAL_CALLSIGNS,r).slice(0,8).map(c=>`CQ CQ DE ${c} ${c} K`);
    t=await addTextPractice(tl,t,calls,lang,wpm,eff,{response:2.0,reveal:1.7,mode:'sequence'});
    t=await addVoice(tl,t,voice,'first_complete_call',lang,gender,.7);
  }

  // ---- Lesson 16: signal reports ----
  if(lesson===16){
    for(const id of ['r_full','rst_full','599_full','73_full'])t=await addVoice(tl,t,voice,id,lang,gender,.65);
    const reps=['R UR RST 599 599','R UR RST 579 579','UR RST 559 559','RST 589 589 73','R 599 TNX 73'];
    t=await addTextPractice(tl,t,reps,lang,wpm,eff,{response:2.0,reveal:1.6,repetitions:2,mode:'sequence'});
  }

  // ---- Lesson 17: NAME / QTH / BT ----
  if(lesson===17){
    for(const id of ['name_full','qth_full','bt_full'])t=await addVoice(tl,t,voice,id,lang,gender,.65);
    const items=[];
    for(let i=0;i<8;i++)items.push(`NAME ${pick(NAMES,r)} BT QTH ${pick(QTHS,r)}`);
    t=await addTextPractice(tl,t,items,lang,wpm,eff,{response:2.2,reveal:1.8,mode:'sequence'});
  }

  // ---- Lesson 18: QSO control and common abbreviations ----
  if(lesson===18){
    const ids=['kn_full','ar_full','sk_full','tnx_explain','fer_explain','pse_explain','agn_explain','fb_explain','gm_explain','ga_explain','ge_explain'];
    for(const id of ids)t=await addVoice(tl,t,voice,id,lang,gender,.55);
    const phrases=['TNX FER CALL','PSE AGN','FB FB TNX','GM TNX FER QSO','GA DR OM','GE TNX','73 AR','73 SK','KN','PSE QRS'];
    t=await addTextPractice(tl,t,phrases,lang,wpm,eff,{response:1.8,reveal:1.5,mode:'sequence'});
  }

  // ---- Lesson 19: QSO blocks, then complete exchanges ----
  if(lesson===19){
    t=await addVoice(tl,t,voice,'qso_fragments',lang,gender,.7);
    const blocks=[
      'CQ CQ DE ZP5DXS ZP5DXS K',
      'ZP5DXS DE W1AW W1AW K',
      'W1AW DE ZP5DXS R UR RST 579 579',
      'NAME MATT BT QTH ASUNCION',
      'TNX FER QSO 73',
      'W1AW DE ZP5DXS 73 SK'
    ];
    t=await addTextPractice(tl,t,blocks,lang,wpm,eff,{response:2.0,reveal:1.7,mode:'sequence'});
    const full=`CQ CQ DE ZP5DXS ZP5DXS K W1AW DE ZP5DXS R UR RST 579 NAME MATT BT QTH ASUNCION TNX FER QSO 73 SK`;
    t=await addTextPractice(tl,t,[full],lang,wpm,eff,{response:3.0,reveal:2.5,repetitions:2,mode:'qso'});
    t=await addVoice(tl,t,voice,'first_complete_qso',lang,gender,.75);
  }

  // ---- Lesson 20: guided complete QSO, then final head-copy challenge ----
  if(lesson===20){
    t=await addVoice(tl,t,voice,'qso_complete',lang,gender,.7);
    const guided=[
      'CQ CQ DE ZP5DXS ZP5DXS K W1AW DE ZP5DXS R UR RST 579 NAME MATT QTH ASUNCION 73 SK',
      'CQ CQ DE W1AW W1AW K ZP5DXS DE W1AW R UR RST 599 NAME JOHN QTH NEW YORK 73 SK'
    ];
    t=await addTextPractice(tl,t,guided,lang,wpm,eff,{response:3.0,reveal:2.4,mode:'headcopy'});
    t=addNeutral(tl,t,.55);
    t=await addVoice(tl,t,voice,'lesson_20_final_challenge',lang,gender,.65);
    t=await addVoice(tl,t,voice,'headcopy_transition',lang,gender,.55);

    const finalQso='CQ CQ DE ZP5DXS ZP5DXS K W1AW DE ZP5DXS R UR RST 579 579 NAME MATT BT QTH ASUNCION TNX FER QSO 73 SK';
    t=addCw(tl,t,finalQso,wpm,eff,'headcopy');
    t+=3.2;
    tl.add('reveal',t,4.0,{text:finalQso,lang});
    t+=4.25;
    t=await addVoice(tl,t,voice,'course_final_message',lang,gender,.8);
  }

  // Every lesson ends with its specifically recorded outro.
  t=await addVoice(tl,t,voice,specificOutro(lesson),lang,gender,.75);
  tl.add('outro',t,4,{title:lang==='es'?'LECCIÓN COMPLETADA':'LESSON COMPLETE'});
  t+=4;
  tl.duration=t;
  return tl.sort();
}
