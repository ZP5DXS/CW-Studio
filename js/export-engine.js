import {scheduleText,scheduleCheckTone} from './morse-engine.js?v=36';

function ascii(s){return new TextEncoder().encode(s)}
function concat(...parts){const n=parts.reduce((a,p)=>a+p.length,0),o=new Uint8Array(n);let x=0;for(const p of parts){o.set(p,x);x+=p.length}return o}
function synchsafe(n){return new Uint8Array([(n>>21)&127,(n>>14)&127,(n>>7)&127,n&127])}
function id3Frame(id,text){const enc=new TextEncoder().encode(text),data=concat(new Uint8Array([3]),enc),h=new Uint8Array(10);h.set(ascii(id),0);new DataView(h.buffer).setUint32(4,data.length);return concat(h,data)}
function addId3(blob,meta){const frames=[id3Frame('TIT2',meta.title||'CW Studio Session'),id3Frame('TPE1','ZP5DXS / Morse Practice'),id3Frame('TALB','CW Studio'),id3Frame('COMM',meta.comment||'Generated with CW Studio')];const body=concat(...frames),head=concat(ascii('ID3'),new Uint8Array([3,0,0]),synchsafe(body.length));return new Blob([head,body,blob],{type:'audio/mpeg'})}

function strChunk(id,text){let b=new TextEncoder().encode(text+'\0');if(b.length%2)b=concat(b,new Uint8Array([0]));const h=new Uint8Array(8);h.set(ascii(id),0);new DataView(h.buffer).setUint32(4,b.length,true);return concat(h,b)}
function wavBlob(buffer,meta={}){const ch=buffer.numberOfChannels,sr=buffer.sampleRate,dataLen=buffer.length*ch*2;const infoBody=concat(ascii('INFO'),strChunk('INAM',meta.title||'CW Studio Session'),strChunk('IART','ZP5DXS / Morse Practice'),strChunk('ICMT',meta.comment||'Generated with CW Studio'));const listHead=new Uint8Array(8);listHead.set(ascii('LIST'),0);new DataView(listHead.buffer).setUint32(4,infoBody.length,true);const list=concat(listHead,infoBody);const riffSize=36+dataLen+list.length,ab=new ArrayBuffer(44+dataLen),v=new DataView(ab);const ws=(o,s)=>[...s].forEach((c,i)=>v.setUint8(o+i,c.charCodeAt(0)));ws(0,'RIFF');v.setUint32(4,riffSize,true);ws(8,'WAVEfmt ');v.setUint32(16,16,true);v.setUint16(20,1,true);v.setUint16(22,ch,true);v.setUint32(24,sr,true);v.setUint32(28,sr*ch*2,true);v.setUint16(32,ch*2,true);v.setUint16(34,16,true);ws(36,'data');v.setUint32(40,dataLen,true);let o=44;for(let i=0;i<buffer.length;i++)for(let c=0;c<ch;c++){const s=Math.max(-1,Math.min(1,buffer.getChannelData(c)[i]));v.setInt16(o,s<0?s*32768:s*32767,true);o+=2}return new Blob([ab,list],{type:'audio/wav'})}

