import {VoiceEngine} from './voice-engine.js?v=30';
import {Playback} from './playback.js?v=30';
import {VisualEngine} from './visual-engine.js?v=30';
import {COURSE,buildLesson,courseFocus} from './course-engine.js?v=30';
import {HEAD_COPY,buildHeadCopy} from './headcopy-engine.js?v=30';
import {buildCustom} from './session-builder.js?v=30';
import {exportWav,exportMp3,download} from './export-engine.js?v=30';
import {exportVideo} from './video-export.js?v=30';

const $=s=>document.querySelector(s);
const $$=s=>[...document.querySelectorAll(s)];

const UI={
  es:{
    learnCW:'Aprender CW',createSession:'Crear',chooseLesson:'Elegí cualquier lección y comenzá cuando quieras.',
    play:'Reproducir',stop:'Detener',replay:'Repetir',nextLesson:'Siguiente lección →',export:'EXPORTAR',
    goal:'Objetivo',content:'Contenido',sound:'Sonido',length:'Duración',step1:'PASO 1',step2:'PASO 2',step3:'PASO 3',step4:'PASO 4',
    whatTrain:'¿Qué querés entrenar?',combineModes:'Podés combinar familiarización y reconocimiento.',
    familiarize:'Familiarizar',famHelp:'Aprendé letras y números con apoyo visual.',
    recognize:'Reconocer',recHelp:'Escuchá primero y respondé antes de la voz.',
    marathon:'Maratón',marHelp:'Escucha continua con mínima interrupción.',
    chooseMaterial:'Elegí el material',materialHelp:'Familiarización usa letras y números. Reconocimiento permite contenido de radio.',
    howSound:'¿Cómo debe sonar?',soundHelp:'Empezá simple. Las opciones avanzadas quedan fuera del camino.',
    speed:'Velocidad',tone:'Tono',advanced:'Avanzado ▾',advancedOpen:'Avanzado ▴',
    effectiveSpeed:'Velocidad efectiva',answerDelay:'Tiempo de respuesta',variableSpeed:'Reconocimiento a velocidad variable',randomOrder:'Orden aleatorio de caracteres y números',courtesyChime:'Tono de cortesía entre caracteres',toneVariation:'Variación leve de tono',
    howLong:'¿Cuánto tiempo?',longHelp:'Creá una práctica breve o una sesión larga de escucha.',seed:'Semilla de sesión',
    back:'Atrás',continue:'Continuar',buildSession:'Crear sesión',editSession:'Editar sesión',
    headCopyHelp:'Prácticas de escucha para después del curso.',aboutText:'Curso, práctica personalizada, Head Copy y exportación de audio/video CW desde el navegador.',
    completed:n=>`${n} / 20 completadas`,lesson:'LECCIÓN',loading:'CARGANDO LECCIÓN',exportAudio:'GENERANDO AUDIO',exportVideo:'GENERANDO VIDEO',
    ready:'LISTO',customSession:'SESIÓN PERSONALIZADA',pause:'Pausar',resume:'Continuar',fullscreen:'Pantalla completa',
    contents:{letters:'Letras',numbers:'Números',alnum:'Letras + números',punctuation:'Puntuación',prosigns:'Prosigns',abbreviations:'Abreviaturas CW',callsigns:'Indicativos completos',prefixes:'Prefijos DX',rst:'RST',qso:'QSO',words:'Palabras',custom:'Texto propio'}
  },
  en:{
    learnCW:'Learn CW',createSession:'Create',chooseLesson:'Choose any lesson and start whenever you want.',
    play:'Play',stop:'Stop',replay:'Replay',nextLesson:'Next lesson →',export:'EXPORT',
    goal:'Goal',content:'Content',sound:'Sound',length:'Length',step1:'STEP 1',step2:'STEP 2',step3:'STEP 3',step4:'STEP 4',
    whatTrain:'What do you want to train?',combineModes:'You can combine familiarization and recognition.',
    familiarize:'Familiarize',famHelp:'Learn letters and numbers with visual support.',
    recognize:'Recognize',recHelp:'Hear first and answer before the voice.',
    marathon:'Marathon',marHelp:'Continuous listening with minimal interruption.',
    chooseMaterial:'Choose the material',materialHelp:'Familiarization uses letters and numbers. Recognition can use radio content.',
    howSound:'How should it sound?',soundHelp:'Start simple. Advanced options stay out of the way.',
    speed:'Speed',tone:'Tone',advanced:'Advanced ▾',advancedOpen:'Advanced ▴',
    effectiveSpeed:'Effective speed',answerDelay:'Answer delay',variableSpeed:'Variable-speed recognition',randomOrder:'Random character and number order',courtesyChime:'Courtesy tone between characters',toneVariation:'Slight tone variation',
    howLong:'How long?',longHelp:'Create a short drill or a long listening session.',seed:'Session seed',
    back:'Back',continue:'Continue',buildSession:'Build session',editSession:'Edit session',
    headCopyHelp:'Focused listening challenges for after the course.',aboutText:'CW course, custom practice, Head Copy and browser-based audio/video export.',
    completed:n=>`${n} / 20 completed`,lesson:'LESSON',loading:'LOADING LESSON',exportAudio:'EXPORTING AUDIO',exportVideo:'EXPORTING VIDEO',
    ready:'READY',customSession:'CUSTOM SESSION',pause:'Pause',resume:'Resume',fullscreen:'Fullscreen',
    contents:{letters:'Letters',numbers:'Numbers',alnum:'Letters + numbers',punctuation:'Punctuation',prosigns:'Prosigns',abbreviations:'CW abbreviations',callsigns:'Full callsigns',prefixes:'DX prefixes',rst:'RST',qso:'QSO',words:'Words',custom:'Custom text'}
  }
};

