import "./style.css";
import { registerSW } from "virtual:pwa-register";
import { HandInput } from "./input/handInput.js";
import { FingerGunInput } from "./input/fingerGunInput.js";
import { FaceInput } from "./input/faceInput.js";
import { HandBeat } from "./games/handBeat.js";
import { FingerGunGame } from "./games/fingerGun.js";
import { EatDontEatGame } from "./games/eatDontEat.js";
import { DuoArcade } from "./duo/duoArcade.js";
import { NoteBlasterArcade } from "./blaster/noteBlasterArcade.js";
import { getInitialLocale, translate } from "./i18n.js";

registerSW({ immediate: true });

const app = document.querySelector("#app");

app.innerHTML = `
  <section class="lab">
    <header class="lab__header">
      <div class="lab__topline">
        <p id="eyebrow" class="eyebrow"></p>
        <div id="language-switch" class="language-switch" role="group">
          <button id="language-ja" class="language-switch__button" type="button" lang="ja">日本語</button>
          <button id="language-en" class="language-switch__button" type="button" lang="en">English</button>
        </div>
      </div>
      <h1 id="mode-title">HAND BEAT</h1>
      <p id="lead" class="lead"></p>

      <nav id="mode-navigation" class="mode-switch" role="group">
        <button id="mode-hand-beat" class="mode-switch__button" type="button" data-mode="handBeat"></button>
        <button id="mode-finger-gun" class="mode-switch__button" type="button" data-mode="fingerGun"></button>
        <button id="mode-eat-dont-eat" class="mode-switch__button" type="button" data-mode="eatDontEat"></button>
        <button id="mode-note-blaster" class="mode-switch__button" type="button" data-mode="noteBlaster"></button>
        <button id="mode-duo-arcade" class="mode-switch__button" type="button" data-mode="duoArcade"></button>
      </nav>
    </header>

    <div id="solo-experience">
    <section id="stage" class="stage" aria-label="">
      <video id="camera" class="camera" autoplay muted playsinline></video>
      <div class="camera-shade" aria-hidden="true"></div>

      <div class="hud">
        <div class="hud__top">
          <span id="camera-status" class="status"></span>
          <span id="detected" class="detected">—</span>
        </div>

        <div id="hand-beat-panel" class="mode-panel">
          <div class="target">
            <div id="target-icon" class="target__icon">📷</div>
            <div id="target-label" class="target__label"></div>
            <div id="feedback" class="feedback" aria-live="polite"></div>
          </div>
          <div id="upcoming" class="upcoming" aria-label=""></div>
        </div>

        <div id="finger-gun-panel" class="mode-panel" hidden>
          <div id="finger-target" class="finger-target" hidden aria-hidden="true">
            <span class="finger-target__ring"></span>
            <span class="finger-target__core"></span>
            <span id="finger-target-label" class="finger-target__label"></span>
          </div>
          <div id="finger-aim" class="finger-aim" hidden aria-hidden="true">
            <span></span>
          </div>
          <div class="target target--finger">
            <div class="target__icon" aria-hidden="true">☞</div>
            <div id="finger-prompt" class="target__label"></div>
            <div id="finger-feedback" class="feedback" aria-live="polite"></div>
          </div>
        </div>

        <div id="eat-panel" class="mode-panel" hidden>
          <div class="target target--eat">
            <div id="eat-icon" class="target__icon">🍎</div>
            <div id="eat-label" class="target__label"></div>
            <div id="eat-feedback" class="feedback" aria-live="polite"></div>
            <div id="eat-question" class="eat-question"></div>
          </div>
        </div>

        <div class="progress" aria-hidden="true">
          <div id="progress-bar" class="progress__bar"></div>
        </div>
      </div>
    </section>

    <section id="scoreboard" class="scoreboard" aria-live="polite">
      <div>
        <span id="score-label" class="scoreboard__label"></span>
        <strong id="score">0</strong>
      </div>
      <div>
        <span id="hits-label" class="scoreboard__label"></span>
        <strong id="hits">0 / 16</strong>
      </div>
      <div id="time-stat" hidden>
        <span id="time-label" class="scoreboard__label"></span>
        <strong id="time-left">15s</strong>
      </div>
    </section>

    <div class="actions">
      <button id="camera-button" class="button button--primary" type="button"></button>
      <button id="play-button" class="button" type="button" disabled></button>
    </div>

    <p id="message" class="message" aria-live="polite"></p>

    <details class="howto">
      <summary id="howto-summary"></summary>
      <div id="hand-beat-howto" class="howto__content">
        <div class="gesture-grid">
          <span>✋ <span id="gesture-open"></span></span>
          <span>✊ <span id="gesture-fist"></span></span>
          <span>✌️ <span id="gesture-peace"></span></span>
          <span>🤏 <span id="gesture-pinch"></span></span>
        </div>
        <p id="hand-beat-instructions"></p>
      </div>
      <div id="finger-gun-howto" class="howto__content" hidden>
        <p id="finger-gun-instructions"></p>
        <p class="music-credit">
          <span id="music-credit-prefix"></span>
          <a href="https://opentracks.com/bgm/detail/1978" target="_blank" rel="noopener noreferrer">8-bit Aggressive1</a>
          <span id="music-credit-suffix"></span>
        </p>
      </div>
      <div id="eat-howto" class="howto__content" hidden>
        <p id="eat-instructions"></p>
      </div>
    </details>
    </div>
    <section id="duo-experience" hidden></section>
    <section id="note-blaster-experience" hidden></section>
  </section>
`;

