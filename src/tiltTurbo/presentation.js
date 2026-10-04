import cover from './assets/cover-v1.webp';
import { copy } from './messages.js';
import { escapeHtml as esc } from '../platform/copy.js';
import { Replay } from '../creator/Replay.js';
import './tiltTurbo.css';
import '../creator/creator.css';
export function launchMarkup(game,locale){const t=copy(locale);return `<section class="tt-entry" data-mode="play" data-face="ORIGINAL"><div class="tt-meta"><span>EXP-053 / HEAD STEERING</span><span>20 SEC · NO HANDS</span></div><div class="tt-entry-grid">
  <div class="tt-cover"><img src="${cover}" width="720" height="1280" alt="${locale==='ja'?'顔を傾けて、オレンジの車で曲がりくねった道を走る':'A tilted head steers an orange toy car around a winding road'}"><h1>TILT<br><span>TURBO</span></h1><span class="tt-sticker">YOUR HEAD.<br>YOUR WHEEL.</span><span class="tt-cover-bottom">A LITTLE TILT. A BIG JOYRIDE.</span></div>
  <div class="tt-entry-copy"><p class="tt-kicker">TAKE YOUR HEAD FOR A SPIN.</p><p class="tt-tagline">${locale==='ja'?'顔を傾けて、<br>20秒の大冒険。':t.tagline}</p><div class="tt-gesture" aria-hidden="true"><span>↙</span><b>🙂</b><span>↘</span></div><p class="tt-simple">TILT YOUR HEAD</p><p class="tt-description">${locale==='ja'?'左に傾く → 左へ。右に傾く → 右へ。':'Tilt left → go left. Tilt right → go right.'}</p>
  <div class="creator-mode-tabs" role="group" aria-label="PLAY / CREATOR"><button type="button" data-creator-mode="play" aria-pressed="true">PLAY</button><button type="button" data-creator-mode="creator" aria-pressed="false">CREATOR</button></div>
  <div class="creator-face-picker" hidden><p>${t.faceChoice}</p><div class="creator-face-options">${['ORIGINAL','EFFECT','HIDE'].map(m=>`<button type="button" data-face-mode="${m}" aria-pressed="${m==='ORIGINAL'}">${m}<small>${t[m.toLowerCase()]}</small></button>`).join('')}</div><p>${t.creatorNotice}</p></div>
  <div class="launch-controls tt-launch"><button class="launch-camera tt-primary" type="button" disabled>LET’S RACE ↗</button><button class="launch-demo tt-secondary" type="button" disabled>${t.practice}</button><button class="launch-howto tt-text" type="button">${t.howto} ↗</button></div><p class="launch-status" role="status"></p><details class="tt-privacy"><summary>${t.privacy}</summary><p>${esc(game[locale==='ja'?'privacyJa':'privacyEn'])}</p></details></div></div></section>`;}
export function howtoMarkup(game,locale){const t=copy(locale);return `<h2 id="sheet-title">TILT TURBO · ${t.howto}</h2><p>${locale==='ja'?'正面を約0.7秒見て、顔を軽く左右へ傾けよう。すぐ車が動きます。そのまま3・2・1で20秒のレースへ。':'Look straight for about 0.7 seconds, then tilt gently. Your car moves immediately. A quick 3–2–1 starts the 20-second race.'}</p><p>${locale==='ja'?'曲がる道に合わせて車を動かし、コーンをよけよう。ぶつかってもすぐ復帰。最後は左右の切り返しとジャンプ！ ±5°は直進、25°で最大。':'Follow the bends and dodge cones. Bonks slow you briefly; the race keeps going. Finish with quick turns and a jump! ±5° stays neutral; 25° gives full steering.'}</p><p>${t.hint}</p><p>${locale==='ja'?'スコア = 距離 ×4 + クリーン + ニアミス ×100 + ドリフト。顔を見失うと中央へゆっくり戻り、認識後すぐ復帰します。':'Score = distance ×4 + clean bonus + near misses ×100 + drift. If your face is lost, the car returns gently to center and recovers immediately when detected.'}</p><p>${esc(game[locale==='ja'?'privacyJa':'privacyEn'])}</p><p>SE: Kenney Impact Sounds · CC0</p>`;}
export function resultMarkup(game,r,locale){const t=copy(locale);return `<section class="tt-result"><div class="tt-meta"><span>TILT TURBO / FINISH!</span><span>${r.source==='demo'?'PRACTICE':'FRONT CAMERA'}</span></div><div class="tt-result-heading"><p>WHAT A JOYRIDE.</p><h2>FINISH!</h2><span>20.00 SEC</span></div><p class="tt-score"><span>SCORE</span><strong>${r.score}</strong></p>${r.source==='demo'?`<p class="tt-practice-label">${t.demo}</p>`:''}
  <dl class="tt-stats"><div><dt>HIT</dt><dd>${r.hits}</dd></div><div><dt>NEAR</dt><dd>${r.near}</dd></div><div><dt>MAX TILT</dt><dd>${r.maxTilt}°</dd></div></dl><p class="tt-breakdown">${t.distance} ${r.distance}m · ${t.clean} +${r.cleanBonus}<br>${t.drift} +${r.driftBonus}${r.source==='camera'?` · ${t.lost} ${r.faceLosses}`:''}</p>
  ${r.creator?.frames.length?`<div class="tt-replay"><h3>LAST TURBO <small>7 SEC · ${esc(r.creator.faceMode)}</small></h3><canvas class="tt-replay-canvas" role="img" aria-label="TILT TURBO replay"></canvas><div><button class="tt-replay-play tt-secondary" type="button">${t.replay} ↻</button><button class="tt-save tt-secondary" type="button">${t.save} ↓</button></div><p class="tt-export-status" role="status">${locale==='ja'?'リプレイと動画は音声なしです。':'Replay and saved clips are silent.'}</p></div>`:''}
  <div class="result-actions tt-result-actions"><button class="tt-primary" type="button" data-result-action="retry">ONE MORE ↗</button><button class="tt-secondary" type="button" data-result-action="next">NEXT →</button><button class="tt-text" type="button" data-result-action="share">SHARE ↗</button></div></section>`;}
