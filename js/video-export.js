import {scheduleText,scheduleCheckTone} from './morse-engine.js?v=37';
import {renderOffline,renderOfflineSegment} from './export-engine.js?v=37';
import {VisualEngine} from './visual-engine.js?v=37';

const MEDIABUNNY_URL='https://cdn.jsdelivr.net/npm/mediabunny@1.56.1/+esm';

async function exportFast(tl,voice,{
  lang='es',gender='female',tone=700,fps=24,
  onProgress=()=>{},onStage=()=>{},onTelemetry=()=>{},
  fileWritable=null
}={}){
  if(!('VideoEncoder' in window)||!('AudioEncoder' in window))throw new Error('WebCodecs unavailable');

  const longMode=tl.duration>=15*60;
  onStage('encoder');

  const {
    Output,Mp4OutputFormat,BufferTarget,StreamTarget,CanvasSource,AudioBufferSource,Quality
  }=await import(MEDIABUNNY_URL);

  const canvas=document.createElement('canvas');
  canvas.width=1280;canvas.height=720;
  canvas.style.width='1280px';canvas.style.height='720px';
  const renderer=new VisualEngine(canvas);
  renderer.setLanguage(lang);
  await renderer.preloadMnemonics(lang);

  // BufferTarget is intentionally kept only for smaller files. Mediabunny itself
  // recommends StreamTarget for large output; long sessions write directly to disk.
  const target=fileWritable
    ? new StreamTarget(fileWritable,{chunked:true,chunkSize:4*1024*1024})
    : new BufferTarget();

  const output=new Output({
    format:new Mp4OutputFormat(),
    target
  });
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

  // AUDIO:
  // short sessions: one offline buffer (fastest).
  // long sessions: 60-second chunks, encoded and released progressively.
  onStage('audio');
  if(longMode){
    const AUDIO_CHUNK=60;
    for(let start=0;start<tl.duration;start+=AUDIO_CHUNK){
      const dur=Math.min(AUDIO_CHUNK,tl.duration-start);
      const chunk=await renderOfflineSegment(tl,voice,start,dur,{lang,gender,tone});
      await audioSource.add(chunk);
      onProgress(.02+.16*Math.min(1,(start+dur)/tl.duration));
      await new Promise(r=>setTimeout(r,0));
    }
    audioSource.close();
  }else{
    const audio=await renderOffline(tl,voice,{
      lang,gender,tone,onStatus:()=>{},
      onProgress:p=>onProgress(.02+p*.16)
    });
    renderer.setOfflineAudio(audio);
    await audioSource.add(audio);
    audioSource.close();
  }

  onStage('render');
  const totalFrames=Math.ceil(tl.duration*fps);
  const renderStarted=performance.now();
  let lastTelemetry=0;

  for(let frame=0;frame<totalFrames;frame++){
    const ts=frame/fps;
    renderer.draw(ts,tl);
    await videoSource.add(ts,1/fps,{keyFrame:frame%(fps*4)===0});

    if(frame%8===0||frame===totalFrames-1){
      const completed=frame+1;
      const progress=completed/totalFrames;
      onProgress(.20+.74*progress);

      const now=performance.now();
      if(now-lastTelemetry>220||frame===totalFrames-1){
        lastTelemetry=now;
        const elapsed=Math.max(.001,(now-renderStarted)/1000);
        const processedSeconds=completed/fps;
        const realtime=processedSeconds/elapsed;
        const remainingSeconds=realtime>0?(tl.duration-processedSeconds)/realtime:null;
        onTelemetry({
          mode:fileWritable?'stream':'fast',
          processedSeconds,totalSeconds:tl.duration,
          completedFrames:completed,totalFrames,realtime,
          etaSeconds:remainingSeconds,elapsedSeconds:elapsed,
          calibrated:elapsed>=2.2&&completed>=Math.min(totalFrames,48)
        });
      }
      // Yield occasionally so long exports don't freeze the page event loop.
      if(frame%96===0)await new Promise(r=>setTimeout(r,0));
    }
  }

  videoSource.close();
  onStage('finalize');
  onProgress(.96);
  await output.finalize();
  onProgress(1);

  if(fileWritable){
    return {saved:true,type:'video/mp4'};
  }
  if(!target.buffer)throw new Error('Video buffer was not produced');
  return new Blob([target.buffer],{type:'video/mp4'});
}

async function exportRealtime(tl,voice,visual,{lang='es',gender='female',tone=700,fps=30,onProgress=()=>{},onStage=()=>{},onTelemetry=()=>{}}={}){
  onStage('compatibility');
  await visual.preloadMnemonics(lang);
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
  let raf,lastTelemetry=0;
  const wallStarted=performance.now();
  const draw=()=>{
    const t=Math.max(0,ctx.currentTime-base);
    visual.draw(Math.min(t,tl.duration),tl);
    const progress=Math.min(1,t/tl.duration);
    onProgress(progress);

    const now=performance.now();
    if(now-lastTelemetry>300 || t>=tl.duration){
      lastTelemetry=now;
      const elapsed=Math.max(.001,(now-wallStarted)/1000);
      const processed=Math.min(t,tl.duration);
      const realtime=processed/elapsed;
      const eta=realtime>0?(tl.duration-processed)/realtime:null;
      onTelemetry({
        mode:'compatibility',
        processedSeconds:processed,
        totalSeconds:tl.duration,
        completedFrames:Math.min(Math.round(processed*fps),Math.ceil(tl.duration*fps)),
        totalFrames:Math.ceil(tl.duration*fps),
        realtime,
        etaSeconds:eta,
        elapsedSeconds:elapsed,
        calibrated:elapsed>=2.2
      });
    }

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