const $ = (selector) => document.querySelector(selector);
const video = $("#camera");
const stage = $("#stage");
const modeTitle = $("#mode-title");
const lead = $("#lead");
const modeButtons = [...document.querySelectorAll("[data-mode]")];
const handBeatPanel = $("#hand-beat-panel");
const fingerGunPanel = $("#finger-gun-panel");
const eatPanel = $("#eat-panel");
const handBeatHowto = $("#hand-beat-howto");
const fingerGunHowto = $("#finger-gun-howto");
const eatHowto = $("#eat-howto");
const cameraStatus = $("#camera-status");
const detected = $("#detected");
const targetIcon = $("#target-icon");
const targetLabel = $("#target-label");
const upcoming = $("#upcoming");
const feedback = $("#feedback");
const fingerPrompt = $("#finger-prompt");
const fingerFeedback = $("#finger-feedback");
const fingerTarget = $("#finger-target");
const fingerTargetLabel = $("#finger-target-label");
const fingerAim = $("#finger-aim");
const eatIcon = $("#eat-icon");
const eatLabel = $("#eat-label");
const eatFeedback = $("#eat-feedback");
const eatQuestion = $("#eat-question");
const scoreLabel = $("#score-label");
const hitsLabel = $("#hits-label");
const score = $("#score");
const hits = $("#hits");
const timeStat = $("#time-stat");
const timeLabel = $("#time-label");
const timeLeft = $("#time-left");
const progressBar = $("#progress-bar");
const cameraButton = $("#camera-button");
const playButton = $("#play-button");
const message = $("#message");
const musicCreditPrefix = $("#music-credit-prefix");
const musicCreditSuffix = $("#music-credit-suffix");

const fingerGunMusic = new Audio();
fingerGunMusic.volume = 0.22;
const fingerGunMusicReady = import("./assets/music/fingerGunTheme.js")
  .then(({ default: themeUrl }) => {
    fingerGunMusic.src = themeUrl;
    return fingerGunMusic;
  })
  .catch(() => null);

const GESTURE_ICONS = {
  OPEN: "✋",
  FIST: "✊",
  PEACE: "✌️",
  PINCH: "🤏"
};