function lang(){return $('#languageSelect').value||'es'}
function tr(k,...args){const v=UI[lang()][k];return typeof v==='function'?v(...args):v}

const voice=new VoiceEngine();
const playback=new Playback(voice);
const visual=new VisualEngine($('#visualCanvas'));

let currentLesson=Number(localStorage.getItem('cwStudio.currentLesson')||1);
let timeline=null;
let currentPosition=0;
let playbackGeneration=0;
let wizardStep=1;
let selectedModes=new Set(['familiarization','recognition']);
let selectedContents=new Set(['letters']);
let selectedDuration=900;
const completed=new Set(JSON.parse(localStorage.getItem('cwStudio.completedLessons')||'[]'));

const controls=['#playBtn','#wavBtn','#mp3Btn','#videoBtn'];

window.addEventListener('error',e=>{
  const el=$('#assetStatus');
  if(el){el.textContent=`Startup error: ${e.message}`;el.classList.add('warning')}
  console.error(e.error||e.message);
});
window.addEventListener('unhandledrejection',e=>{
  const el=$('#assetStatus');
  if(el){el.textContent=`Startup error: ${e.reason?.message||e.reason||'unknown error'}`;el.classList.add('warning')}
  console.error(e.reason);
});

function applyLanguage(){
  document.documentElement.lang=lang();visual.setLanguage(lang());
  $$('[data-i18n]').forEach(el=>{
    const key=el.dataset.i18n;
    if(UI[lang()][key]!==undefined)el.textContent=tr(key);
  });

  // Provisional public aliases; underlying TTS voices stay untouched.
  if(lang()==='es'){
    $('#voiceFemaleName').textContent='AURA';
    $('#voiceMaleName').textContent='NEXO';
  }else{
    $('#voiceFemaleName').textContent='NOVA';
    $('#voiceMaleName').textContent='VECTOR';
  }

  $$('.lang-pill').forEach(b=>b.classList.toggle('active',b.dataset.lang===lang()));
  $$('.voice-pill').forEach(b=>b.classList.toggle('active',b.dataset.gender===$('#voiceSelect').value));
  $('#courseProgressText').textContent=tr('completed',completed.size);
  renderContentChoices();
  renderBonuses();
}