class TurboReplay extends Replay {
  constructor(canvas,result){super(canvas,result);this.stats=result.stats;}
  outro(){const c=this.canvas.getContext('2d');c.fillStyle='#183c3c';c.fillRect(0,0,270,480);c.fillStyle='#fff7df';c.textAlign='center';c.font='900 44px Impact, sans-serif';c.fillText('TILT TURBO',135,190);c.fillStyle='#f16b39';c.fillText('FINISH!',135,243);c.fillStyle='#fff7df';c.font='700 19px Trebuchet MS, sans-serif';c.fillText(`SCORE ${this.stats.score}`,135,283);c.font='700 12px Trebuchet MS, sans-serif';c.fillText(`HIT ${this.stats.hits} · NEAR ${this.stats.near} · ${this.stats.maxTilt}°`,135,315);}
}
export function mountResult(root,r,locale){
  if(!r.creator?.frames.length)return;
  const canvas=root.querySelector('.tt-replay-canvas'),player=new TurboReplay(canvas,r.creator),button=root.querySelector('.tt-replay-play'),save=root.querySelector('.tt-save'),status=root.querySelector('.tt-export-status');
  let disposed=false,recorder=null,stream=null,timer=null;
  const stopRecording=()=>{if(recorder?.state==='recording')recorder.stop();clearTimeout(timer);stream?.getTracks().forEach(t=>t.stop());stream=null;};
  const play=()=>player.play();
  const encode=()=>{
    if(!globalThis.MediaRecorder||!canvas.captureStream){status.textContent=locale==='ja'?'このブラウザではリプレイのみ利用できます。':'Replay only in this browser.';return;}
    if(recorder?.state==='recording')return;
    const mime=['video/webm;codecs=vp9','video/webm;codecs=vp8','video/mp4','video/webm'].find(m=>MediaRecorder.isTypeSupported(m));
    if(!mime){status.textContent=locale==='ja'?'このブラウザでは保存できません。':'Clip saving is unavailable.';return;}
    try {
      const chunks=[];stream=canvas.captureStream(24);recorder=new MediaRecorder(stream,{mimeType:mime,videoBitsPerSecond:1200000});
      recorder.ondataavailable=e=>{if(e.data.size)chunks.push(e.data);};
      recorder.onstop=()=>{stream?.getTracks().forEach(t=>t.stop());stream=null;clearTimeout(timer);save.disabled=false;if(disposed||!chunks.length||document.hidden)return;
        const url=URL.createObjectURL(new Blob(chunks,{type:mime})),a=document.createElement('a');a.href=url;a.download=`tilt-turbo-${r.score}.${mime.includes('mp4')?'mp4':'webm'}`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);status.textContent=locale==='ja'?'7秒の動画を保存しました。':'Your seven-second clip was saved.';};
      recorder.onerror=()=>{stopRecording();save.disabled=false;status.textContent=locale==='ja'?'保存できませんでした。':'Could not save the clip.';};
      save.disabled=true;status.textContent=locale==='ja'?'動画を準備しています…':'Preparing your clip…';recorder.start();player.play();timer=setTimeout(stopRecording,7000);
    }catch{stopRecording();save.disabled=false;status.textContent=locale==='ja'?'保存できませんでした。':'Could not save the clip.';}
  };
  const background=()=>{if(document.hidden){player.stop();stopRecording();}};
  button.addEventListener('click',play);save.addEventListener('click',encode);document.addEventListener('visibilitychange',background);player.play();
  return()=>{disposed=true;stopRecording();player.dispose();button.removeEventListener('click',play);save.removeEventListener('click',encode);document.removeEventListener('visibilitychange',background);};
}
export function discardResult(r){if(r?.creator){r.creator.frames=[];r.creator.candidates=[];}}
export function paint(){}
export function handleLaunchClick(root,event){const e=root.querySelector('.tt-entry'),mode=event.target.closest('[data-creator-mode]'),face=event.target.closest('[data-face-mode]');if(!e||(!mode&&!face))return false;
  if(mode){e.dataset.mode=mode.dataset.creatorMode;e.querySelector('.creator-face-picker').hidden=e.dataset.mode!=='creator';e.querySelectorAll('[data-creator-mode]').forEach(b=>b.setAttribute('aria-pressed',String(b===mode)));}
  if(face){e.dataset.face=face.dataset.faceMode;e.querySelectorAll('[data-face-mode]').forEach(b=>b.setAttribute('aria-pressed',String(b===face)));}return true;
}
export function readOptions(root){const e=root.querySelector('.tt-entry');return {creator:e?.dataset.mode==='creator',faceMode:e?.dataset.face??'ORIGINAL'};}