const state = {
  locale: getInitialLocale(),
  mode: "handBeat",
  cameraStatus: "OFF",
  cameraReady: false,
  cameraLoading: false,
  sessionActive: false,
  message: { key: "cameraPrivacy" },
  hand: {
    gesture: "NONE",
    target: null,
    upcoming: [],
    feedback: null,
    progress: 0,
    score: 0,
    hits: 0,
    total: 16,
    result: null
  },
  finger: {
    aim: null,
    target: null,
    feedback: null,
    progress: 0,
    seconds: 15,
    score: 0,
    hits: 0,
    shots: 0,
    accuracy: 0,
    result: null
  },
  eat: {
    mouth: {
      visible: false,
      calibrated: false,
      ready: false,
      open: false,
      openness: 0,
      progress: 0
    },
    item: null,
    feedback: null,
    progress: 0,
    seconds: 15,
    score: 0,
    hits: 0,
    total: 12,
    result: null
  }
};

const duoArcade = new DuoArcade($("#duo-experience"), state.locale, { onExit: () => selectMode("handBeat") });
const noteBlaster = new NoteBlasterArcade($("#note-blaster-experience"), state.locale);

function t(key, values) {
  return translate(state.locale, key, values);
}

function setMessage(key, values) {
  state.message = { key, values };
  message.textContent = t(key, values);
}

function setCameraStatus(status) {
  state.cameraStatus = status;
  state.cameraLoading = status === "LOADING_MODEL" || status === "REQUESTING_CAMERA";
  state.cameraReady = status === "READY";

  if (status === "READY" && !state.sessionActive) {
    const readyMessage = {
      handBeat: "cameraReadyMessage",
      fingerGun: "cameraReadyFingerMessage",
      eatDontEat: "cameraReadyEatMessage"
    }[state.mode];
    setMessage(readyMessage);
  } else if (status === "ERROR") {
    setMessage("cameraStartError");
  }

  renderUi();
}

function createInputStatusHandler() {
  return (status) => setCameraStatus(status);
}

const handInput = new HandInput(video, {
  onGesture(gesture) {
    state.hand.gesture = gesture;
    if (state.mode === "handBeat") renderReadout();
  },
  onStatus: createInputStatusHandler()
});

const fingerGunInput = new FingerGunInput(video, {
  onAim(aim) {
    state.finger.aim = aim;
    if (state.mode === "fingerGun") renderFingerAim();
  },
  onShot(aim) {
    if (state.mode === "fingerGun" && state.sessionActive) {
      fingerGunGame.shoot(aim);
    }
  },
  onStatus: createInputStatusHandler()
});

const faceInput = new FaceInput(video, {
  onMouth(mouth) {
    state.eat.mouth = mouth;
    if (state.mode === "eatDontEat") {
      renderReadout();
      renderPlayButton();
    }
  },
  onStatus: createInputStatusHandler()
});

const handGame = new HandBeat({
  getGesture: () => handInput.currentGesture,

  onTarget({ current, upcoming: next }) {
    state.hand.target = current;
    state.hand.upcoming = next.map((item) => ({
      icon: item.icon,
      gesture: item.text
    }));
    state.hand.feedback = null;
    renderHandBeat();
  },

  onScore(result) {
    state.hand.score = result.score;
    state.hand.hits = result.hits;
    state.hand.total = result.total;
    renderScoreboard();
  },

  onFeedback(result) {
    state.hand.feedback = result;
    renderHandBeatFeedback();
  },

  onProgress(value) {
    state.hand.progress = value;
    renderProgress();
  },

  onFinish(result) {
    state.sessionActive = false;
    state.hand.result = result;
    state.hand.feedback = null;
    state.message = {
      key: result.accuracy >= 80 ? "handBeatFinishHigh" : "handBeatFinishLow",
      values: { accuracy: result.accuracy }
    };
    renderUi();
  }
});