function setLoading(active,percent=0,message='',kicker=tr('loading')){
  const overlay=$('#loadingOverlay');
  overlay.classList.toggle('hidden',!active);
  const p=Math.max(0,Math.min(1,Number(percent)||0));
  $('#loadingKicker').textContent=kicker;
  $('#loadingPercent').textContent=`${Math.round(p*100)}%`;
  $('#loadingMessage').textContent=message;
  $('#loadingBar').style.width=`${Math.round(p*100)}%`;
}
function loadingStatus(text,prefix='',kicker=tr('loading')){
  const s=String(text||'');
  const m=s.match(/(\d+)\/(\d+)/);
  const p=m?Number(m[1])/Math.max(1,Number(m[2])):(/ready|complete|rendered/i.test(s)?1:.08);
  console.debug('[CW Studio]',prefix?`${prefix} · ${s}`:s);
  setLoading(true,p,'','');
  $('#assetStatus').textContent='';
  $('#assetStatus').classList.remove('active','warning');
}
function stopLoading(){setLoading(false,1,'','')}

function fmt(s){
  s=Math.max(0,Math.floor(s||0));
  return `${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`;
}
function drawLoop(t=0){
  currentPosition=Math.max(0,t||0);
  if(!timeline){$('#timeLabel').textContent='00:00 / 00:00';return}
  visual.draw(currentPosition,timeline);
  $('#timeLabel').textContent=timeline?.meta?.longRunning
    ? `${fmt(currentPosition)} / ∞`
    : `${fmt(currentPosition)} / ${fmt(timeline.duration)}`;
}
function meta(){
  return {
    title:timeline?.meta?.title||'CW Studio Session',
    comment:`${timeline?.meta?.kind==='course'?'Learn CW lesson':'Custom practice session'} · Generated by ZP5DXS with Morse Practice CW Studio`
  };
}

function renderLessons(){
  $('#lessonGrid').innerHTML=COURSE.map(l=>`
    <article class="lesson ${l.lesson===currentLesson?'current':''} ${completed.has(l.lesson)?'completed':''}" data-lesson="${l.lesson}">
      <div class="lesson-top">
        <div class="n">${tr('lesson')} ${String(l.lesson).padStart(2,'0')}</div>
        <span class="lesson-check">${completed.has(l.lesson)?'✓':''}</span>
      </div>
      <h3>${l.newItems.length?l.newItems.join(' · '):courseFocus(l.lesson,lang())}</h3>
      <p>${courseFocus(l.lesson,lang())}<br>${l.charWpm} WPM · ${l.effectiveWpm} eff.</p>
    </article>`).join('');

  $$('.lesson').forEach(el=>el.onclick=()=>loadLesson(Number(el.dataset.lesson)));
  $('#courseProgressText').textContent=tr('completed',completed.size);
  $('#courseProgressBar').style.width=`${completed.size/20*100}%`;
  requestAnimationFrame(()=>$('#lessonGrid .lesson.current')?.scrollIntoView({behavior:'smooth',inline:'center',block:'nearest'}));
}

function renderBonuses(){
  $('#bonusGrid').innerHTML=HEAD_COPY.map((b,i)=>`
    <article class="bonus-card ${timeline?.meta?.kind==='headcopy'&&timeline.meta.id===b.id?'current':''}" data-bonus="${b.id}">
      <div class="n">HEAD COPY ${String(i+1).padStart(2,'0')}</div>
      <h3>${b.title[lang()]}</h3>
    </article>`).join('');
  $$('.bonus-card').forEach(el=>el.onclick=()=>loadBonus(el.dataset.bonus));
}

async function loadLesson(n){
  playbackGeneration++;
  currentLesson=Math.max(1,Math.min(20,n));
  localStorage.setItem('cwStudio.currentLesson',currentLesson);
  playback.stop();resetPlayButton();
  $('#lessonEndActions').classList.add('hidden');
  timeline=null;
  currentPosition=0;

  $('#statusLabel').textContent=`${tr('lesson')} ${String(currentLesson).padStart(2,'0')}`;
  setLoading(true,.03,'','');
  controls.forEach(sel=>{const el=$(sel);if(el)el.disabled=true});

  let success=false;
  try{
    await voice.discover(s=>loadingStatus(s,'',tr('loading')));
    timeline=await buildLesson(currentLesson,{
      lang:lang(),
      gender:$('#voiceSelect').value,
      voice,
      onStatus:s=>loadingStatus(s,'',tr('loading'))
    });
    renderLessons();
    drawLoop(0);
    const r=voice.roots();
    $('#assetStatus').textContent='';
    $('#assetStatus').classList.remove('warning','active');
    stopLoading();
    success=true;
  }catch(err){
    console.error(err);
    $('#assetStatus').textContent=`CW Studio v3.0 · ${err.message||err}`;$('#assetStatus').classList.add('active');
    $('#assetStatus').classList.add('warning');
    timeline=null;
    stopLoading();
  }finally{
    controls.forEach(sel=>{const el=$(sel);if(el)el.disabled=!success});
  }
}

