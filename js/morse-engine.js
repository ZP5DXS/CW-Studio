export const MORSE = {A:'.-',B:'-...',C:'-.-.',D:'-..',E:'.',F:'..-.',G:'--.',H:'....',I:'..',J:'.---',K:'-.-',L:'.-..',M:'--',N:'-.',O:'---',P:'.--.',Q:'--.-',R:'.-.',S:'...',T:'-',U:'..-',V:'...-',W:'.--',X:'-..-',Y:'-.--',Z:'--..','0':'-----','1':'.----','2':'..---','3':'...--','4':'....-','5':'.....','6':'-....','7':'--...','8':'---..','9':'----.'};
export const PROSIGNS={BT:'-...-',AR:'.-.-.',SK:'...-.-',KN:'-.--.'};

export function unitSeconds(wpm){return 1.2/Math.max(1,wpm)}
export function patternFor(token){const t=token.toUpperCase();return PROSIGNS[t]||MORSE[t]||''}
export function tokenDuration(token,wpm){const u=unitSeconds(wpm),p=patternFor(token);if(!p)return 0;let d=0;[...p].forEach((c,i)=>{d+=c==='.'?u:3*u;if(i<p.length-1)d+=u});return d}
export function wordDuration(text,wpm,effectiveWpm=wpm){const chars=[...text.toUpperCase()].filter(c=>MORSE[c]);const charUnit=unitSeconds(wpm);const effUnit=unitSeconds(effectiveWpm);let d=0;chars.forEach((c,i)=>{d+=tokenDuration(c,wpm);if(i<chars.length-1)d+=Math.max(3*charUnit,3*effUnit)});return d}

// Smooth raised-cosine-ish amplitude ramps remove clicks. No square-wave keying.
function scheduleEnvelope(gain,start,end,amp=0.32,ramp=0.007){
  const r=Math.min(ramp,(end-start)/3);
  const curveIn=new Float32Array(32),curveOut=new Float32Array(32);
  for(let i=0;i<32;i++){const x=i/31;curveIn[i]=amp*.5*(1-Math.cos(Math.PI*x));curveOut[i]=amp*.5*(1+Math.cos(Math.PI*x));}
  gain.gain.setValueAtTime(0,start);
  gain.gain.setValueCurveAtTime(curveIn,start,r);
  gain.gain.setValueAtTime(amp,Math.max(start+r,end-r));
  gain.gain.setValueCurveAtTime(curveOut,Math.max(start+r,end-r),r);
  gain.gain.setValueAtTime(0,end);
}

export function scheduleToken(ctx,destination,token,start,{wpm=18,tone=700,amp=.30}={}){
  const p=patternFor(token);if(!p)return start;const u=unitSeconds(wpm);let t=start;
  for(const c of p){const dur=c==='.'?u:3*u;const osc=ctx.createOscillator();const g=ctx.createGain();osc.type='sine';osc.frequency.setValueAtTime(tone,t);g.gain.value=0;osc.connect(g).connect(destination);scheduleEnvelope(g,t,t+dur,amp);osc.start(t);osc.stop(t+dur+.015);t+=dur+u;}
  return t-u;
}

export function scheduleText(ctx,destination,text,start,{wpm=18,effectiveWpm=wpm,tone=700,amp=.30,onChar}={}){
  const u=unitSeconds(wpm),eu=unitSeconds(effectiveWpm);let t=start;const chars=[...text.toUpperCase()];
  chars.forEach((c)=>{if(c===' '){t+=7*eu;return}if(!MORSE[c])return;onChar?.(c,t);t=scheduleToken(ctx,destination,c,t,{wpm,tone,amp});t+=Math.max(3*u,3*eu)});return t-Math.max(3*u,3*eu)
}

// Polyphonic courtesy chime. Five short chord hits create a clear
// "tuk-tuk / tu-ru-tu" boundary that cannot be mistaken for a Morse dit/dah.
// Everything is still smoothly enveloped so there are no digital clicks.
function scheduleChordHit(ctx,destination,start,freqs,dur,amp){
  const mix=ctx.createGain();mix.gain.setValueAtTime(1/Math.max(1,freqs.length),start);mix.connect(destination);
  freqs.forEach((f,idx)=>{
    const osc=ctx.createOscillator(),g=ctx.createGain();
    osc.type=idx===0?'sine':'triangle';osc.frequency.setValueAtTime(f,start);g.gain.value=0;
    osc.connect(g).connect(mix);scheduleEnvelope(g,start,start+dur,amp,Math.min(.014,dur/4));
    osc.start(start);osc.stop(start+dur+.025);
  });
}

export function scheduleCheckTone(ctx,destination,start,{amp=.13}={}){
  const hits=[
    {freqs:[330,495],d:.075,g:.045},
    {freqs:[392,588],d:.075,g:.070},
    {freqs:[523.25,783.99],d:.060,g:.025},
    {freqs:[659.25,987.77],d:.060,g:.025},
    {freqs:[783.99,1174.66],d:.095,g:0}
  ];
  let t=start;
  for(const h of hits){scheduleChordHit(ctx,destination,t,h.freqs,h.d,amp);t+=h.d+h.g}
  return t;
}