const fingerGunGame = new FingerGunGame({
  onTime({ seconds, progress }) {
    state.finger.seconds = seconds;
    state.finger.progress = progress;
    renderFingerTime();
    renderProgress();
  },

  onScore(result) {
    state.finger.score = result.score;
    state.finger.hits = result.hits;
    state.finger.shots = result.shots;
    state.finger.accuracy = result.accuracy;
    renderScoreboard();
  },

  onTarget(target) {
    state.finger.target = target;
    renderFingerTarget();
  },

  onFeedback(result) {
    state.finger.feedback = result;
    renderFingerFeedback();
  },

  onFinish(result) {
    stopFingerGunMusic();
    state.sessionActive = false;
    state.finger.target = null;
    state.finger.result = result;
    state.finger.feedback = null;
    state.finger.progress = 1;
    state.message = {
      key: "fingerFinish",
      values: result
    };
    renderUi();
  }
});

const eatDontEatGame = new EatDontEatGame({
  getMouth: () => state.eat.mouth,

  onTime({ seconds, progress }) {
    state.eat.seconds = seconds;
    state.eat.progress = progress;
    renderEatTime();
    renderProgress();
  },

  onItem(item) {
    state.eat.item = item;
    renderEatItem();
  },

  onScore(result) {
    state.eat.score = result.score;
    state.eat.hits = result.hits;
    state.eat.total = result.total;
    renderScoreboard();
  },

  onFeedback(result) {
    state.eat.feedback = result;
    renderEatFeedback();
  },

  onFinish(result) {
    state.sessionActive = false;
    state.eat.item = null;
    state.eat.result = result;
    state.eat.feedback = null;
    state.eat.progress = 1;
    state.message = {
      key: "eatDontEatFinish",
      values: result
    };
    renderUi();
  }
});

function renderUi() {
  const modeTitleKey = {
    handBeat: "HandBeat",
    fingerGun: "FingerGun",
    eatDontEat: "EatDontEat",
    noteBlaster: "NoteBlaster",
    duoArcade: "DuoArcade"
  };
  const suffix = modeTitleKey[state.mode];

  document.documentElement.lang = state.locale;
  document.querySelector('meta[name="description"]').content = t("description");
  $("#eyebrow").textContent = t(`eyebrow${suffix}`);
  $("#language-switch").setAttribute("aria-label", state.locale === "ja" ? "言語" : "Language");
  $("#language-ja").setAttribute("aria-pressed", String(state.locale === "ja"));
  $("#language-en").setAttribute("aria-pressed", String(state.locale === "en"));
  $("#mode-navigation").setAttribute("aria-label", t("modeNavigation"));
  $("#stage").setAttribute("aria-label", t("stageLabel"));
  $("#upcoming").setAttribute("aria-label", state.locale === "ja" ? "次のジェスチャー" : "Upcoming gestures");

  modeTitle.textContent = t(`mode${suffix}`);
  lead.textContent = t(`lead${suffix}`);
  $("#solo-experience").hidden = state.mode === "duoArcade" || state.mode === "noteBlaster";
  $(".lab").classList.toggle("lab--duo", state.mode === "duoArcade");
  $(".lab").classList.toggle("lab--blaster", state.mode === "noteBlaster");
  duoArcade.setLocale(state.locale);
  noteBlaster.setLocale(state.locale);

  for (const button of modeButtons) {
    button.textContent = t(`mode${modeTitleKey[button.dataset.mode]}`);
    button.setAttribute("aria-pressed", String(button.dataset.mode === state.mode));
    button.disabled = state.cameraLoading;
  }

  if (state.mode === "duoArcade" || state.mode === "noteBlaster") return;

  handBeatPanel.hidden = state.mode !== "handBeat";
  fingerGunPanel.hidden = state.mode !== "fingerGun";
  eatPanel.hidden = state.mode !== "eatDontEat";
  handBeatHowto.hidden = state.mode !== "handBeat";
  fingerGunHowto.hidden = state.mode !== "fingerGun";
  eatHowto.hidden = state.mode !== "eatDontEat";
  stage.classList.toggle("stage--finger-gun", state.mode === "fingerGun");
  stage.classList.toggle("stage--eat", state.mode === "eatDontEat");
  $("#scoreboard").classList.toggle("scoreboard--timed", state.mode !== "handBeat");
  timeStat.hidden = state.mode === "handBeat";

  const statusKey = {
    OFF: "cameraOff",
    LOADING_MODEL: "loadingModel",
    REQUESTING_CAMERA: "requestingCamera",
    READY: "cameraReady",
    ERROR: "cameraError"
  }[state.cameraStatus] ?? "cameraOff";
  cameraStatus.textContent = t(statusKey);
  cameraStatus.dataset.state = state.cameraStatus.toLowerCase();

  cameraButton.textContent = t(state.cameraLoading ? "cameraLoading" : state.cameraReady ? "cameraButtonReady" : state.cameraStatus === "ERROR" ? "cameraButtonRetry" : "cameraButtonStart");
  cameraButton.disabled = state.cameraLoading || state.cameraReady;
  renderPlayButton();
  message.textContent = t(state.message.key, state.message.values);

  $("#howto-summary").textContent = t("howToPlay");
  $("#gesture-open").textContent = t("gestureOPEN");
  $("#gesture-fist").textContent = t("gestureFIST");
  $("#gesture-peace").textContent = t("gesturePEACE");
  $("#gesture-pinch").textContent = t("gesturePINCH");
  $("#hand-beat-instructions").textContent = t("handBeatInstructions");
  $("#finger-gun-instructions").textContent = t("fingerGunInstructions");
  $("#eat-instructions").textContent = t("eatDontEatInstructions");
  musicCreditPrefix.textContent = t("musicCreditPrefix");
  musicCreditSuffix.textContent = t("musicCreditSuffix");

  scoreLabel.textContent = t("score");
  hitsLabel.textContent = t("hits");
  timeLabel.textContent = t("timeLeft");
  renderReadout();
  renderHandBeat();
  renderFingerPrompt();
  renderEatItem();
  renderScoreboard();
  renderFingerTime();
  renderEatTime();
  renderProgress();
  renderFingerAim();
  renderFingerTarget();
}