async function loadBonus(id){
  playbackGeneration++;
  playback.stop();resetPlayButton();timeline=null;
  currentPosition=0;
  $('#lessonEndActions').classList.add('hidden');
  setLoading(true,.03,'','');
  controls.forEach(sel=>{const el=$(sel);if(el)el.disabled=true});
  try{
    await voice.discover(s=>loadingStatus(s,'',lang()==='es'?'CARGANDO HEAD COPY':'LOADING HEAD COPY'));
    visual.setLanguage(lang());currentPosition=0;
    timeline=await buildHeadCopy(id,{lang:lang(),gender:$('#voiceSelect').value,voice,wpm:15,eff:12,onStatus:s=>loadingStatus(s,'',lang()==='es'?'CARGANDO HEAD COPY':'LOADING HEAD COPY')});
    visual.setLanguage(lang());drawLoop(0);renderBonuses();stopLoading();
    controls.forEach(sel=>{const el=$(sel);if(el)el.disabled=false});
    if(timeline?.meta?.noExport){
      $('#wavBtn').disabled=true;
      $('#mp3Btn').disabled=true;
      $('#videoBtn').disabled=true;
    }else if(timeline?.meta?.noVideoExport){
      $('#videoBtn').disabled=true;
    }
    $('#assetStatus').textContent='';$('#assetStatus').classList.remove('active','warning');
  }catch(err){
    console.error(err);stopLoading();$('#assetStatus').textContent=`CW Studio v3.0 · ${err.message||err}`;$('#assetStatus').classList.add('active');$('#assetStatus').classList.add('warning');
  }
}

function completeCurrent(){
  if(timeline?.meta?.kind!=='course')return;
  completed.add(currentLesson);
  localStorage.setItem('cwStudio.completedLessons',JSON.stringify([...completed].sort((a,b)=>a-b)));
  renderLessons();
}

function showTab(tab){
  $$('.tab').forEach(b=>b.classList.toggle('active',b.dataset.tab===tab));
  $$('.panel').forEach(p=>p.classList.remove('active'));
  $(`#${tab}Panel`)?.classList.add('active');

  if(tab==='studio'){
    $('#playerSection').classList.add('workspace-hidden');
    $('#sessionWizard').classList.remove('workspace-hidden');
    $('#sessionBuiltActions').classList.add('hidden');
  }else{
    $('#playerSection').classList.remove('workspace-hidden');
    if(tab==='bonus' && timeline?.meta?.kind!=='headcopy') loadBonus(HEAD_COPY[0].id);
    if(tab==='course' && timeline?.meta?.kind!=='course') loadLesson(currentLesson);
  }
}

$$('.tab').forEach(b=>b.onclick=()=>showTab(b.dataset.tab));

$('#carouselPrev').onclick=()=>$('#lessonGrid').scrollBy({left:-Math.max(280,$('#lessonGrid').clientWidth*.78),behavior:'smooth'});
$('#carouselNext').onclick=()=>$('#lessonGrid').scrollBy({left: Math.max(280,$('#lessonGrid').clientWidth*.78),behavior:'smooth'});
$('#bonusPrev').onclick=()=>$('#bonusGrid').scrollBy({left:-Math.max(280,$('#bonusGrid').clientWidth*.78),behavior:'smooth'});
$('#bonusNext').onclick=()=>$('#bonusGrid').scrollBy({left: Math.max(280,$('#bonusGrid').clientWidth*.78),behavior:'smooth'});

$$('.lang-pill').forEach(b=>b.onclick=async()=>{
  $('#languageSelect').value=b.dataset.lang;
  applyLanguage();
  if(timeline?.meta?.kind==='course')await loadLesson(currentLesson);
});
$$('.voice-pill').forEach(b=>b.onclick=async()=>{
  $('#voiceSelect').value=b.dataset.gender;
  applyLanguage();
  if(timeline?.meta?.kind==='course')await loadLesson(currentLesson);
});

