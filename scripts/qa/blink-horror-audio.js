// Real audio decode, gain and stereo nodes; no human audio claim.
async (page) => {
 const checks=[], check=(ok,n)=>{if(!ok)throw Error(n);checks.push(n);};
 await page.clock.resume();await page.goto(new URL(page.url()).origin+'/?qa=blink-audio#/feed/solo-blink-horror');
 await page.evaluate(async()=>{const {HorrorAudio}=await import('/src/blink/audio.js');window.__horrorAudio=new HorrorAudio();__horrorAudio.setMuted(true);__horrorAudio.start();});
 await page.waitForFunction(()=>Object.keys(__horrorAudio.samples).length===3);
 const evidence=await page.evaluate(()=>{
   const a=__horrorAudio, samples=Object.fromEntries(Object.entries(a.samples).map(([k,v])=>[k,v.duration])), calls=[];
   const original=a.sample.bind(a);a.sample=(n,v,p,r)=>{calls.push({n,v,p,r});return original(n,v,p,r);};
   const g={phase:'playing',paused:false,monster:1,elapsedMs:1000,stage:'RUN',lastEye:'EYES_OPEN',stageMs:0,rules:{passMs:4200}};a.update(g);
   const far=calls.some(c=>c.n==='step'&&c.r===.65&&c.v===.04);calls.length=0;
   g.stage='DONT_LOOK';for(let i=0;i<4200;i+=300){g.stageMs=i;g.elapsedMs=2000+i;a.update(g);}
   const pans=calls.filter(c=>c.n==='step').map(c=>c.p), muted=a.master.gain.value===0;
   const c=a.context;a.close();return {samples,far,pans,muted,state:c.state,nodes:a.nodes.size};
 });
 check(Object.values(evidence.samples).every(d=>d>0),'all three Kenney samples decode in real AudioContext');
 check(evidence.far,'FAR has quiet, slower remote footsteps');check(evidence.pans.some(p=>p<-.6)&&evidence.pans.some(p=>p>.5),'monster steps pass left to right');
 check(evidence.muted,'SFX mute controls master gain');check(evidence.nodes===0,'closing sound releases every sample');
 await page.waitForFunction(()=>__horrorAudio.context===null);return {checks,evidence};
}
