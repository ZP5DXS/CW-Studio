import {scheduleText,scheduleCheckTone} from './morse-engine.js?v=30';
import {renderOffline} from './export-engine.js?v=30';
import {VisualEngine} from './visual-engine.js?v=30';

const MEDIABUNNY_URL='https://cdn.jsdelivr.net/npm/mediabunny@1.56.1/+esm';

async function exportFast(tl,voice,{lang='es',gender='female',tone=700,fps=24,onProgress=()=>{},onStage=()=>{}}={}){
  if(!('VideoEncoder' in window)||!('AudioEncoder' in window))throw new Error('WebCodecs unavailable');

  onStage('audio');
  const audio=await renderOffline(tl,voice,{
    lang,gender,tone,
    onStatus:()=>{},
    onProgress:p=>onProgress(.02+p*.20)
  });

  onStage('encoder');
  const {
    Output,Mp4OutputFormat,BufferTarget,CanvasSource,AudioBufferSource,Quality
  }=await import(MEDIABUNNY_URL);

  const canvas=document.createElement('canvas');
  canvas.width=1280;canvas.height=720;
  canvas.style.width='1280px';canvas.style.height='720px';
  const renderer=new VisualEngine(canvas);
  renderer.setLanguage(lang);
  renderer.setOfflineAudio(audio);

  const target=new BufferTarget();
  const output=new Output({format:new Mp4OutputFormat(),target});
  const videoSource=new CanvasSource(canvas,{codec:'avc',quality:new Quality({bitrate:1400000})});
  const audioSource=new AudioBufferSource({codec:'aac',quality:new Quality({bitrate:128000})});

  output.addVideoTrack(videoSource,{frameRate:fps});
  output.addAudioTrack(audioSource);
  output.setMetadataTags?.({
    title:tl.meta?.title||'Morse Practice CW Studio',
    artist:'ZP5DXS',
    comment:'Generated with Morse Practice CW Studio'
  });

  await output.start();
  onStage('render');

  const audioPromise=audioSource.add(audio).then(()=>audioSource.close());
  const totalFrames=Math.ceil(tl.duration*fps);

  for(let frame=0;frame<totalFrames;frame++){
    const ts=frame/fps;
    renderer.draw(ts,tl);
    await videoSource.add(ts,1/fps,{keyFrame:frame%(fps*4)===0});
    if(frame%8===0||frame===totalFrames-1)onProgress(.24+.68*(frame+1)/totalFrames);
  }

  videoSource.close();
  await audioPromise;
  onStage('finalize');
  onProgress(.94);
  await output.finalize();
  onProgress(1);

  if(!target.buffer)throw new Error('Video buffer was not produced');
  return new Blob([target.buffer],{type:'video/mp4'});
}

async function exportRealtime(tl,voice,visual,{lang='es',gender='female',tone=700,fps=30,onProgress=()=>{},onStage=()=>{}}={}){
  onStage('compatibility');
  if(!window.MediaRecorder||!HTMLCanvasElement.prototype.captureStream)throw new Error('Video export is not supported by this browser.');

  const ctx=new AudioContext(),dest=ctx.createMediaStreamDestination(),master=ctx.createGain();
  master.gain.value=.85;
  const comp=ctx.createDynamicsCompressor();
  comp.threshold.value=-3;comp.ratio.value=6;comp.attack.value=.003;comp.release.value=.18;
  master.connect(comp).connect(dest);

  const base=ctx.currentTime+.3;
  for(const e of tl.events){
    if(e.type==='cw')scheduleText(ctx,master,e.data.text,base+e.start,{wpm:e.data.wpm||15,effectiveWpm:e.data.eff||15,tone:e.data.tone||tone,amp:.30});
    else if(e.type==='check')scheduleCheckTone(ctx,master,base+e.start,{amp:.14});
    else if(e.type==='voice'||e.type==='charVoice'){
      const id=e.type==='voice'?e.data.id:`char_${String(e.data.char).toLowerCase()}`;
      const b=await voice.buffer(ctx,id,lang,gender);
      if(b){const s=ctx.createBufferSource();s.buffer=b;s.connect(master);s.start(base+e.start)}
    }
  }

  const canvasStream=visual.c.captureStream(fps);
  const stream=new MediaStream([...canvasStream.getVideoTracks(),...dest.stream.getAudioTracks()]);
  const types=['video/webm;codecs=vp9,opus','video/webm;codecs=vp8,opus','video/webm'];
  const mimeType=types.find(x=>MediaRecorder.isTypeSupported(x))||'';
  const rec=new MediaRecorder(stream,mimeType?{mimeType,videoBitsPerSecond:3500000}:{videoBitsPerSecond:3500000}),parts=[];
  rec.ondataavailable=e=>{if(e.data.size)parts.push(e.data)};
  const done=new Promise((resolve,reject)=>{rec.onerror=e=>reject(e.error||e);rec.onstop=()=>resolve(new Blob(parts,{type:mimeType||'video/webm'}))});
  rec.start(1000);
  let raf;
  const draw=()=>{
    const t=Math.max(0,ctx.currentTime-base);
    visual.draw(Math.min(t,tl.duration),tl);
    onProgress(Math.min(1,t/tl.duration));
    if(t<tl.duration+.05)raf=requestAnimationFrame(draw);
    else{cancelAnimationFrame(raf);setTimeout(()=>rec.stop(),120)}
  };
  draw();
  const blob=await done;
  stream.getTracks().forEach(t=>t.stop());
  await ctx.close().catch(()=>{});
  return blob;
}

export async function exportVideo(tl,voice,visual,opts={}){
  if(tl.meta?.noVideoExport)throw new Error('Video export is disabled for continuous Head Copy sessions.');
  try{
    return await exportFast(tl,voice,opts);
  }catch(err){
    console.warn('Fast video export unavailable; falling back to real time:',err);
    opts.onFallback?.(err);
    opts.onStage?.('fallback');
    return await exportRealtime(tl,voice,visual,opts);
  }
}
