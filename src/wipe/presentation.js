import cover from "./assets/cover-v1.webp";
import { copy } from "./messages.js";
import { escapeHtml as esc } from "../platform/copy.js";
import { WipeReplay } from "./replay.js";
import "./wipe.css";
export function launchMarkup(game,locale){
  const t=copy(locale),duo=game.mode==="duo";
  return `<section class="wipe-entry" data-wipe-mode="${duo?"duo":"solo"}" data-recording="play" data-face="ORIGINAL"><div class="wipe-meta"><span>EXP-049 / A LITTLE FRESH START</span><span>HAND · ${duo?"45":"30"} SEC</span></div>
    <div class="wipe-entry-grid"><div class="wipe-cover"><img src="${cover}" width="720" height="1280" alt="${locale==="ja"?"黄色いスポンジで曇りを拭き取ると、朝日の窓が現れる":"A yellow sponge wipes fog away to reveal a sunny window"}"><h1>WIPE<span>!</span></h1><span class="wipe-cover-label">A CLEAN<br>SLATE.</span><span class="wipe-sticker">WAVE.<br>WIPE.<br>WOW.</span></div>
    <div class="wipe-entry-content"><p class="wipe-kicker">MAKE ROOM FOR A LITTLE SHINE.</p><h2 class="wipe-tagline">${t.tagline}</h2><p class="wipe-sub">${t.sub}</p>
    <div class="wipe-mode-picker" role="group" aria-label="SOLO / DUO">${["solo","duo"].map(m=>`<button type="button" data-wipe-mode="${m}" aria-pressed="${m===(duo?"duo":"solo")}"><b>${m.toUpperCase()}</b><span>${t[m]}</span></button>`).join("")}</div>
    <ol class="wipe-steps">${t.steps.map(([a,b],i)=>`<li><b>0${i+1}</b><div><strong>${a}</strong><span>${b}</span></div></li>`).join("")}</ol>
    <div class="wipe-record-picker" role="group" aria-label="PLAY / CREATOR"><button type="button" data-wipe-recording="play" aria-pressed="true">PLAY</button><button type="button" data-wipe-recording="creator" aria-pressed="false">CREATOR <small>7 SEC</small></button></div>
    <div class="wipe-face-picker" hidden><p>${t.faceChoice}</p><div role="group" aria-label="${t.faceChoice}">${["ORIGINAL","EFFECT","HIDE"].map(m=>`<button type="button" data-wipe-face="${m}" aria-pressed="${m==="ORIGINAL"}">${m}<small>${t[m.toLowerCase()]}</small></button>`).join("")}</div><p>${t.creatorNotice}</p></div>
    <div class="launch-controls wipe-launch"><button type="button" class="launch-camera wipe-primary" disabled>LET'S WIPE ↗</button><button type="button" class="launch-demo wipe-secondary" disabled>${t.practice}</button><button type="button" class="launch-howto wipe-text">${t.howto} ↗</button></div><p class="launch-status" role="status"></p><details class="wipe-privacy"><summary>${t.privacy}</summary><p>${esc(game[locale==="ja"?"privacyJa":"privacyEn"])}</p></details></div></div></section>`;
}
export function howtoMarkup(game,locale){const t=copy(locale);return `<h2 id="sheet-title">WIPE! · ${t.howto}</h2><p>${t.tagline}</p><ol>${t.steps.map(([a,b])=>`<li><strong>${a}</strong><p>${b}</p></li>`).join("")}</ol><p>${t.rules}</p><p>${t.cameraHint}</p><p>${t.demoHint}</p><p>${esc(game[locale==="ja"?"privacyJa":"privacyEn"])}</p>`;}
export function resultMarkup(game,r,locale){
  const t=copy(locale),perfect=r.reason==="perfect",duo=r.mode==="duo",title=perfect?(duo?(r.winner?`P${r.winner} WINS!`:t.tie):"PERFECT WINDOW!"):(duo?(r.winner?`P${r.winner} WINS!`:t.timeTie):t.progress);
  return `<section class="wipe-result"><div class="wipe-meta"><span>WIPE! / ${duo?"DUO":"SOLO"}</span><span>${perfect?"✦ ALL CLEAR":t.finishTime}</span></div><div class="wipe-result-mark" aria-hidden="true">✦</div><p class="wipe-result-title">${title}</p><div class="wipe-result-clean">${r.clean.map((value,i)=>`<div>${duo?`<span>P${i+1}</span>`:""}<h2>${value}<small>%</small></h2><span>CLEAN</span></div>`).join("")}</div>
    ${r.source==="demo"?`<p class="wipe-practice-label">${t.demo}</p>`:""}<dl class="wipe-result-stats"><div><dt>${t.resultTime}</dt><dd>${r.elapsed.toFixed(1)}<small> sec</small></dd></div>${duo?`<div><dt>${t.attackCount}</dt><dd>P1 ${r.attacks[0]} <small> / </small>P2 ${r.attacks[1]}</dd></div>`:r.best?`<div><dt>${t.best}</dt><dd>${r.best.toFixed(1)}<small> sec</small></dd></div>`:""}</dl>
    ${r.creator?.frames.length?`<div class="wipe-replay"><h3>BEFORE → AFTER <small>7 SEC · ${esc(r.creator.faceMode)}</small></h3><canvas role="img" aria-label="WIPE! Before to After replay"></canvas><div class="wipe-clip-actions"><button type="button" class="wipe-secondary" data-wipe-clip="replay">${t.replay} ↻</button><button type="button" class="wipe-secondary" data-wipe-clip="encode">${t.encode}</button><button type="button" class="wipe-secondary" data-wipe-clip="save" disabled>${t.save}</button><button type="button" class="wipe-secondary" data-wipe-clip="share" disabled>${t.videoShare}</button></div><p class="wipe-export-status" role="status"></p><p class="wipe-privacy">${t.clipNotice}</p></div>`:""}
    <div class="result-actions wipe-result-actions"><button type="button" class="wipe-primary" data-result-action="retry">${t.again} ↻</button><button type="button" class="wipe-secondary" data-result-action="next">${t.next} →</button><button type="button" class="wipe-text" data-result-action="share">${t.share} ↗</button></div></section>`;
}
export function paint(){}
export function mountResult(root,result,locale){if(!result.creator?.frames.length)return;const replay=new WipeReplay(root,result,copy(locale));return ()=>replay.dispose();}
export function discardResult(result){if(result?.creator){result.creator.frames=[];result.creator.events=[];result.creator.file=null;}}
export function handleLaunchClick(root,event){
  const e=root.querySelector(".wipe-entry"),mode=event.target.closest("button[data-wipe-mode]"),record=event.target.closest("[data-wipe-recording]"),face=event.target.closest("[data-wipe-face]");if(!e||!mode&&!record&&!face)return false;
  if(mode){if(mode.dataset.wipeMode!==e.dataset.wipeMode){location.hash=`#/game/${mode.dataset.wipeMode}-wipe`;return true;}e.querySelectorAll("button[data-wipe-mode]").forEach(b=>b.setAttribute("aria-pressed",String(b===mode)));}
  if(record){e.dataset.recording=record.dataset.wipeRecording;e.querySelector(".wipe-face-picker").hidden=e.dataset.recording!=="creator";e.querySelectorAll("[data-wipe-recording]").forEach(b=>b.setAttribute("aria-pressed",String(b===record)));}
  if(face){e.dataset.face=face.dataset.wipeFace;e.querySelectorAll("[data-wipe-face]").forEach(b=>b.setAttribute("aria-pressed",String(b===face)));}
  return true;
}
export function readOptions(root){const e=root.querySelector(".wipe-entry");return {mode:e?.dataset.wipeMode??"solo",creator:e?.dataset.recording==="creator",faceMode:e?.dataset.face??"ORIGINAL"};}