function hasResult() {
  if (state.mode === "handBeat") return Boolean(state.hand.result);
  if (state.mode === "fingerGun") return Boolean(state.finger.result);
  return Boolean(state.eat.result);
}

function renderPlayButton() {
  const waitingForFace = state.mode === "eatDontEat" && state.cameraReady && !state.eat.mouth.ready;
  const startKey = {
    handBeat: "handBeatStart",
    fingerGun: "fingerGunStart",
    eatDontEat: "eatDontEatStart"
  }[state.mode];
  playButton.textContent = t(state.sessionActive
    ? "playing"
    : waitingForFace
      ? "eatDontEatWait"
      : hasResult()
        ? "playAgain"
        : startKey);
  playButton.disabled = !state.cameraReady || state.cameraLoading || state.sessionActive || waitingForFace;
}

function renderReadout() {
  if (state.mode === "handBeat") {
    detected.textContent = state.hand.gesture === "NONE" ? "—" : t(`gesture${state.hand.gesture}`);
    detected.classList.remove("detected--armed");
    return;
  }

  if (state.mode === "eatDontEat") {
    const mouth = state.eat.mouth;
    detected.textContent = !mouth.visible
      ? t("noFace")
      : !mouth.ready
        ? t("calibratingFace")
        : t(mouth.open ? "mouthOpen" : "mouthClosed");
    detected.classList.toggle("detected--armed", Boolean(mouth.ready && mouth.open));
    return;
  }

  const aim = state.finger.aim;
  detected.textContent = !aim?.visible ? t("noHand") : aim.armed ? t("armed") : t("aiming");
  detected.classList.toggle("detected--armed", Boolean(aim?.visible && aim?.armed));
}