const CONTENT_KEYS=['letters','numbers','alnum','punctuation','prosigns','abbreviations','callsigns','prefixes','rst','qso','words','custom'];
function renderContentChoices(){
  const box=$('#contentChoices'); if(!box)return;
  const onlyFam=selectedModes.has('familiarization')&&selectedModes.size===1;
  const allowed=onlyFam?new Set(['letters','numbers']):new Set(CONTENT_KEYS);
  for(const x of [...selectedContents])if(!allowed.has(x))selectedContents.delete(x);
  if(!selectedContents.size)selectedContents.add('letters');

  box.innerHTML=CONTENT_KEYS.filter(k=>allowed.has(k)).map(k=>`
    <button class="choice compact ${selectedContents.has(k)?'selected':''}" data-content="${k}">
      <strong>${UI[lang()].contents[k]}</strong>
    </button>`).join('');

  $$('[data-content]').forEach(b=>b.onclick=()=>{
    const id=b.dataset.content;
    if(selectedContents.has(id))selectedContents.delete(id); else selectedContents.add(id);
    if(!selectedContents.size)selectedContents.add(id);
    renderContentChoices();
  });
  $('#customTextWrap').classList.toggle('hidden',!selectedContents.has('custom'));
}

$$('[data-mode]').forEach(b=>b.onclick=()=>{
  const id=b.dataset.mode;
  if(selectedModes.has(id))selectedModes.delete(id); else selectedModes.add(id);
  if(!selectedModes.size)selectedModes.add(id);
  $$('[data-mode]').forEach(x=>x.classList.toggle('selected',selectedModes.has(x.dataset.mode)));
  renderContentChoices();
});

function setWizard(n){
  wizardStep=Math.max(1,Math.min(4,n));
  $$('.wizard-step').forEach(x=>x.classList.toggle('active',+x.dataset.step===wizardStep));
  $$('.wizard-panel').forEach(x=>x.classList.toggle('active',+x.dataset.wizardPanel===wizardStep));
  $('#wizardBack').style.visibility=wizardStep===1?'hidden':'visible';
  $('#wizardNext').classList.toggle('hidden',wizardStep===4);
  $('#buildSessionBtn').classList.toggle('hidden',wizardStep!==4);
}
$$('.wizard-step').forEach(b=>b.onclick=()=>setWizard(+b.dataset.step));
$('#wizardBack').onclick=()=>setWizard(wizardStep-1);
$('#wizardNext').onclick=()=>setWizard(wizardStep+1);

['wpm','eff','tone','delay'].forEach(k=>{
  $(`#${k}Range`).oninput=e=>$(`#${k}Value`).textContent=e.target.value;
});
$('#advancedToggle').onclick=()=>{
  const open=$('#advancedOptions').classList.toggle('hidden')===false;
  $('#advancedToggle').textContent=open?tr('advancedOpen'):tr('advanced');
};
$$('.duration-choice').forEach(b=>b.onclick=()=>{
  selectedDuration=+b.dataset.duration;
  $$('.duration-choice').forEach(x=>x.classList.toggle('selected',x===b));
});

$('#buildSessionBtn').onclick=async()=>{
  visual.setLanguage(lang());currentPosition=0;
  setLoading(true,.03,'','');
  timeline=await buildCustom({
    lang:lang(),
    familiarization:selectedModes.has('familiarization'),
    recognition:selectedModes.has('recognition'),
    marathon:selectedModes.has('marathon'),
    contents:[...selectedContents],
    customText:$('#customText').value,
    wpm:+$('#wpmRange').value,
    eff:+$('#effRange').value,
    tone:+$('#toneRange').value,
    delay:+$('#delayRange').value,
    variableRecognition:$('#variableRecognition').checked,
    randomOrder:$('#randomOrder').checked,
    courtesyChime:$('#courtesyChime').checked,
    toneVariation:$('#toneVariation').checked,
    duration:selectedDuration,
    seed:$('#seedInput').value
  },{
    voice,
    lang:lang(),
    gender:$('#voiceSelect').value,
    onStatus:s=>loadingStatus(s,'',lang()==='es'?'CREANDO SESIÓN':'BUILDING SESSION')
  });
  stopLoading();
  $('#statusLabel').textContent=tr('customSession');visual.setLanguage(lang());resetPlayButton();
  $('#sessionWizard').classList.add('workspace-hidden');
  $('#sessionBuiltActions').classList.remove('hidden');
  $('#playerSection').classList.remove('workspace-hidden');
  drawLoop(0);
};
$('#editSessionBtn').onclick=()=>{
  playback.stop();
  $('#playerSection').classList.add('workspace-hidden');
  $('#sessionWizard').classList.remove('workspace-hidden');
  $('#sessionBuiltActions').classList.add('hidden');
};