export async function renderOffline(tl,voice,{lang='es',gender='female',tone=700,onStatus=()=>{},onProgress=()=>{}}={}){
  if(tl?.meta?.noExport)throw new Error('Continuous Head Copy is a live loop and cannot be exported.');
  if(!Number.isFinite(tl?.duration)||tl.duration<=0)throw new Error('Invalid session duration.');
  if(tl.duration>2*60*60)throw new Error('This session is too long to export safely. Reduce its duration first.');

  const sr=44100;
  const renderDuration=tl.duration+.5;
  const frames=Math.ceil(renderDuration*sr);

  // One mono 44.1 kHz offline graph. This is deliberately the same path for
  // Course, Custom and finite Head Copy timelines.
  const ctx=new OfflineAudioContext(1,frames,sr);
  const cwBus=ctx.createGain();
  cwBus.gain.value=.82;
  const voiceBus=ctx.createGain();
  voiceBus.gain.value=.92;
  const comp=ctx.createDynamicsCompressor();
  comp.threshold.value=-3;comp.ratio.value=6;comp.attack.value=.003;comp.release.value=.18;
  cwBus.connect(comp).connect(ctx.destination);
  voiceBus.connect(ctx.destination);

  const voiceEvents=tl.events.filter(e=>e.type==='voice'||e.type==='charVoice');
  const voiceBuffers=new Map();

  // Decode each unique voice clip once before scheduling. Custom sessions can
  // repeat the same character hundreds of times; fetching/decoding it once is
  // materially faster and avoids work inside the scheduling loop.
  const uniqueVoiceIds=[...new Set(voiceEvents.map(e=>
    e.type==='voice'?e.data.id:`char_${String(e.data.char).toLowerCase()}`
  ))];

  for(let i=0;i<uniqueVoiceIds.length;i++){
    const id=uniqueVoiceIds[i];
    onStatus(`loading voice ${i+1}/${uniqueVoiceIds.length} · ${id}`);
    onProgress(uniqueVoiceIds.length?(.03+.27*(i+1)/uniqueVoiceIds.length):.30);
    const b=await voice.buffer(ctx,id,lang,gender);
    if(!b)throw new Error(`Required voice clip unavailable during export: ${id}`);
    voiceBuffers.set(id,b);
  }

  onStatus('preparing audio…');
  onProgress(.32);

  for(const e of tl.events){
    if(e.type==='cw'){
      scheduleText(ctx,cwBus,e.data.text,e.start,{
        wpm:e.data.wpm||15,
        effectiveWpm:e.data.eff||15,
        tone:e.data.tone||tone,
        amp:.30
      });
    }else if(e.type==='check'){
      scheduleCheckTone(ctx,cwBus,e.start,{amp:.14});
    }else if(e.type==='voice'||e.type==='charVoice'){
      const id=e.type==='voice'?e.data.id:`char_${String(e.data.char).toLowerCase()}`;
      const b=voiceBuffers.get(id);
      const source=ctx.createBufferSource();
      source.buffer=b;
      source.connect(voiceBus);
      source.start(e.start);
    }
  }

  onStatus('rendering audio…');
  onProgress(.36);

  // startRendering() itself has no standard granular progress callback.
  // Do not suspend/resume the OfflineAudioContext merely to fake progress:
  // suspend() has uneven browser support and can stall long/custom renders.
  // A lightweight heartbeat only keeps the UI alive while the browser renders
  // the graph as fast as it can.
  let virtual=.36;
  const heartbeat=setInterval(()=>{
    virtual=Math.min(.59,virtual+.006);
    onProgress(virtual);
  },160);

  try{
    const rendered=await ctx.startRendering();
    onStatus('audio ready');
    onProgress(.62);
    return rendered;
  }finally{
    clearInterval(heartbeat);
  }
}