function renderHandBeat() {
  if (state.hand.result) {
    targetIcon.textContent = state.hand.result.accuracy >= 80 ? "🔥" : "🖐️";
    targetLabel.textContent = `${state.hand.result.accuracy}% ${t("accuracy")}`;
  } else if (state.hand.target) {
    targetIcon.textContent = GESTURE_ICONS[state.hand.target] ?? "✋";
    targetLabel.textContent = t(`gesture${state.hand.target}`);
  } else {
    targetIcon.textContent = "📷";
    targetLabel.textContent = t(state.cameraReady ? "handBeatPrompt" : "cameraPrompt");
  }

  upcoming.replaceChildren(...state.hand.upcoming.map(({ icon, gesture }) => {
    const item = document.createElement("span");
    item.className = "upcoming__item";
    const iconElement = document.createElement("span");
    iconElement.textContent = icon;
    const labelElement = document.createElement("span");
    labelElement.textContent = t(`gesture${gesture}`);
    item.append(iconElement, labelElement);
    return item;
  }));

  renderHandBeatFeedback();
}

function renderHandBeatFeedback() {
  const result = state.hand.feedback;
  feedback.textContent = result
    ? `${t(`handBeatGrade${result.grade}`)} +${result.points}`
    : state.hand.result
      ? `SCORE ${state.hand.result.score}`
      : "";
  feedback.dataset.grade = result?.grade ?? "";
}

function renderFingerPrompt() {
  if (state.finger.result) {
    fingerPrompt.textContent = t(state.finger.result.accuracy >= 50 ? "fingerResultHigh" : "fingerResultLow");
  } else if (state.sessionActive) {
    fingerPrompt.textContent = t("holdToAim");
  } else {
    fingerPrompt.textContent = t(state.cameraReady ? "fingerGunPrompt" : "cameraPrompt");
  }
  fingerTargetLabel.textContent = t("fingerTarget");
  fingerTarget.setAttribute("aria-label", t("fingerTarget"));
  renderFingerFeedback();
}

function renderFingerFeedback() {
  const result = state.finger.feedback;
  fingerFeedback.textContent = result
    ? `${t(result.grade === "HIT" ? "fingerHit" : "fingerMiss")}${result.points ? ` +${result.points}` : ""}`
    : "";
  fingerFeedback.dataset.grade = result?.grade ?? "";
}

function renderEatItem() {
  if (state.eat.result) {
    eatIcon.textContent = state.eat.result.accuracy >= 50 ? "😋" : "😵";
    eatLabel.textContent = `${state.eat.result.accuracy}% ${t("accuracy")}`;
  } else if (state.eat.item) {
    eatIcon.textContent = state.eat.item.icon;
    const name = state.eat.item.name[0].toUpperCase() + state.eat.item.name.slice(1);
    eatLabel.textContent = t(`eatItem${name}`);
  } else {
    eatIcon.textContent = state.cameraReady ? "👄" : "📷";
    eatLabel.textContent = t(state.cameraReady ? "eatDontEatPrompt" : "cameraPrompt");
  }

  eatQuestion.textContent = state.eat.item ? t("eatDontEatPrompt") : "";
  renderEatFeedback();
}

function renderEatFeedback() {
  const result = state.eat.feedback;
  eatFeedback.textContent = result
    ? `${t(result.grade === "HIT" ? "eatHit" : "eatMiss")}${result.points ? ` +${result.points}` : ""}`
    : "";
  eatFeedback.dataset.grade = result?.grade ?? "";
}

function renderScoreboard() {
  if (state.mode === "handBeat") {
    score.textContent = String(state.hand.score);
    hits.textContent = t("hitCounter", { hits: state.hand.hits, total: state.hand.total });
  } else if (state.mode === "fingerGun") {
    score.textContent = String(state.finger.score);
    hits.textContent = t("shotCounter", { hits: state.finger.hits, shots: state.finger.shots });
  } else {
    score.textContent = String(state.eat.score);
    hits.textContent = t("hitCounter", { hits: state.eat.hits, total: state.eat.total });
  }
}

function renderFingerTime() {
  if (state.mode === "fingerGun") {
    timeLeft.textContent = `${Math.max(0, state.finger.seconds)}${t("secondsShort")}`;
  }
}

function renderEatTime() {
  if (state.mode === "eatDontEat") {
    timeLeft.textContent = `${Math.max(0, state.eat.seconds)}${t("secondsShort")}`;
  }
}

