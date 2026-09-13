import {Timeline} from './timeline.js?v=19';
import {wordDuration} from './morse-engine.js?v=19';

const COMMON=['THE','OF','AND','TO','IN','IS','YOU','THAT','IT','HE','WAS','FOR','ON','ARE','AS','WITH','HIS','THEY','I','AT','BE','THIS','HAVE','FROM','OR','ONE','HAD','BY','WORD','BUT','NOT','WHAT','ALL','WERE','WE','WHEN','YOUR','CAN','SAID','THERE','USE','AN','EACH','WHICH','SHE','DO','HOW','THEIR','IF','WILL','UP','OTHER','ABOUT','OUT','MANY','THEN','THEM','THESE','SO','SOME','HER','WOULD','MAKE','LIKE','HIM','INTO','TIME','HAS','LOOK','TWO','MORE','WRITE','GO','SEE','NUMBER','NO','WAY','COULD','PEOPLE','MY','THAN','FIRST','WATER','BEEN','CALL','WHO','OIL','ITS','NOW','FIND','LONG','DOWN','DAY','DID','GET','COME','MADE','MAY','PART'];
const RADIO=['RADIO','SIGNAL','ANTENNA','POWER','RIG','BAND','FREQ','FILTER','NOISE','QSO','CALL','KEY','PADDLE','BUG','CW','DX','QRP','QRZ','TUNER','COAX','GROUND','TOWER','BEAM','DIPOLE','VERTICAL','GAIN','SWR','WATTS','VOLTS','CURRENT','BATTERY','PORTABLE','MOBILE','BASE','REPEATER','SPOT','CLUSTER','BEACON','PROPAGATION','FADING','SKIP','PATH','AZIMUTH','ROTOR','HEADPHONES','SPEAKER','MIC','KEYER','SIDETONE','DELAY','BREAKIN','FULLBK','RIT','XIT','VFO','AGC','ATT','PREAMP','NOTCH','WIDTH','SHIFT','TONE','PITCH','MEMORY','SCAN','SQUELCH','LOG','CONTACT','CONFIRM','COUNTRY','PREFIX','LOCATOR','GRID','NAME','QTH','RST','REPORT','COPY','SEND','RECEIVE','CALLSIGN','OPERATOR','STATION','WEATHER','TEMP','TIME','UTC','LOCAL','MORNING','EVENING','THANKS','BEST','REGARDS','73','CQ','DE','KN','SK','AR','BT'];
const ABBR=['TNX','FER','PSE','AGN','FB','GM','GA','GE','WX','ANT','RIG','QTH','RST','NR','HR','HW','UR','DR','OM','YL','BK','BT','AR','SK','KN','CQ','DE','K','R','TU','CUL','HPE','ES','VY','GUD','SIG','PWR','WID','BAND','QRL','QRM','QRN','QRS','QRT','QRX','QRZ','QSB','QSL','QSY','QTH','QRP','QRO','QSP','QSK','QTC','QTR','QSO','DX','TEST','CQDX','POTA','SOTA','OTA','OP','RX','TX','RIT','VFO','AGC','NB','NR','ATT','SWR','WPM','HZ','KHZ','MHZ','W','KW','UTC','LOC','GRID','ANT','RPT','NIL','SRI','CL','BK','AS','SN','HH'];
const CALLS=['W1AW','K1JT','N0AX','K3LR','W3LPL','N6RO','K5ZD','K9CT','N2IC','K1ZZ','G3TXQ','G4FON','G0ORH','F6HKA','F5IN','DL1A','DL6RAI','DK3WW','DJ5MW','EA8RM','EA7X','CT1BOH','OH2BH','OH0X','SM5IMO','LA8OM','OZ1AA','PA3AAV','ON4UN','HB9CVQ','IK0YVV','I2WIJ','S51WO','9A1AA','OK1RR','OM2VL','HA8BE','LZ9W','YO9HP','SP7GIQ','VE3EJ','VE7CC','VA2WA','LU5FC','LU7YS','CX6VM','PY2NY','PY5KD','ZP5DXS','CE2LR','YV5JBI','XE2X','KP2M','KP4AA','HI3T','CO8LY','JA1NUT','JA3YBK','JH4UYB','HL2CFY','VR2XAN','BY1QH','BD7IHN','VK2GR','VK6LW','ZL3X','ZL1IF','YB1AR','9M2AX','HS0ZIA','VU2PTT','A45XR','4X1MM','5B4AGN','SV1ENG','TA2SE','CN8KD','EA9ACD','ZS6EZ','ZS4TX','3B8CF','FR5DX','D4C','V51YJ','7Q7WW','5H3EE','9J2BO','A71A','HZ1TT','OD5ZZ','JY9NX','AP2NK','EX8M','UN9L','UK9AA','EY8MM'];
const NUMBERS=['5','9','73','88','599','579','559','589','100','50','20','10','5','1000','700','7030','7050','14060','21060','28060','1234','2026','15','18','20','25','30','40','80','160','2','3','4','6','7','8','9','0','001','007','013','021','044','059','099','120','250','500','750','1500','2000','2500','3000','3500','4000','4500','5000','530','599','449','339','229','119','589','579','559','549','539','529','519','509','100','200','300','400','500','600','700','800','900','1100','1200','1300','1400','1500','1600','1700','1800','1900','2000','2300','2359','0000','0600','1200','1800','2400'];
const QSOS=[
'CQ CQ DE ZP5DXS ZP5DXS K',
'ZP5DXS DE W1AW W1AW K',
'W1AW DE ZP5DXS GM TNX FER CALL UR RST 579 579',
'NAME MATT MATT QTH ASUNCION ASUNCION',
'RIG 50W ANT DIPOLE',
'WX FINE TEMP 24C',
'TNX FER QSO HPE CU AGN 73',
'W1AW DE ZP5DXS 73 SK'
];

