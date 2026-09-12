import {scheduleText} from './morse-engine.js';

export async function exportVideo(tl,voice,visual,{lang='es',gender='female',tone=700,fps=30,onProgress=()=>{}}={}){
  if(!window.MediaRecorder||!HTMLCanvasElement.prototype.captureStream)throw new Error('Video export is not supported by this browser.');
  const ctx=new AudioContext(),dest=ctx.createMediaStreamDestination(),master=ctx.createGain();master.gain.value=.85;const comp=ctx.createDynamicsCompressor();comp.threshold.value=-3;comp.ratio.value=6;comp.attack.value=.003;comp.release.value=.18;master.connect(comp).connect(dest);
  const base=ctx.currentTime+.3;
  for(const e of tl.events){if(e.type==='cw')scheduleText(ctx,master,e.data.text,base+e.start,{wpm:e.data.wpm||15,effectiveWpm:e.data.eff||15,tone:e.data.tone||tone,amp:.30});else if(e.type==='voice'||e.type==='charVoice'){const id=e.type==='voice'?e.data.id:`char_${String(e.data.char).toLowerCase()}`;const b=await voice.buffer(ctx,id,lang,gender);if(b){const s=ctx.createBufferSource();s.buffer=b;s.connect(master);s.start(base+e.start)}}}
  const canvasStream=visual.c.captureStream(fps),stream=new MediaStream([...canvasStream.getVideoTracks(),...dest.stream.getAudioTracks()]);
  const types=['video/webm;codecs=vp9,opus','video/webm;codecs=vp8,opus','video/webm'];const mimeType=types.find(x=>MediaRecorder.isTypeSupported(x))||'';const rec=new MediaRecorder(stream,mimeType?{mimeType,videoBitsPerSecond:4500000}:{videoBitsPerSecond:4500000}),parts=[];
  rec.ondataavailable=e=>{if(e.data.size)parts.push(e.data)};
  const done=new Promise((resolve,reject)=>{rec.onerror=e=>reject(e.error||e);rec.onstop=()=>resolve(new Blob(parts,{type:mimeType||'video/webm'}))});
  rec.start(1000);let raf;
  const draw=()=>{const t=Math.max(0,ctx.currentTime-base);visual.draw(Math.min(t,tl.duration),tl);onProgress(Math.min(1,t/tl.duration));if(t<tl.duration+.05)raf=requestAnimationFrame(draw);else{cancelAnimationFrame(raf);setTimeout(()=>rec.stop(),120)}};draw();
  const blob=await done;stream.getTracks().forEach(t=>t.stop());await ctx.close().catch(()=>{});return blob
}