function renderProgress() {
  const value = state.mode === "handBeat"
    ? state.hand.progress
    : state.mode === "fingerGun"
      ? state.finger.progress
      : state.eat.progress;
  progressBar.style.transform = `scaleX(${Math.max(0, Math.min(value, 1))})`;
}

function renderFingerAim() {
  const aim = state.finger.aim;
  const visible = Boolean(aim?.visible);
  fingerAim.hidden = state.mode !== "fingerGun" || !visible;
  if (visible) {
    fingerAim.style.left = `${Math.max(0, Math.min(aim.x, 1)) * 100}%`;
    fingerAim.style.top = `${Math.max(0, Math.min(aim.y, 1)) * 100}%`;
  }
  fingerAim.classList.toggle("finger-aim--armed", Boolean(aim?.armed));
  renderReadout();
}

function renderFingerTarget() {
  const target = state.finger.target;
  const visible = state.mode === "fingerGun" && state.sessionActive && Boolean(target);
  fingerTarget.hidden = !visible;

  if (!visible) return;

  const stageRect = stage.getBoundingClientRect();
  const width = stageRect.width * target.radius * 2;
  const height = stageRect.height * target.radius * 2;
  fingerTarget.style.left = `${Math.max(0, Math.min(target.x, 1)) * 100}%`;
  fingerTarget.style.top = `${Math.max(0, Math.min(target.y, 1)) * 100}%`;
  fingerTarget.style.width = `${width}px`;
  fingerTarget.style.height = `${height}px`;
}

function startFingerGunMusic() {
  if (state.mode !== "fingerGun") return;

  const play = (music) => {
    if (!music || state.mode !== "fingerGun" || !state.sessionActive) return;
    music.currentTime = 0;
    void music.play().catch(() => {
      // Audio is optional; the game remains playable if browser audio is unavailable.
    });
  };

  if (fingerGunMusic.src) {
    play(fingerGunMusic);
  } else {
    void fingerGunMusicReady.then(play);
  }
}

function stopFingerGunMusic() {
  fingerGunMusic.pause();
  fingerGunMusic.currentTime = 0;
}

async function startCamera() {
  if (state.cameraReady || state.cameraLoading) return;

  const input = getModeInput();
  state.cameraStatus = "LOADING_MODEL";
  state.cameraLoading = true;
  state.message = { key: "cameraLoading" };
  renderUi();

  try {
    await input.start();
    state.cameraReady = true;
    state.cameraLoading = false;
    state.cameraStatus = "READY";
    state.message = {
      key: {
        handBeat: "cameraReadyMessage",
        fingerGun: "cameraReadyFingerMessage",
        eatDontEat: "cameraReadyEatMessage"
      }[state.mode]
    };
    renderUi();
  } catch (error) {
    console.error(error);
    input.stop();
    state.cameraReady = false;
    state.cameraLoading = false;
    state.cameraStatus = "ERROR";
    state.message = { key: error.name === "FrontCameraUnavailableError" ? "frontCameraUnavailable" : "cameraStartError" };
    renderUi();
  }
}

function getModeInput() {
  return {
    handBeat: handInput,
    fingerGun: fingerGunInput,
    eatDontEat: faceInput
  }[state.mode];
}

function resetSessionState() {
  state.sessionActive = false;
  state.hand.gesture = "NONE";
  state.hand.target = null;
  state.hand.upcoming = [];
  state.hand.feedback = null;
  state.hand.progress = 0;
  state.hand.score = 0;
  state.hand.hits = 0;
  state.hand.total = 16;
  state.hand.result = null;
  state.finger.aim = null;
  state.finger.target = null;
  state.finger.feedback = null;
  state.finger.progress = 0;
  state.finger.seconds = 15;
  state.finger.score = 0;
  state.finger.hits = 0;
  state.finger.shots = 0;
  state.finger.accuracy = 0;
  state.finger.result = null;
  state.eat.mouth = {
    visible: false,
    calibrated: false,
    ready: false,
    open: false,
    openness: 0,
    progress: 0
  };
  state.eat.item = null;
  state.eat.feedback = null;
  state.eat.progress = 0;
  state.eat.seconds = 15;
  state.eat.score = 0;
  state.eat.hits = 0;
  state.eat.total = 12;
  state.eat.result = null;
}

