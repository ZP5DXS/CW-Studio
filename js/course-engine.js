import {Timeline} from './timeline.js?v=6';
import {tokenDuration,wordDuration} from './morse-engine.js?v=6';

export const COURSE=[
[1,'HEAR',['T','E','A'],6,'Discover complete CW sounds'],[2,'HEAR',['N','I','M'],6,'First deliberate recognition'],[3,'HEAR',['S','O','R'],6,'Short groups and simple words'],[4,'RECOGNIZE',['K','D','U'],7,'Cumulative recognition'],[5,'RECOGNIZE',['G','W','H'],7,'Groups of two and three'],[6,'RECOGNIZE',['L','P','F'],7,'Recognition without reconstruction'],[7,'RECALL',['B','V','C'],8,'Less visual assistance'],[8,'RECALL',['Y','X','J'],8,'Harder recognition and recovery'],[9,'RECALL',['Q','Z'],8,'Complete A–Z'],[10,'CONSOLIDATE',[],8,'Alphabet consolidation'],[11,'EXPAND',['1','2','3'],9,'Introduce numbers'],[12,'EXPAND',['4','5','6'],9,'Mix letters and numbers'],[13,'EXPAND',['7','8','9','0'],9,'Complete A–Z and 0–9'],[14,'REAL WORLD',[],9,'Real callsign recognition'],[15,'UNDERSTAND',['CQ','DE','K'],10,'Making a call'],[16,'UNDERSTAND',['R','RST','73'],10,'Signal reports'],[17,'UNDERSTAND',['NAME','QTH','BT'],10,'Operator information'],[18,'UNDERSTAND',['KN','AR','SK','TNX','FER','PSE','AGN','FB','GM','GA','GE'],11,'Control and close a QSO'],[19,'COMMUNICATE',[],12,'Build a complete QSO'],[20,'COPY',[],12,'Your First QSO']
].map(([lesson,phase,newItems,eff,focus])=>({lesson,phase,newItems,charWpm:15,effectiveWpm:Math.min(eff,15),focus}));

const TIMING={
  afterFirstCw:.62,       // hear -> small breathing space
  afterVoice:.28,         // spoken answer -> short space
  betweenConfirmations:.16,
  beforeChime:.20,
  chimeDuration:.20,
  afterChime:.82,         // clear boundary before next character
  responseEarly:1.40,
  responseLater:1.12,
  revealTail:.25,
  confirmationRepeats:1
};

function learnedFor(n){let out='';for(const l of COURSE.filter(x=>x.lesson<=n)){for(const c of l.newItems){if(c.length===1&&!out.includes(c))out+=c}}return out}
function rng(seed){let h=2166136261;for(const ch of seed)h=Math.imul(h^ch.charCodeAt(0),16777619);return()=>((h=Math.imul(h^(h>>>13),2246822507))>>>0)/4294967296}
function pickChars(set,count,r){let s='';for(let i=0;i<count;i++)s+=set[Math.floor(r()*set.length)];return s}
async function voiceDur(voice,id,lang,gender,fallback=3){const d=await voice.duration(id,lang,gender);return d>0?d:fallback}
function addChime(tl,t){tl.add('check',t,TIMING.chimeDuration,{label:'NEXT'});return t+TIMING.chimeDuration+TIMING.afterChime}

function addConfirmationCw(tl,t,text,wpm,eff,mode='confirmation'){
  const d=tokenDuration(text,wpm);
  for(let i=0;i<TIMING.confirmationRepeats;i++){
    tl.add('cw',t,d,{text,wpm,eff,mode});t+=d;
    if(i<TIMING.confirmationRepeats-1)t+=TIMING.betweenConfirmations;
  }
  return t;
}