function resetPlayButton(){
  $('#playBtn').textContent=tr('play');
  $('#playBtn').dataset.state='play';
}
function handlePlaybackEnd(){
  const generation=playbackGeneration;
  if(timeline?.meta?.loopPlayback){
    currentPosition=0;
    drawLoop(0);
    // Loop a bounded Head Copy chunk indefinitely without building a 9-hour timeline.
    setTimeout(()=>{
      if(generation===playbackGeneration && timeline?.meta?.loopPlayback)togglePlay();
    },120);
    return;
  }
  resetPlayButton();
  drawLoop(timeline?.duration||0);
  if(timeline?.meta?.kind==='course'){
    completeCurrent();
    $('#lessonEndActions').classList.remove('hidden');
  }
}

async function togglePlay(){
  if(!timeline){$('#assetStatus').textContent='CW Studio v3.0 · no session loaded';return}
  if(playback.isPlaying()){
    if(playback.isPaused()){
      await playback.resume();$('#playBtn').textContent=tr('pause');$('#playBtn').dataset.state='pause';
    }else{
      await playback.pause();$('#playBtn').textContent=tr('resume');$('#playBtn').dataset.state='resume';
    }
    return;
  }
  stopLoading();$('#playBtn').textContent=tr('pause');$('#playBtn').dataset.state='pause';
  $('#assetStatus').textContent='CW Studio v3.0 · preparing audio…';
  try{
    await playback.play(timeline,{
      lang:lang(),gender:$('#voiceSelect').value,tone:+$('#toneRange').value,startAt:currentPosition,
      onStatus:s=>{$('#assetStatus').textContent=`CW Studio v3.0 · ${s}`},
      onTick:(t,a)=>{visual.setAnalyser(a);drawLoop(t)},
      onEnd:()=>handlePlaybackEnd()
    });
  }catch(err){
    resetPlayButton();console.error(err);$('#assetStatus').textContent=`CW Studio v3.0 · ${err.message||err}`;$('#assetStatus').classList.add('active');$('#assetStatus').classList.add('warning');
  }
}
$('#playBtn').onclick=()=>togglePlay();
$('#stopBtn').onclick=()=>{playbackGeneration++;playback.stop();resetPlayButton();drawLoop(0)};
$('#replayLessonBtn').onclick=()=>{$('#lessonEndActions').classList.add('hidden');playback.stop();resetPlayButton();togglePlay()};
$('#nextLessonCta').onclick=()=>{$('#lessonEndActions').classList.add('hidden');loadLesson(currentLesson>=20?1:currentLesson+1)};
$('#fullscreenBtn').onclick=async()=>{
  const el=$('#visualWrap')||document.querySelector('.visual-wrap');
  try{if(!document.fullscreenElement)await el.requestFullscreen();else await document.exitFullscreen()}catch(e){console.warn(e)}
};



async function seekTo(seconds){
  if(!timeline)return;
  const wasPlaying=playback.isPlaying();
  const wasPaused=playback.isPaused();

  playback.stop();
  resetPlayButton();

  currentPosition=Math.max(0,Math.min(timeline.duration,seconds));
  drawLoop(currentPosition);

  if(wasPlaying&&!wasPaused&&currentPosition<timeline.duration-.05){
    $('#playBtn').textContent=tr('pause');
    $('#playBtn').dataset.state='pause';
    try{
      await playback.play(timeline,{
        lang:lang(),
        gender:$('#voiceSelect').value,
        tone:+$('#toneRange').value,
        startAt:currentPosition,
        onStatus:s=>{$('#assetStatus').textContent=`CW Studio v3.0 · ${s}`},
        onTick:(t,a)=>{visual.setAnalyser(a);drawLoop(t)},
        onEnd:()=>handlePlaybackEnd()
      });
    }catch(err){
      resetPlayButton();
      console.error(err);
    }
  }else if(wasPaused){
    $('#playBtn').textContent=tr('resume');
    $('#playBtn').dataset.state='resume';
  }
}

