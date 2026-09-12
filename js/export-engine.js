import {scheduleText,scheduleCheckTone} from './morse-engine.js?v=12';

function ascii(s){return new TextEncoder().encode(s)}
function concat(...parts){const n=parts.reduce((a,p)=>a+p.length,0),o=new Uint8Array(n);let x=0;for(const p of parts){o.set(p,x);x+=p.length}return o}
function synchsafe(n){return new Uint8Array([(n>>21)&127,(n>>14)&127,(n>>7)&127,n&127])}
function id3Frame(id,text){const enc=new TextEncoder().encode(text),data=concat(new Uint8Array([3]),enc),h=new Uint8Array(10);h.set(ascii(id),0);new DataView(h.buffer).setUint32(4,data.length);return concat(h,data)}
function addId3(blob,meta){const frames=[id3Frame('TIT2',meta.title||'CW Studio Session'),id3Frame('TPE1','ZP5DXS / Morse Practice'),id3Frame('TALB','CW Studio'),id3Frame('COMM',meta.comment||'Generated with CW Studio')];const body=concat(...frames),head=concat(ascii('ID3'),new Uint8Array([3,0,0]),synchsafe(body.length));return new Blob([head,body,blob],{type:'audio/mpeg'})}

function strChunk(id,text){let b=new TextEncoder().encode(text+'\0');if(b.length%2)b=concat(b,new Uint8Array([0]));const h=new Uint8Array(8);h.set(ascii(id),0);new DataView(h.buffer).setUint32(4,b.length,true);return concat(h,b)}
function wavBlob(buffer,meta={}){const ch=buffer.numberOfChannels,sr=buffer.sampleRate,dataLen=buffer.length*ch*2;const infoBody=concat(ascii('INFO'),strChunk('INAM',meta.title||'CW Studio Session'),strChunk('IART','ZP5DXS / Morse Practice'),strChunk('ICMT',meta.comment||'Generated with CW Studio'));const listHead=new Uint8Array(8);listHead.set(ascii('LIST'),0);new DataView(listHead.buffer).setUint32(4,infoBody.length,true);const list=concat(listHead,infoBody);const riffSize=36+dataLen+list.length,ab=new ArrayBuffer(44+dataLen),v=new DataView(ab);const ws=(o,s)=>[...s].forEach((c,i)=>v.setUint8(o+i,c.charCodeAt(0)));ws(0,'RIFF');v.setUint32(4,riffSize,true);ws(8,'WAVEfmt ');v.setUint32(16,16,true);v.setUint16(20,1,true);v.setUint16(22,ch,true);v.setUint32(24,sr,true);v.setUint32(28,sr*ch*2,true);v.setUint16(32,ch*2,true);v.setUint16(34,16,true);ws(36,'data');v.setUint32(40,dataLen,true);let o=44;for(let i=0;i<buffer.length;i++)for(let c=0;c<ch;c++){const s=Math.max(-1,Math.min(1,buffer.getChannelData(c)[i]));v.setInt16(o,s<0?s*32768:s*32767,true);o+=2}return new Blob([ab,list],{type:'audio/wav'})}

export async function renderOffline(tl,voice,{lang='es',gender='female',tone=700,onStatus=()=>{}}={}){
  const sr=44100;
  const ctx=new OfflineAudioContext(1,Math.ceil((tl.duration+.5)*sr),sr);
  const master=ctx.createGain();
  master.gain.value=.82;
  const comp=ctx.createDynamicsCompressor();
  comp.threshold.value=-3;comp.ratio.value=6;comp.attack.value=.003;comp.release.value=.18;
  master.connect(comp).connect(ctx.destination);

  const voiceEvents=tl.events.filter(e=>e.type==='voice'||e.type==='charVoice');
  let vi=0;
  for(const e of tl.events){
    if(e.type==='cw'){
      scheduleText(ctx,master,e.data.text,e.start,{wpm:e.data.wpm||15,effectiveWpm:e.data.eff||15,tone:e.data.tone||tone,amp:.30});
    }else if(e.type==='check'){
      scheduleCheckTone(ctx,master,e.start,{amp:.14});
    }else if(e.type==='voice'||e.type==='charVoice'){
      vi++;
      const id=e.type==='voice'?e.data.id:`char_${String(e.data.char).toLowerCase()}`;
      onStatus(`loading voice ${vi}/${voiceEvents.length} · ${id}`);
      const b=await voice.buffer(ctx,id,lang,gender);
      if(b){
        const s=ctx.createBufferSource();s.buffer=b;s.connect(master);s.start(e.start);
      }
    }
  }
  onStatus('rendering audio…');
  const rendered=await ctx.startRendering();
  onStatus('audio ready');
  return rendered;
}
export async function exportWav(tl,voice,o,meta={}){return wavBlob(await renderOffline(tl,voice,o),meta)}
async function ensureLame(){
  if(window.lamejs)return;
  await new Promise((resolve,reject)=>{
    const s=document.createElement('script');
    s.src='https://cdn.jsdelivr.net/npm/lamejs@1.2.1/lame.min.js';
    s.onload=resolve;s.onerror=()=>reject(new Error('Could not load MP3 encoder'));
    document.head.appendChild(s);
  });
}
export async function exportMp3(tl,voice,o,meta={}){await ensureLame();if(!window.lamejs)throw new Error('MP3 encoder unavailable');const b=await renderOffline(tl,voice,o),pcm=b.getChannelData(0),enc=new lamejs.Mp3Encoder(1,b.sampleRate,128),chunks=[];for(let i=0;i<pcm.length;i+=1152){const n=Math.min(1152,pcm.length-i),arr=new Int16Array(n);for(let j=0;j<n;j++)arr[j]=Math.max(-32768,Math.min(32767,pcm[i+j]*32767));const x=enc.encodeBuffer(arr);if(x.length)chunks.push(x)}const end=enc.flush();if(end.length)chunks.push(end);return addId3(new Blob(chunks,{type:'audio/mpeg'}),meta)}
export function download(blob,name){const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),4000)}
