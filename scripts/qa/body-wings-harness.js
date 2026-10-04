import "../../src/style.css";
import "../../src/platform/platform.css";
import { BodyWingsView } from "../../src/wings/view.js";
import { BodyWingsInput } from "../../src/input/bodyWingsInput.js";
import { RING_LINE } from "../../src/games/bodyWings.js";
import { resultMarkup, mountResult } from "../../src/wings/presentation.js";
import { FilesetResolver } from "@mediapipe/tasks-vision";

// A dev-only, UI-driven fixture for camera paths. No QA switches or synthetic
// receipt sources enter the production controller or built site.
const report = document.querySelector("#report"), host = document.querySelector("#fixture"), checks = [];
const check = (ok, label) => { if (!ok) throw Error(label); checks.push(label); report.textContent = checks.map(x => "PASS · " + x).join("\n"); };
let view, now, missing = false, spread = true, tilt = 0, stopped = false, maskCloses = 0;
const originalStart = BodyWingsInput.prototype.start;
const camera = document.createElement("canvas"); camera.width = 720; camera.height = 1280;
const cc = camera.getContext("2d"); cc.fillStyle = "#19aaff"; cc.fillRect(0, 0, 720, 1280);
cc.strokeStyle = "#fff5d8"; cc.lineWidth = 70; cc.lineCap = "round"; cc.beginPath(); cc.moveTo(65, 630); cc.lineTo(300, 615); cc.lineTo(420, 615); cc.lineTo(655, 630); cc.stroke();
cc.fillStyle = "#eee5cd"; cc.fillRect(300, 575, 120, 440);
cc.fillStyle = "#f21c45"; cc.beginPath(); cc.ellipse(360, 378, 54, 70, 0, 0, Math.PI * 2); cc.fill();
const maskValues = new Float32Array(128 * 224);
for (let y = 0; y < 224; y++) for (let x = 0; x < 128; x++) {
  const px = x / 128, py = y / 224;
  maskValues[y * 128 + x] = ((px - .5) / .078) ** 2 + ((py - .295) / .062) ** 2 < 1 || (px > .41 && px < .59 && py > .44 && py < .81) || (px > .075 && px < .925 && py > .45 && py < .52) ? 1 : 0;
}
function poseResult() {
  const l = Array.from({ length: 33 }, () => ({ x: .5, y: .5, visibility: .05 }));
  for (const [i, x, y] of [[11,.65,.48-tilt*.15*(720/1280)],[12,.35,.48+tilt*.15*(720/1280)],[15,spread?.94:.6,.49],[16,spread?.06:.4,.49],[0,.5,.30],[7,.58,.30],[8,.42,.30]]) l[i] = { x, y, visibility: .95 };
  return { landmarks: missing ? [] : [l], segmentationMasks: [{ width: 128, height: 224, getAsFloat32Array: () => maskValues, close: () => { maskCloses++; } }] };
}
BodyWingsInput.prototype.start = async function() {
  const stream = camera.captureStream(30); this.session = { stream, recognizer: { close() {} } }; this.video.srcObject = stream;
  stream.getTracks().forEach(t => t.addEventListener("ended", () => { stopped = true; }));
  const refresh = setInterval(() => { cc.drawImage(camera, 0, 0); stream.getVideoTracks()[0]?.requestFrame?.(); }, 30);
  try { await this.video.play(); } finally { clearInterval(refresh); }
  this.running = true; this.onStatus("READY");
};
const yieldFrame = () => new Promise(resolve => setTimeout(resolve, 0));
async function step(ms, control = () => {}) {
  for (let remaining = ms, i = 0; remaining > 0; i++) {
    const dt = Math.min(50, remaining); remaining -= dt; now += dt; control();
    if (view.source === "camera") view.input.processResult(poseResult(), now);
    view.tick(now); cancelAnimationFrame(view.raf);
    // Match the recorder's asynchronous encoding cadence even though game time
    // is accelerated. Otherwise a 30s fake round ends before its blobs encode.
    while (view.creator?.pending) await yieldFrame();
    if (i % 5 === 0) await yieldFrame();
  }
}
async function start({ creator = false, faceMode = "ORIGINAL", source = "camera", locale = "en" } = {}) {
  view?.deactivate(); host.replaceChildren();
  missing = false; spread = true; tilt = 0; stopped = false;
  view = new BodyWingsView(host, locale); view.configure({ creator, faceMode }); view.activate();
  view.saveReceipt = () => {}; // Keep synthetic data out of human round history.
  if (source === "camera") await view.startCamera(); else view.startDemo();
  cancelAnimationFrame(view.raf); now = view.lastTick;
}
const redPixels = () => { const a = view.canvas.getContext("2d").getImageData(0, 0, view.canvas.width, view.canvas.height).data; let red = 0; for (let i = 0; i < a.length; i += 4) if (a[i] > 200 && a[i + 1] < 60 && a[i + 2] < 100) red++; return red; };
document.querySelector("#run").addEventListener("click", async event => {
  event.target.disabled = true; checks.length = 0; report.textContent = "Running…";
  try {
    await start(); await step(500); check(view.game.phase === "transform", "camera pose auto-starts after continuous 500ms");
    await step(1000); check(view.game.phase === "tutorial", "transformation lasts one second");
    await step(3200); check(view.game.phase === "tutorial", "stillness does not pass left-lean tutorial");
    tilt = -.24; await step(250); check(view.game.phase === "playing" && view.game.tutorialDone, "mirrored left shoulder turn completes tutorial");
    spread = false; tilt = .24; const x = view.game.x; await step(300);
    check(view.game.x > x && view.game.phase === "playing", "right shoulder turns right even with arms relaxed");
    check(redPixels() > 300, "ORIGINAL scene contains the synthetic real face");
    view.options.faceMode = "EFFECT"; view.render(); check(redPixels() > 100, "EFFECT keeps face visible beneath goggles");
    view.options.faceMode = "HIDE"; view.render(); check(redPixels() === 0, "HIDE masks every synthetic face pixel");
    const before = view.game.elapsed; view.game.setPaused(true); await step(1000); check(view.game.elapsed === before, "pause freezes elapsed time"); view.game.setPaused(false);
    missing = true; const oldTime = view.game.elapsed; await step(900);
    check(view.game.elapsed === oldTime + 900 && view.game.trackingLosses === 1, "tracking loss continues clock and stabilizes flight");
    check(host.querySelector(".bw-overlay").textContent.includes("FRAME"), "long loss gives a concrete return-to-frame cue");
    check(redPixels() === 0, "HIDE never leaks a camera fallback while tracking is missing");
    missing = false; tilt = 0; await step(100); check(view.game.missingMs === 0, "tracking automatically recovers");
    check(maskCloses > 20, "every inference mask is released");
    view.deactivate(); check(!view.video.srcObject && !view.input.running && !view.audio.context, "exit releases camera stream and audio");
    await start({ creator: true, faceMode: "HIDE" });
    await step(1500); await step(3450, () => { tilt = view.game.phaseMs > 3100 ? -.24 : 0; });
    const autoFly = () => { spread = false; const target = RING_LINE[view.game.attempts]?.x ?? .5; tilt = Math.max(-.3, Math.min(.3, (target - view.game.x) * 2)); };
    while (view.phase !== "result") await step(100, autoFly);
    check(view.game.result.seconds === 30 && view.game.attempts === 30 && view.game.result.rings >= 25, "full camera round grades 30 rings over exactly 30 seconds");
    check(view.game.result.boosts > 0 && view.highlights.some(e => e.type === "BOOST"), "actual successful course triggers BOOST and highlight events");
    check(view.creatorResult.faceMode === "HIDE" && view.creatorResult.frames.length >= 35, "CREATOR retains the face-safe six-second highlight");
    const frames = view.creatorResult.frames; check(frames.at(-1).at - frames[0].at <= 6000, "BEST FLIGHT is a single bounded chronological window");
    view.releaseInputs(); host.innerHTML = resultMarkup({}, { ...view.game.result, creator: view.creatorResult }, "en");
    const clean = mountResult(host, { ...view.game.result, creator: view.creatorResult }); await yieldFrame();
    check(!!host.querySelector(".creator-replay-canvas") && host.textContent.includes("BEST FLIGHT"), "shared Replay mounts in dedicated flight result"); clean?.();
    await start({ source: "demo" }); await step(1500); check(!view.video.srcObject && !view.creator, "practice and ordinary PLAY do not open camera or record");
    view.deactivate();
    const failedStart = BodyWingsInput.prototype.start; BodyWingsInput.prototype.start = async () => { throw new DOMException("Denied", "NotAllowedError"); };
    await start(); check(view.phase === "error" && !host.querySelector(".bw-recovery").hidden, "denied camera exposes retry and camera-free recovery");
    view.startDemo(); cancelAnimationFrame(view.raf); now = view.lastTick; await step(1500); check(view.source === "demo" && view.phase === "tutorial", "camera error recovers into practice without requesting sensors");
    view.deactivate(); BodyWingsInput.prototype.start = failedStart;
    report.textContent += `\n\n${checks.length} checks passed. Physical camera and human playtest: not run.`;
  } catch (error) { report.textContent += "\nFAIL · " + error.message; console.error(error); }
  finally { BodyWingsInput.prototype.start = originalStart; event.target.disabled = false; }
});
document.querySelector("#model").addEventListener("click", async event => {
  event.target.disabled = true; const output = document.querySelector("#model-report"); output.textContent = "Loading actual MediaPipe WASM and pose model…";
  let recognizer;
  try {
    const vision = await FilesetResolver.forVisionTasks("https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.0.1/wasm");
    recognizer = await new BodyWingsInput(document.createElement("video")).createRecognizer(vision, "CPU");
    const result = recognizer.detectForVideo(camera, performance.now());
    const valid = Array.isArray(result.landmarks); result.segmentationMasks?.forEach(m => m.close());
    output.textContent = valid ? "PASS · actual MediaPipe pose model loads and infers a frame with segmentation enabled. No real camera permission requested." : "FAIL · invalid inference result";
  } catch (error) { output.textContent = "FAIL · " + error.message; }
  finally { recognizer?.close(); event.target.disabled = false; }
});