$('#visualCanvas').addEventListener('pointerdown',e=>{
  if(!timeline)return;
  const rect=e.currentTarget.getBoundingClientRect();
  const y=e.clientY-rect.top;
  // Only the lower progress-zone behaves like a video seek bar.
  if(y<rect.height*.88)return;

  const x=e.clientX-rect.left;
  const left=rect.width*.035;
  const right=rect.width*.965;
  const ratio=Math.max(0,Math.min(1,(x-left)/(right-left)));
  seekTo(ratio*timeline.duration);
});

function exportBaseName(){
  if(timeline?.meta?.kind==='course')return `learn-cw-${String(currentLesson).padStart(2,'0')}`;
  if(timeline?.meta?.kind==='headcopy')return `head-copy-${timeline.meta.id||'session'}`;
  return 'cw-studio-custom';
}

async function exportAudio(kind){
  if(!timeline)return;
  if(timeline?.meta?.noExport){
    setLoading(true,1,lang()==='es'?'El modo continuo se reproduce en bucle y no se exporta.':'Continuous mode loops live and is not exported.',tr('exportAudio'));
    setTimeout(()=>stopLoading(),1800);
    return;
  }
  const btn=kind==='wav'?$('#wavBtn'):$('#mp3Btn');
  const old=btn.textContent;
  btn.disabled=true;
  setLoading(true,.04,kind.toUpperCase(),tr('exportAudio'));
  try{
    const options={
      lang:lang(),gender:$('#voiceSelect').value,tone:+$('#toneRange').value,
      onStatus:s=>{$('#assetStatus').textContent=`CW Studio v3.0 · ${s}`},
      onProgress:p=>setLoading(true,p,'','')
    };
    const blob=kind==='wav'?await exportWav(timeline,voice,options,meta()):await exportMp3(timeline,voice,options,meta());
    download(blob,`${exportBaseName()}.${kind}`);
    $('#assetStatus').textContent='';$('#assetStatus').classList.remove('active','warning');
  }catch(err){
    console.error(err);
    $('#assetStatus').textContent=`CW Studio v3.0 · ${err.message||err}`;$('#assetStatus').classList.add('active');
    $('#assetStatus').classList.add('warning');
  }finally{
    btn.disabled=false;btn.textContent=old;stopLoading();drawLoop(0);
  }
}
$('#wavBtn').onclick=()=>exportAudio('wav');
$('#mp3Btn').onclick=()=>exportAudio('mp3');

$('#videoBtn').onclick=async()=>{
  if(!timeline)return;
  if(timeline?.meta?.noExport){
    setLoading(true,1,lang()==='es'?'El modo continuo se reproduce en bucle y no se exporta.':'Continuous mode loops live and is not exported.',tr('exportVideo'));
    setTimeout(()=>stopLoading(),1800);
    return;
  }
  const btn=$('#videoBtn'),old=btn.textContent;btn.disabled=true;
  try{
    const blob=await exportVideo(timeline,voice,visual,{
      lang:lang(),gender:$('#voiceSelect').value,tone:+$('#toneRange').value,
      onProgress:p=>setLoading(true,p,'',''),
      onFallback:err=>{
        const why=String(err?.message||err||'').slice(0,120);
        console.warn('Offline MP4 path failed:',why);
      },
      onStage:stage=>console.debug('[CW Studio video]',stage)
    });
    const ext=blob.type.includes('mp4')?'mp4':'webm';
    download(blob,`${exportBaseName()}.${ext}`);
  }catch(err){
    console.error(err);
    $('#assetStatus').textContent=`CW Studio v3.0 · ${err.message||err}`;$('#assetStatus').classList.add('active');
  }finally{
    btn.disabled=false;btn.textContent=old;stopLoading();drawLoop(0);
  }
};

voice.init().catch(err=>console.warn('Voice init:',err));
renderLessons();
renderBonuses();
renderContentChoices();
setWizard(1);
applyLanguage();
$('#statusLabel').textContent=tr('ready');
$('#assetStatus').textContent='';
setTimeout(()=>loadLesson(currentLesson),0);