export async function renderOfflineSegment(tl,voice,start,duration,{
  lang='es',gender='female',tone=700,onStatus=()=>{}
}={}){
  if(!Number.isFinite(start)||!Number.isFinite(duration)||duration<=0)throw new Error('Invalid audio segment.');

  const sr=32000; // sufficient for CW/voice video soundtrack, substantially lower memory
  const segmentStart=Math.max(0,start);
  const segmentEnd=Math.min(tl.duration,segmentStart+duration);

  // Render with overlap so events crossing a chunk boundary are captured cleanly.
  const maxEventDur=Math.max(1,...tl.events.map(e=>Number(e.duration)||0));
  const overlap=Math.min(30,Math.max(2,maxEventDur+0.5));
  const renderStart=Math.max(0,segmentStart-overlap);
  const renderEnd=Math.min(tl.duration+.25,segmentEnd+overlap);
  const renderDuration=Math.max(.1,renderEnd-renderStart);

  const ctx=new OfflineAudioContext(1,Math.ceil(renderDuration*sr),sr);
  const cwBus=ctx.createGain();cwBus.gain.value=.82;
  const voiceBus=ctx.createGain();voiceBus.gain.value=.92;
  const comp=ctx.createDynamicsCompressor();
  comp.threshold.value=-3;comp.ratio.value=6;comp.attack.value=.003;comp.release.value=.18;
  cwBus.connect(comp).connect(ctx.destination);
  voiceBus.connect(ctx.destination);

  const relevant=tl.events.filter(e=>{
    const end=e.start+(e.duration||0);
    return e.start<renderEnd && end>renderStart;
  });

  const voiceIds=[...new Set(relevant
    .filter(e=>e.type==='voice'||e.type==='charVoice')
    .map(e=>e.type==='voice'?e.data.id:`char_${String(e.data.char).toLowerCase()}`))];
  const voiceBuffers=new Map();

  for(const id of voiceIds){
    const b=await voice.buffer(ctx,id,lang,gender);
    if(!b)throw new Error(`Required voice clip unavailable during video export: ${id}`);
    voiceBuffers.set(id,b);
  }

  for(const e of relevant){
    const local=e.start-renderStart;
    if(e.type==='cw'){
      if(local<0)continue; // overlap is chosen to make this rare for central content
      scheduleText(ctx,cwBus,e.data.text,local,{
        wpm:e.data.wpm||15,
        effectiveWpm:e.data.eff||15,
        tone:e.data.tone||tone,
        amp:.30
      });
    }else if(e.type==='check'){
      if(local>=0)scheduleCheckTone(ctx,cwBus,local,{amp:.14});
    }else if(e.type==='voice'||e.type==='charVoice'){
      const id=e.type==='voice'?e.data.id:`char_${String(e.data.char).toLowerCase()}`;
      const b=voiceBuffers.get(id);
      if(!b)continue;
      const src=ctx.createBufferSource();src.buffer=b;src.connect(voiceBus);
      if(local<0){
        const off=Math.min(b.duration-.01,Math.max(0,-local));
        if(off<b.duration-.01)src.start(0,off);
      }else{
        src.start(local);
      }
    }
  }

  const rendered=await ctx.startRendering();

  // Extract exactly the requested central interval, dropping overlap.
  const trimStart=Math.round((segmentStart-renderStart)*sr);
  const wantedFrames=Math.max(1,Math.round((segmentEnd-segmentStart)*sr));
  const available=Math.max(0,rendered.length-trimStart);
  const frames=Math.min(wantedFrames,available);
  const out=new AudioBuffer({length:frames,numberOfChannels:1,sampleRate:sr});
  out.copyToChannel(rendered.getChannelData(0).subarray(trimStart,trimStart+frames),0);
  onStatus(`audio segment ${segmentStart.toFixed(1)}-${segmentEnd.toFixed(1)}`);
  return out;
}

export async function exportWav(tl,voice,o,meta={}){
  const b=await renderOffline(tl,voice,o);
  o?.onStatus?.('building WAV…');o?.onProgress?.(.82);
  const out=wavBlob(b,meta);
  o?.onProgress?.(1);
  return out
}
async function ensureLame(){
  if(window.lamejs)return;
  await new Promise((resolve,reject)=>{
    const s=document.createElement('script');
    s.src='https://cdn.jsdelivr.net/npm/lamejs@1.2.1/lame.min.js';
    s.onload=resolve;s.onerror=()=>reject(new Error('Could not load MP3 encoder'));
    document.head.appendChild(s);
  });
}
export async function exportMp3(tl,voice,o,meta={}){
  o?.onProgress?.(.01);
  await ensureLame();
  if(!window.lamejs)throw new Error('MP3 encoder unavailable');
  const b=await renderOffline(tl,voice,o),pcm=b.getChannelData(0),enc=new lamejs.Mp3Encoder(1,b.sampleRate,128),chunks=[];
  const total=Math.ceil(pcm.length/1152);let block=0;
  for(let i=0;i<pcm.length;i+=1152){
    block++;
    const n=Math.min(1152,pcm.length-i),arr=new Int16Array(n);
    for(let j=0;j<n;j++)arr[j]=Math.max(-32768,Math.min(32767,pcm[i+j]*32767));
    const x=enc.encodeBuffer(arr);if(x.length)chunks.push(x);
    if(block%80===0||block===total){
      o?.onProgress?.(.64+.34*(block/total));
      o?.onStatus?.(`encoding MP3 ${Math.round(block/total*100)}%`);
      await new Promise(r=>setTimeout(r,0));
    }
  }
  const end=enc.flush();if(end.length)chunks.push(end);
  o?.onProgress?.(1);o?.onStatus?.('MP3 ready');
  return addId3(new Blob(chunks,{type:'audio/mpeg'}),meta)
}
export function download(blob,name){const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),4000)}
