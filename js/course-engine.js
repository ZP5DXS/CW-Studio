import {Timeline} from './timeline.js';
import {tokenDuration,wordDuration} from './morse-engine.js';

export const COURSE=[
[1,'HEAR',['T','E','A'],6,'Discover complete CW sounds'],[2,'HEAR',['N','I','M'],6,'First deliberate recognition'],[3,'HEAR',['S','O','R'],6,'Short groups and simple words'],[4,'RECOGNIZE',['K','D','U'],7,'Cumulative recognition'],[5,'RECOGNIZE',['G','W','H'],7,'Groups of two and three'],[6,'RECOGNIZE',['L','P','F'],7,'Recognition without reconstruction'],[7,'RECALL',['B','V','C'],8,'Less visual assistance'],[8,'RECALL',['Y','X','J'],8,'Harder recognition and recovery'],[9,'RECALL',['Q','Z'],8,'Complete A–Z'],[10,'CONSOLIDATE',[],8,'Alphabet consolidation'],[11,'EXPAND',['1','2','3'],9,'Introduce numbers'],[12,'EXPAND',['4','5','6'],9,'Mix letters and numbers'],[13,'EXPAND',['7','8','9','0'],9,'Complete A–Z and 0–9'],[14,'REAL WORLD',[],9,'Real callsign recognition'],[15,'UNDERSTAND',['CQ','DE','K'],10,'Making a call'],[16,'UNDERSTAND',['R','RST','73'],10,'Signal reports'],[17,'UNDERSTAND',['NAME','QTH','BT'],10,'Operator information'],[18,'UNDERSTAND',['KN','AR','SK','TNX','FER','PSE','AGN','FB','GM','GA','GE'],11,'Control and close a QSO'],[19,'COMMUNICATE',[],12,'Build a complete QSO'],[20,'COPY',[],12,'Your First QSO']
].map(([lesson,phase,newItems,eff,focus])=>({lesson,phase,newItems,charWpm:18,effectiveWpm:eff,focus}));

const seq='TEANIMSORKDUGWHLPFBVCYXJQZ1234567890';
function learnedFor(n){let out='';for(const l of COURSE.filter(x=>x.lesson<=n)){for(const c of l.newItems){if(c.length===1&&!out.includes(c))out+=c}}return out}
function rng(seed){let h=2166136261;for(const ch of seed)h=Math.imul(h^ch.charCodeAt(0),16777619);return()=>((h=Math.imul(h^(h>>>13),2246822507))>>>0)/4294967296}
function pickChars(set,count,r){let s='';for(let i=0;i<count;i++)s+=set[Math.floor(r()*set.length)];return s}

export function buildLesson(lesson,lang='es'){
  const cfg=COURSE.find(x=>x.lesson===lesson);const tl=new Timeline({kind:'course',lesson,title:`Learn CW · Lesson ${String(lesson).padStart(2,'0')}`,cfg});let t=0;
  tl.add('title',t,5,{title:`LESSON ${String(lesson).padStart(2,'0')}`,subtitle:cfg.newItems.length?cfg.newItems.join(' · '):cfg.focus});t+=5;
  tl.add('voice',t,10,{id:`lesson_${String(lesson).padStart(2,'0')}_intro`});t+=11;
  const r=rng(`course-${lesson}`);const learned=learnedFor(lesson)||'TEA';
  if(lesson<=13&&cfg.newItems.length){for(const c of cfg.newItems){tl.add('cw',t,tokenDuration(c,18),{text:c,wpm:18,eff:cfg.effectiveWpm,mode:'familiarization',mnemonic:true});t+=tokenDuration(c,18)+.35;tl.add('reveal',t,1.1,{text:c,mnemonic:true});t+=1.2;tl.add('charVoice',t,.8,{char:c});t+=1;tl.add('cw',t,tokenDuration(c,18),{text:c,wpm:18,eff:cfg.effectiveWpm,mode:'familiarization'});t+=tokenDuration(c,18)+1.1}}
  const rounds=lesson<10?30:lesson<14?36:24;
  for(let i=0;i<rounds;i++){const text=lesson>=14?pickChars(learned,lesson===14?5:Math.min(5,2+Math.floor(r()*4)),r):learned[Math.floor(r()*learned.length)];const dur=wordDuration(text,18,cfg.effectiveWpm);tl.add('cw',t,dur,{text,wpm:18,eff:cfg.effectiveWpm,mode:'recognition'});t+=dur+(lesson<7?1.8:1.4);tl.add('reveal',t,.8,{text});t+=1.0}
  if(lesson>=15){const samples={15:'CQ CQ DE ZP5DXS ZP5DXS K',16:'R UR RST 579 579 73',17:'NAME MATT BT QTH ASUNCION',18:'TNX FER QSO 73 SK',19:'CQ CQ DE ZP5DXS ZP5DXS K',20:'CQ CQ DE ZP5DXS ZP5DXS K'};const q=samples[lesson];for(let i=0;i<(lesson>=19?3:2);i++){const d=wordDuration(q,18,cfg.effectiveWpm);tl.add('cw',t,d,{text:q,wpm:18,eff:cfg.effectiveWpm,mode:lesson===20?'headcopy':'sequence'});t+=d+(lesson===20?3:2);tl.add('reveal',t,2,{text:q});t+=2.4}}
  if(lesson===20){tl.add('voice',t,9,{id:'lesson_20_final_challenge'});t+=10}
  tl.add('voice',t,9,{id:`lesson_${String(lesson).padStart(2,'0')}_outro`});t+=10;tl.add('outro',t,6,{title:'LESSON COMPLETE'});t+=6;tl.duration=t;return tl.sort()
}
