export class HighlightEvents {
  constructor(profile) { this.profile=profile;this.events=[]; }
  highlight(type,at,data={}) {
    if(!this.profile[type]||!Number.isFinite(this.profile[type].duration)||this.profile[type].duration<=0)return null;
    const last=this.events.findLast(e=>e.type===type);
    if(last&&at-last.at<1800)return null;
    const event={type,kind:type,at,data:{...data},...this.profile[type]};
    this.events.push(event);if(this.events.length>8)this.events.shift();return event;
  }
  latest(time) { return this.events.findLast(e=>time-e.at>=0&&time-e.at<e.duration)??null; }
}
export function replayFrames(frames,events) {
  if(!frames.length)return [];
  const kind=e=>e.kind??e.type;
  const chosen=[events.find(e=>kind(e)==="perfect"),events.find(e=>kind(e)==="fail"),events.findLast(e=>kind(e)==="finish")].filter(Boolean).sort((a,b)=>a.at-b.at);
  const selected=frames.filter(f=>chosen.some(e=>f.at>=e.at-600&&f.at<=e.at+1500));
  return selected.length?selected:frames.slice(-32);
}