async function startGame() {
  if (!state.cameraReady || state.sessionActive) return;

  state.sessionActive = true;
  startFingerGunMusic();
  state.message = {
    key: {
      handBeat: "handBeatPlaying",
      fingerGun: "fingerGunPlaying",
      eatDontEat: "eatDontEatPlaying"
    }[state.mode]
  };
  if (state.mode === "handBeat") {
    state.hand.result = null;
    state.hand.feedback = null;
    state.hand.upcoming = [];
  } else if (state.mode === "fingerGun") {
    state.finger.result = null;
    state.finger.feedback = null;
    state.finger.aim = null;
  } else {
    state.eat.result = null;
    state.eat.feedback = null;
    state.eat.item = null;
  }
  renderUi();

  try {
    if (state.mode === "handBeat") {
      await handGame.start();
    } else if (state.mode === "fingerGun") {
      await fingerGunGame.start();
    } else {
      await eatDontEatGame.start();
    }
  } catch (error) {
    console.error(error);
    stopFingerGunMusic();
    state.sessionActive = false;
    state.message = { key: "cameraStartError" };
    renderUi();
  }
}

async function selectMode(mode) {
  if (mode === state.mode || state.cameraLoading) return;

  const resumeCamera = state.cameraReady;
  handGame.stop();
  fingerGunGame.stop();
  eatDontEatGame.stop();
  stopFingerGunMusic();
  handInput.stop();
  fingerGunInput.stop();
  faceInput.stop();
  resetSessionState();

  state.mode = mode;
  if (mode === "duoArcade") window.history.replaceState(null, "", "#duo");
  else if (mode === "noteBlaster") window.history.replaceState(null, "", "#note-blaster");
  else if (["#duo", "#note-blaster"].includes(window.location.hash)) window.history.replaceState(null, "", window.location.pathname + window.location.search);
  state.cameraReady = false;
  state.cameraLoading = false;
  state.cameraStatus = "OFF";
  state.message = { key: "cameraPrivacy" };
  duoArcade.deactivate();
  noteBlaster.deactivate();
  renderUi();

  if (mode === "duoArcade") duoArcade.activate();
  else if (mode === "noteBlaster") noteBlaster.activate();
  else if (resumeCamera) await startCamera();
}

cameraButton.addEventListener("click", startCamera);
playButton.addEventListener("click", startGame);

for (const button of modeButtons) {
  button.addEventListener("click", () => selectMode(button.dataset.mode));
}

$("#language-ja").addEventListener("click", () => setLocale("ja"));
$("#language-en").addEventListener("click", () => setLocale("en"));

function setLocale(locale) {
  state.locale = locale;
  try {
    window.localStorage.setItem("camera-game-lab-locale", locale);
  } catch {
    // The selected language still applies for this page session.
  }
  renderUi();
}

const targetResizeObserver = new ResizeObserver(renderFingerTarget);
targetResizeObserver.observe(stage);

window.addEventListener("pagehide", () => {
  handGame.stop();
  fingerGunGame.stop();
  eatDontEatGame.stop();
  stopFingerGunMusic();
  handInput.stop();
  fingerGunInput.stop();
  faceInput.stop();
  noteBlaster.deactivate();
});

renderUi();
if (window.location.hash === "#duo") void selectMode("duoArcade");
if (window.location.hash === "#note-blaster") void selectMode("noteBlaster");
window.addEventListener("hashchange", () => {
  if (window.location.hash === "#duo") void selectMode("duoArcade");
  else if (window.location.hash === "#note-blaster") void selectMode("noteBlaster");
  else if (["duoArcade", "noteBlaster"].includes(state.mode)) void selectMode("handBeat");
});