export async function buildLesson(lesson,{lang='es',gender='female',voice}={}){
  const cfg=COURSE.find(x=>x.lesson===lesson),tl=new Timeline({kind:'course',lesson,title:`Learn CW · Lesson ${String(lesson).padStart(2,'0')}`,cfg});let t=0;
  tl.add('title',t,4,{title:`LESSON ${String(lesson).padStart(2,'0')}`,subtitle:cfg.newItems.length?cfg.newItems.join(' · '):cfg.focus});t+=4.4;
  const introId=`lesson_${String(lesson).padStart(2,'0')}_intro`,introDur=voice?await voiceDur(voice,introId,lang,gender,5):5;
  tl.add('voice',t,introDur,{id:introId});t+=introDur+.85;
  const r=rng(`course-${lesson}`),learned=learnedFor(lesson)||'TEA',wpm=cfg.charWpm;

  // Familiarization sequence, deliberately paced:
  // CW -> pause -> reveal + spoken name -> short pause -> CW confirmation(s)
  // -> soft courtesy tone -> clear pause -> next character.
  if(lesson<=13&&cfg.newItems.length){
    for(const c of cfg.newItems){
      const d=tokenDuration(c,wpm),id=`char_${String(c).toLowerCase()}`;
      tl.add('cw',t,d,{text:c,wpm,eff:cfg.effectiveWpm,mode:'familiarization',mnemonic:true});
      t+=d+TIMING.afterFirstCw;
      const vd=voice?await voiceDur(voice,id,lang,gender,.55):.55;
      tl.add('reveal',t,vd+TIMING.revealTail,{text:c,mnemonic:true});
      tl.add('charVoice',t,vd,{char:c});
      t+=vd+TIMING.afterVoice;
      t=addConfirmationCw(tl,t,c,wpm,cfg.effectiveWpm,'familiarization-confirmation');
      t+=TIMING.beforeChime;
      t=addChime(tl,t);
    }
  }

  // Recognition keeps spoken confirmation for every single-character item.
  // CW -> answer time -> reveal+voice -> short pause -> CW -> chime -> pause.
  const rounds=lesson<10?30:lesson<14?36:24;
  for(let i=0;i<rounds;i++){
    const text=lesson>=14?pickChars(learned,lesson===14?5:Math.min(5,2+Math.floor(r()*4)),r):learned[Math.floor(r()*learned.length)];
    const dur=wordDuration(text,wpm,cfg.effectiveWpm);
    tl.add('cw',t,dur,{text,wpm,eff:cfg.effectiveWpm,mode:'recognition'});
    t+=dur+(lesson<7?TIMING.responseEarly:TIMING.responseLater);

    if(lesson<=13&&text.length===1){
      const id=`char_${String(text).toLowerCase()}`,vd=voice?await voiceDur(voice,id,lang,gender,.55):.55;
      tl.add('reveal',t,vd+TIMING.revealTail,{text});
      tl.add('charVoice',t,vd,{char:text});
      t+=vd+TIMING.afterVoice;
      t=addConfirmationCw(tl,t,text,wpm,cfg.effectiveWpm);
    }else{
      tl.add('reveal',t,.92,{text});t+=1.02;
    }
    t+=TIMING.beforeChime;
    t=addChime(tl,t);
  }

  if(lesson>=15){
    const samples={15:'CQ CQ DE ZP5DXS ZP5DXS K',16:'R UR RST 579 579 73',17:'NAME MATT BT QTH ASUNCION',18:'TNX FER QSO 73 SK',19:'CQ CQ DE ZP5DXS ZP5DXS K',20:'CQ CQ DE ZP5DXS ZP5DXS K'};
    const q=samples[lesson];
    for(let i=0;i<(lesson>=19?3:2);i++){
      const d=wordDuration(q,wpm,cfg.effectiveWpm);
      tl.add('cw',t,d,{text:q,wpm,eff:cfg.effectiveWpm,mode:lesson===20?'headcopy':'sequence'});
      t+=d+(lesson===20?3:2);
      tl.add('reveal',t,2,{text:q});t+=2.15+TIMING.beforeChime;t=addChime(tl,t);
    }
  }

  if(lesson===20){const id='lesson_20_final_challenge',d=voice?await voiceDur(voice,id,lang,gender,6):6;tl.add('voice',t,d,{id});t+=d+.8}
  const outroId=`lesson_${String(lesson).padStart(2,'0')}_outro`,outroDur=voice?await voiceDur(voice,outroId,lang,gender,4):4;
  tl.add('voice',t,outroDur,{id:outroId});t+=outroDur+.7;tl.add('outro',t,5,{title:'LESSON COMPLETE'});t+=5;
  tl.duration=t;return tl.sort()
}
