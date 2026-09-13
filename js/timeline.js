export class Timeline{
  constructor(meta={}){this.events=[];this.meta=meta;this.duration=0;this._maxDuration=0;this._sorted=true}
  add(type,start,duration,data={}){
    const d=Math.max(0,Number(duration)||0),s=Math.max(0,Number(start)||0);
    this.events.push({type,start:s,duration:d,data});
    this.duration=Math.max(this.duration,s+d);
    this._maxDuration=Math.max(this._maxDuration,d);
    this._sorted=false;
    return this;
  }
  sort(){this.events.sort((a,b)=>a.start-b.start);this._sorted=true;return this}
  at(time){
    const t=Number(time)||0,e=this.events;
    if(!e.length)return [];
    if(!this._sorted)this.sort();
    let lo=0,hi=e.length;
    while(lo<hi){const mid=(lo+hi)>>1;if(e[mid].start<=t)lo=mid+1;else hi=mid}
    const out=[],floor=t-this._maxDuration-.001;
    for(let i=lo-1;i>=0&&e[i].start>=floor;i--){
      const x=e[i];if(t>=x.start&&t<x.start+x.duration)out.push(x);
    }
    return out.reverse();
  }
}
