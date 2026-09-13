import {Timeline} from './timeline.js?v=37';
import {wordDuration} from './morse-engine.js?v=37';
import {COMMON_EN,COMMON_ES,RADIO,ABBR,CALLS,NUMBERS100} from './content-data.js?v=37';

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
{id:'100_common_words',title:{es:'100 palabras comunes',en:'100 Common Words'},items:(lang)=>lang==='es'?COMMON_ES:COMMON_EN},
{id:'100_real_callsigns',title:{es:'100 indicativos',en:'100 Callsigns'},items:()=>CALLS},
{id:'100_radio_words',title:{es:'100 palabras de radio',en:'100 Radio Words'},items:()=>RADIO},
{id:'100_numbers',title:{es:'100 números',en:'100 Numbers'},items:()=>NUMBERS100},
{id:'100_abbreviations',title:{es:'100 abreviaturas CW',en:'100 CW Abbreviations'},items:()=>ABBR},
{id:'qso_head_copy',title:{es:'QSO Head Copy',en:'QSO Head Copy'},items:()=>QSOS},
{id:'endless_head_copy',title:{es:'Head Copy continuo',en:'Endless Head Copy'},items:()=>[...RADIO,...ABBR,...CALLS],endless:true}
];
export const HEAD_COPY=DEF;

function rng(seed){let x=2166136261;for(const c of seed)x=Math.imul(x^c.charCodeAt(0),16777619);return()=>((x=Math.imul(x^(x>>>13),2246822507))>>>0)/4294967296}
function shuffled(arr,r){const a=[...arr];for(let i=a.length-1;i>0;i--){const j=Math.floor(r()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a}

async function addVoice(tl,t,voice,id,lang,gender,title,subtitle,gap=.65){
  const d=await voice.requireDuration(id,lang,gender);
  tl.add('voice',t,d,{id,visual:{title,subtitle,graphic:'headcopy'}});
  return t+d+gap;
}

export async function buildHeadCopy(id,{lang='es',gender='female',voice,wpm=15,eff=12,onStatus=()=>{}}={}){
  const def=DEF.find(x=>x.id===id)||DEF[0];
  const itemsBase=def.items(lang);
  const tl=new Timeline({
    kind:'headcopy',
    id,
    title:def.title[lang],
    longRunning:!!def.endless,
    loopPlayback:!!def.endless,
    noExport:!!def.endless,
    noVideoExport:!!def.endless
  });

  const intro=`${def.id}_intro`,outro=`${def.id}_outro`;
  const coach=['headcopy_no_spelling','headcopy_less_time','headcopy_halfway','headcopy_remember_meaning','headcopy_final_ten','challenge_complete'];
  const endlessCoach=['stay_flow','trust_ear'];
  const required=def.endless?[intro,...endlessCoach]:[intro,outro,...coach];
  const check=await voice.preflight(required,lang,gender,onStatus);
  if(!check.ok)throw new Error(`Missing Head Copy audio: ${check.missing.map(x=>x.id).join(', ')}`);

  let t=0;
  tl.add('title',t,3.2,{title:def.title[lang],subtitle:'HEAD COPY',blankVisual:true});t+=3.5;
  t=await addVoice(tl,t,voice,intro,lang,gender,def.title[lang],lang==='es'?'Escuchá unidades completas':'Listen to complete units',.75);

  const r=rng(`${def.id}-${lang}`);
  let items=def.id==='qso_head_copy'?[...itemsBase]:shuffled(itemsBase,r);
  const endlessChunkSeconds=20*60; // logical content loop; audio is scheduled in short windows
  let count=def.id==='qso_head_copy'?items.length:100;
  let response=def.id==='qso_head_copy'?3.0:1.9;

  for(let i=0; def.endless ? t<endlessChunkSeconds : i<count; i++){
    if(i && i%items.length===0)items=shuffled(items,r);
    const item=items[i%items.length];
    const d=wordDuration(item,wpm,eff);
    tl.add('cw',t,d,{text:item,wpm,eff,mode:'headcopy'});t+=d+response;
    tl.add('reveal',t,def.endless?.9:1.5,{text:item,lang});t+=def.endless?1.05:1.75;

    if(def.endless){
      if(i===45)t=await addVoice(tl,t,voice,'stay_flow',lang,gender,
        lang==='es'?'MANTENÉ EL FLUJO':'STAY WITH THE FLOW','',.40);
      if(i===105)t=await addVoice(tl,t,voice,'trust_ear',lang,gender,
        lang==='es'?'CONFIÁ EN TU OÍDO':'TRUST YOUR EAR','',.40);
    }

    if(!def.endless && def.id!=='qso_head_copy'){
      if(i===19)t=await addVoice(tl,t,voice,'headcopy_no_spelling',lang,gender,lang==='es'?'ESCUCHÁ LA UNIDAD':'HEAR THE UNIT','',.45);
      if(i===34){t=await addVoice(tl,t,voice,'headcopy_less_time',lang,gender,lang==='es'?'MENOS TIEMPO':'LESS TIME','',.45);response=Math.max(1.15,response-.45)}
      if(i===49)t=await addVoice(tl,t,voice,'headcopy_halfway',lang,gender,lang==='es'?'MITAD DEL RETO':'HALFWAY','',.45);
      if(i===69)t=await addVoice(tl,t,voice,'headcopy_remember_meaning',lang,gender,lang==='es'?'CONSERVÁ EL SIGNIFICADO':'KEEP THE MEANING','',.45);
      if(i===89)t=await addVoice(tl,t,voice,'headcopy_final_ten',lang,gender,lang==='es'?'ÚLTIMOS DIEZ':'FINAL TEN','',.45);
    }
  }

  if(!def.endless){
    t=await addVoice(tl,t,voice,'challenge_complete',lang,gender,lang==='es'?'RETO COMPLETADO':'CHALLENGE COMPLETE','',.45);
    t=await addVoice(tl,t,voice,outro,lang,gender,lang==='es'?'SESIÓN COMPLETADA':'SESSION COMPLETE',def.title[lang],.45);
    tl.add('outro',t,3.0,{title:lang==='es'?'SESIÓN COMPLETADA':'SESSION COMPLETE'});t+=3.0;
  }else{
    // The UI treats this 20-minute chunk as an infinite stream and loops it.
    // This avoids constructing thousands of events and giant export buffers.
    tl.duration=t;
  }

  tl.duration=Math.max(tl.duration,t);
  return tl.sort();
}
