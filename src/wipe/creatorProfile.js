export const wipeCreatorProfile = { brand:"WIPE!", SPARKLE:{kind:"perfect",label:"SHINE!",duration:450}, PERFECT:{kind:"perfect",label:"PERFECT WINDOW!",duration:1000} };
// Compress the WHOLE round, including the opaque start, rather than just its end.
export function selectWipeReplay(snapshot, result) {
  const frames=snapshot.frames;
  if(!frames.length)return {...snapshot,duration:7000};
  const last=frames.at(-1).at,finish=result.elapsed*1000;
  const before=frames.filter(f=>f.at<finish),after=frames.filter(f=>f.at>=finish);
  const selected=[];
  for(let i=0;i<40&&before.length;i++){
    const f=before[Math.min(before.length-1,Math.floor(i/39*(before.length-1)))];
    selected.push({...f,at:i/40*5000});
  }
  for(let i=0;i<8;i++){const f=after[Math.min(after.length-1,Math.floor(i/7*(after.length-1)))]??frames.at(-1);selected.push({...f,at:5000+i/8*1000});}
  return {...snapshot,frames:selected,events:[],duration:7000,source:result.source,originalDuration:last};
}
