import "./style.css";
import { registerSW } from "virtual:pwa-register";
import { HandInput } from "./input/handInput.js";
import { HandBeat } from "./games/handBeat.js";

registerSW({ immediate: true });

const app = document.querySelector("#app");

app.innerHTML = `
  <section class="lab">
    <header class="lab__header">
      <p class="eyebrow">CAMERA GAME LAB / EXP-001</p>
      <h1>HAND BEAT</h1>
      <p class="lead">Your hand is the controller. Match the beat with four gestures.</p>
    </header>

    <section class="stage" aria-label="Camera game stage">
      <video id="camera" class="camera" autoplay muted playsinline></video>

      <div class="camera-shade" aria-hidden="true"></div>

      <div class="hud">
        <div class="hud__top">
          <span id="camera-status" class="status">CAMERA OFF</span>
          <span id="detected" class="detected">—</span>
        </div>

        <div class="target">
          <div id="target-icon" class="target__icon">📷</div>
          <div id="target-label" class="target__label">ENABLE CAMERA</div>
          <div id="feedback" class="feedback" aria-live="polite"></div>
        </div>

        <div id="upcoming" class="upcoming" aria-label="Upcoming gestures"></div>

        <div class="progress" aria-hidden="true">
          <div id="progress-bar" class="progress__bar"></div>
        </div>
      </div>
    </section>

    <section class="scoreboard" aria-live="polite">
      <div>
        <span class="scoreboard__label">SCORE</span>
        <strong id="score">0</strong>
      </div>
      <div>
        <span class="scoreboard__label">HITS</span>
        <strong id="hits">0 / 16</strong>
      </div>
    </section>

    <div class="actions">
      <button id="camera-button" class="button button--primary" type="button">
        Enable camera
      </button>
      <button id="play-button" class="button" type="button" disabled>
        Start 15 sec challenge
      </button>
    </div>

    <p id="message" class="message">
      Camera frames stay on-device in this app. No video is uploaded.
    </p>

    <details class="howto">
      <summary>How to play</summary>
      <div class="gesture-grid">
        <span>✋ OPEN</span>
        <span>✊ FIST</span>
        <span>✌️ PEACE</span>
        <span>🤏 PINCH</span>
      </div>
      <p>Keep one hand visible. For PINCH, touch your thumb and index fingertip together.</p>
    </details>
  </section>
`;

const video = document.querySelector("#camera");
const cameraButton = document.querySelector("#camera-button");
const playButton = document.querySelector("#play-button");
const cameraStatus = document.querySelector("#camera-status");
const detected = document.querySelector("#detected");
const targetIcon = document.querySelector("#target-icon");
const targetLabel = document.querySelector("#target-label");
const upcoming = document.querySelector("#upcoming");
const feedback = document.querySelector("#feedback");
const score = document.querySelector("#score");
const hits = document.querySelector("#hits");
const progressBar = document.querySelector("#progress-bar");
const message = document.querySelector("#message");

const input = new HandInput(video, {
  onGesture(gesture) {
    detected.textContent = gesture === "NONE" ? "—" : gesture;
  },
  onStatus(status) {
    const labels = {
      LOADING_MODEL: "LOADING AI",
      REQUESTING_CAMERA: "ALLOW CAMERA",
      READY: "CAMERA READY"
    };

    cameraStatus.textContent = labels[status] ?? status;
  }
});

const game = new HandBeat({
  getGesture: () => input.currentGesture,

  onTarget({ currentLabel, upcoming: next }) {
    targetIcon.textContent = currentLabel.icon;
    targetLabel.textContent = currentLabel.text;
    upcoming.innerHTML = next
      .map(
        (item) =>
          `<span class="upcoming__item"><span>${item.icon}</span>${item.text}</span>`
      )
      .join("");
    feedback.textContent = "";
  },

  onScore(state) {
    score.textContent = String(state.score);
    hits.textContent = `${state.hits} / ${state.total}`;
  },

  onFeedback({ grade, points }) {
    feedback.textContent = `${grade} +${points}`;
    feedback.dataset.grade = grade;
  },

  onProgress(value) {
    progressBar.style.transform = `scaleX(${value})`;
  },

  onFinish(result) {
    targetIcon.textContent = result.accuracy >= 80 ? "🔥" : "🖐️";
    targetLabel.textContent = `${result.accuracy}% ACCURACY`;
    upcoming.innerHTML = "";
    feedback.textContent = `SCORE ${result.score}`;
    playButton.disabled = false;
    playButton.textContent = "Play again";
    message.textContent =
      result.accuracy >= 80
        ? "Nice hands. Next target: make this feel impossible to stop replaying."
        : "Prototype data acquired. Try again with your hand centered in frame.";
  }
});

cameraButton.addEventListener("click", async () => {
  cameraButton.disabled = true;
  message.textContent = "Loading hand tracking…";

  try {
    await input.start();
    cameraButton.textContent = "Camera ready";
    playButton.disabled = false;
    message.textContent = "Ready. Keep one hand inside the camera frame.";
  } catch (error) {
    console.error(error);
    input.stop();

    cameraButton.disabled = false;
    cameraButton.textContent = "Retry camera";
    cameraStatus.textContent = "CAMERA ERROR";
    message.textContent =
      "Camera could not start. Check browser permission and HTTPS, then retry.";
  }
});

playButton.addEventListener("click", async () => {
  playButton.disabled = true;
  playButton.textContent = "Playing…";
  message.textContent = "Match the icon on the beat.";
  feedback.textContent = "";
  progressBar.style.transform = "scaleX(0)";
  await game.start();
});

window.addEventListener("pagehide", () => {
  game.stop();
  input.stop();
});