const DEF=[
{id:'100_common_words',title:{es:'100 palabras comunes',en:'100 Common Words'},items:COMMON},
{id:'100_real_callsigns',title:{es:'100 indicativos',en:'100 Callsigns'},items:CALLS},
{id:'100_radio_words',title:{es:'100 palabras de radio',en:'100 Radio Words'},items:RADIO},
{id:'100_numbers',title:{es:'100 números',en:'100 Numbers'},items:NUMBERS},
{id:'100_abbreviations',title:{es:'100 abreviaturas CW',en:'100 CW Abbreviations'},items:ABBR},
{id:'qso_head_copy',title:{es:'QSO Head Copy',en:'QSO Head Copy'},items:QSOS},
{id:'endless_head_copy',title:{es:'Head Copy continuo',en:'Endless Head Copy'},items:[...RADIO,...ABBR,...CALLS]}
];
export const HEAD_COPY=DEF;

function rng(seed){let x=2166136261;for(const c of seed)x=Math.imul(x^c.charCodeAt(0),16777619);return()=>((x=Math.imul(x^(x>>>13),2246822507))>>>0)/4294967296}

export async function buildHeadCopy(id,{lang='es',gender='female',voice,wpm=15,eff=12,onStatus=()=>{}}={}){
  const def=DEF.find(x=>x.id===id)||DEF[0],tl=new Timeline({kind:'headcopy',id,title:def.title[lang]});
  const intro=`${def.id}_intro`,outro=`${def.id}_outro`;
  const required=[intro,outro];
  const check=await voice.preflight(required,lang,gender,onStatus);
  if(!check.ok)throw new Error(`Missing Head Copy audio: ${check.missing.map(x=>x.id).join(', ')}`);
  let t=0;
  tl.add('title',t,3.5,{title:def.title[lang],subtitle:'HEAD COPY',blankVisual:true});t+=3.9;
  const introDur=await voice.requireDuration(intro,lang,gender);tl.add('voice',t,introDur,{id:intro,visual:{title:def.title[lang],subtitle:lang==='es'?'Escuchá unidades completas':'Listen to complete units',graphic:'headcopy'}});t+=introDur+1;
  const r=rng(`${def.id}-${lang}`),items=def.id==='qso_head_copy'?def.items:[...def.items].sort(()=>r()-.5);
  const count=def.id==='qso_head_copy'?items.length:Math.min(100,items.length);
  for(let i=0;i<count;i++){
    const item=items[i%items.length],d=wordDuration(item,wpm,eff);
    tl.add('cw',t,d,{text:item,wpm,eff,mode:'headcopy'});t+=d+(def.id==='qso_head_copy'?3.0:1.9);
    tl.add('reveal',t,1.5,{text:item,lang});t+=1.75;
    if(i===Math.floor(count/2)-1 && def.id!=='qso_head_copy'){
      const coach='headcopy_halfway',cd=await voice.duration(coach,lang,gender);
      if(cd){tl.add('voice',t,cd,{id:coach,visual:{title:lang==='es'?'MITAD DEL RETO':'HALFWAY',subtitle:lang==='es'?'Mantené el ritmo':'Stay with the rhythm',graphic:'headcopy'}});t+=cd+.8}
    }
  }
  const outroDur=await voice.requireDuration(outro,lang,gender);tl.add('voice',t,outroDur,{id:outro,visual:{title:lang==='es'?'RETO COMPLETADO':'CHALLENGE COMPLETE',subtitle:def.title[lang],graphic:'headcopy'}});t+=outroDur+.8;
  tl.add('outro',t,3.5,{title:lang==='es'?'SESIÓN COMPLETADA':'SESSION COMPLETE'});t+=3.5;tl.duration=t;return tl.sort();
}
