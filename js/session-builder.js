import {Timeline} from './timeline.js?v=30';
import {tokenDuration,wordDuration} from './morse-engine.js?v=30';
import {RADIO,ABBR,CALLS,PREFIXES,PUNCT,PROSIGNS,RST,QSO_FRAGMENTS} from './content-data.js?v=30';

const LETTERS=[...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'],DIGITS=[...'0123456789'];

function rng(seed){let x=0;for(const c of String(seed||'MP'))x=(x*31+c.charCodeAt(0))>>>0;return()=>((x=(1664525*x+1013904223)>>>0)/4294967296)}
function shuffled(arr,r){const out=[...arr];for(let i=out.length-1;i>0;i--){const j=Math.floor(r()*(i+1));[out[i],out[j]]=[out[j],out[i]]}return out}
function unique(arr){return [...new Set(arr)]}
function categoryPool(id,o){
  if(id==='letters')return LETTERS;
  if(id==='numbers')return DIGITS;
  if(id==='alnum')return [...LETTERS,...DIGITS];
  if(id==='punctuation')return PUNCT;
  if(id==='prosigns')return PROSIGNS;
  if(id==='abbreviations')return ABBR;
  if(id==='callsigns')return CALLS;
  if(id==='prefixes')return PREFIXES;
  if(id==='rst')return RST;
  if(id==='qso')return QSO_FRAGMENTS;
  if(id==='words')return RADIO;
  if(id==='custom')return String(o.customText||'').toUpperCase().split(/\s+/).filter(Boolean);
  return [];
}
function contentIntroId(contents){
  if(contents.length!==1)return 'mixed_content';
  return {
    letters:'letters',numbers:'numbers',alnum:'letters_numbers',punctuation:'punctuation',
    prosigns:'prosigns',abbreviations:'abbreviations',callsigns:'callsigns',
    prefixes:'prefixes',rst:'rst',qso:'qso_fragments',words:'words',custom:'custom_text'
  }[contents[0]]||'mixed_content';
}
async function addVoice(tl,t,voice,id,lang,gender,gap=.65){
  const d=await voice.requireDuration(id,lang,gender);
  tl.add('voice',t,d,{id,required:true,visual:{title:'MORSE PRACTICE',subtitle:'',graphic:'voice'}});
  return t+d+gap;
}
function addCheck(tl,t,enabled){
  if(enabled){tl.add('check',t,.18,{label:'NEXT'});return t+1.0}
  return t+.75;
}
function orderForCategory(id,items,r,randomLettersNumbers){
  if(id==='custom')return [...items]; // user text always keeps its written order
  if(['letters','numbers','alnum'].includes(id))return randomLettersNumbers?shuffled(items,r):[...items];
  return shuffled(items,r);
}
function buildRecognitionItems(o,r){
  const blocks=[];
  for(const id of o.contents){
    const p=categoryPool(id,o);
    if(p.length)blocks.push(...orderForCategory(id,p,r,o.randomOrder!==false));
  }
  return blocks.length?blocks:LETTERS;
}
function familiarizationChars(o,r){
  let chars=[];
  for(const id of o.contents){
    const p=categoryPool(id,o);
    for(const item of p)for(const c of String(item))if(/[A-Z0-9]/.test(c))chars.push(c);
  }
  chars=unique(chars);
  if(!chars.length)chars=[...LETTERS];
  const onlyDirect=o.contents.every(x=>['letters','numbers','alnum'].includes(x));
  if(onlyDirect&&o.randomOrder===false){
    const natural=[...LETTERS,...DIGITS];
    chars=natural.filter(c=>chars.includes(c));
  }else chars=shuffled(chars,r);
  return chars;
}

export async function buildCustom(o,{voice,lang=o.lang||'es',gender='female',onStatus=()=>{}}={}){
  if(!voice)throw new Error('Voice engine is required for custom sessions.');
  const tl=new Timeline({kind:'custom',title:'CW Studio Session',options:o});
  const r=rng(o.seed||'MP');
  const modes=['familiarization','recognition','marathon'].filter(k=>o[k]);
  if(!modes.length)modes.push('recognition');

  const voiceIds=['welcome_relaxed','session_begins','session_complete_general',contentIntroId(o.contents)];
  if(o.familiarization)voiceIds.push('familiarization_intro');
  if(o.recognition)voiceIds.push('recognition_intro');
  if(o.recognition&&o.variableRecognition)voiceIds.push('recognition_variable_speed');
  if(o.marathon)voiceIds.push('marathon_intro','no_response_required');

  // Character answers required for all alphanumeric single-character work.
  const famChars=familiarizationChars(o,r);
  const recogItems=buildRecognitionItems(o,r);
  const singleAnswers=unique([...famChars,...recogItems.filter(x=>String(x).length===1&&/[A-Z0-9]/.test(String(x)))]);
  for(const c of singleAnswers)voiceIds.push(`char_${String(c).toLowerCase()}`);

  const check=await voice.preflight(unique(voiceIds),lang,gender,onStatus);
  if(!check.ok)throw new Error(`Required custom-session audio missing: ${check.missing.map(x=>x.id).join(', ')}`);

  const outroDur=await voice.requireDuration('session_complete_general',lang,gender);
  const target=Math.max(90,Number(o.duration||900));
  let t=0;

  tl.add('title',0,3.2,{title:lang==='es'?'SESIÓN DE PRÁCTICA CW':'CW PRACTICE SESSION',subtitle:`${o.wpm} WPM`,blankVisual:true});
  t=3.5;
  t=await addVoice(tl,t,voice,'welcome_relaxed',lang,gender,.55);
  t=await addVoice(tl,t,voice,'session_begins',lang,gender,.5);
  t=await addVoice(tl,t,voice,contentIntroId(o.contents),lang,gender,.55);

  const exerciseEnd=Math.max(t+20,target-outroDur-4.5);
  const phaseBudget=Math.max(12,(exerciseEnd-t)/modes.length);

  // FAMILIARIZATION: same core learning sequence as course, but user-configurable chime.
  if(o.familiarization&&t<exerciseEnd){
    t=await addVoice(tl,t,voice,'familiarization_intro',lang,gender,.55);
    const end=Math.min(exerciseEnd,t+phaseBudget);
    let i=0;
    while(t<end-3){
      const item=famChars[i++%famChars.length];
      const d=tokenDuration(item,o.wpm);
      const vd=await voice.requireDuration(`char_${item.toLowerCase()}`,lang,gender);
      const start=t,voiceAt=start+d+.55,mnemonicEnd=voiceAt+vd+.35;
      tl.add('mnemonic',start,mnemonicEnd-start,{text:item,lang});
      tl.add('cw',start,d,{text:item,wpm:o.wpm,eff:o.eff,tone:o.tone,mode:'familiarization'});
      t=voiceAt;
      tl.add('charVoice',t,vd,{char:item});
      t+=vd+.35;
      tl.add('cw',t,d,{text:item,wpm:o.wpm,eff:o.eff,tone:o.tone,mode:'familiarization-confirmation'});
      t+=d+.2;
      tl.add('neutral',t,.18,{});
      t=addCheck(tl,t+.18,o.courtesyChime);
    }
  }

  // RECOGNITION: single characters get an audible answer and final reference CW.
  if(o.recognition&&t<exerciseEnd){
    t=await addVoice(tl,t,voice,'recognition_intro',lang,gender,.5);
    if(o.variableRecognition)t=await addVoice(tl,t,voice,'recognition_variable_speed',lang,gender,.45);
    const end=Math.min(exerciseEnd,t+phaseBudget);
    let i=0;
    const items=recogItems.length?recogItems:['A'];
    while(t<end-3){
      const item=String(items[i++%items.length]);
      const itemTone=o.toneVariation?Math.round((o.tone+(r()-.5)*120)/10)*10:o.tone;
      const single=item.length===1&&/[A-Z0-9]/.test(item);

      if(single&&o.variableRecognition){
        for(const sw of [Math.max(8,o.wpm-3),o.wpm,o.wpm+3]){
          const d=tokenDuration(item,sw);
          tl.add('cw',t,d,{text:item,wpm:sw,eff:sw,tone:itemTone,mode:'recognition'});
          t+=d+.22;
        }
      }else{
        const d=wordDuration(item,o.wpm,o.eff);
        tl.add('cw',t,d,{text:item,wpm:o.wpm,eff:o.eff,tone:itemTone,mode:'recognition'});
        t+=d;
      }

      t+=o.delay;
      if(single){
        const vd=await voice.requireDuration(`char_${item.toLowerCase()}`,lang,gender);
        tl.add('reveal',t,Math.max(.85,vd+.2),{text:item,lang});
        tl.add('charVoice',t,vd,{char:item});
        t+=vd+.28;
        const d=tokenDuration(item,o.wpm);
        tl.add('cw',t,d,{text:item,wpm:o.wpm,eff:o.wpm,tone:itemTone,mode:'confirmation'});
        t+=d+.2;
        t=addCheck(tl,t,o.courtesyChime);
      }else{
        tl.add('reveal',t,1.15,{text:item,lang});
        t+=1.35;
      }
    }
  }

  // MARATHON now runs even when Recognition is also selected.
  if(o.marathon&&t<exerciseEnd){
    t=await addVoice(tl,t,voice,'marathon_intro',lang,gender,.45);
    t=await addVoice(tl,t,voice,'no_response_required',lang,gender,.35);
    const items=recogItems.length?recogItems:['A'];
    let i=0;
    while(t<exerciseEnd-.5){
      const item=String(items[i++%items.length]);
      const itemTone=o.toneVariation?Math.round((o.tone+(r()-.5)*120)/10)*10:o.tone;
      const d=wordDuration(item,o.wpm,o.eff);
      tl.add('cw',t,d,{text:item,wpm:o.wpm,eff:o.eff,tone:itemTone,mode:'marathon'});
      t+=d+.32;
    }
  }

  t=Math.max(t,exerciseEnd);
  t=await addVoice(tl,t,voice,'session_complete_general',lang,gender,.4);
  tl.add('outro',t,3.2,{title:lang==='es'?'SESIÓN COMPLETADA':'SESSION COMPLETE'});
  t+=3.2;
  tl.duration=t;
  return tl.sort();
}
