const MIME_TYPES = ["video/mp4;codecs=avc1.42E01E,mp4a.40.2", "video/webm;codecs=vp8,opus", "video/webm", "video/mp4"];
export function exportCapability(scope = globalThis) {
  const Recorder = scope.MediaRecorder;
  const mimeType = Recorder?.isTypeSupported && MIME_TYPES.find(type => Recorder.isTypeSupported(type));
  return { available: !!mimeType && typeof scope.HTMLCanvasElement?.prototype.captureStream === "function", mimeType: mimeType || null };
}

// Encode after the round, so camera inference never competes with MediaRecorder.
// Native encoders run in real time; backgrounding pauses both their clock and UI.
export async function exportClip(composer, { signal, onProgress = () => {}, sound = true } = {}) {
  const capability = exportCapability();
  if (!capability.available) throw new Error("VIDEO_UNSUPPORTED");
  if (signal?.aborted) throw new DOMException("Cancelled", "AbortError");
  const canvas = document.createElement("canvas"); canvas.width = 540; canvas.height = 960;
  await composer.paint(canvas, 0);
  if (signal?.aborted) throw new DOMException("Cancelled", "AbortError");
  const stream = canvas.captureStream(24), chunks = [];
  let audio, recorder, timer, elapsed = 0, last = performance.now(), painting = false, heroPlayed = false;
  try {
    if (sound && (globalThis.AudioContext || globalThis.webkitAudioContext)) {
      try {
        audio = new (globalThis.AudioContext || globalThis.webkitAudioContext)();
        const destination = audio.createMediaStreamDestination();
        audio.clipDestination = destination;
        // A continuous silent source gives the muxer a clock from frame zero,
        // instead of beginning the audio track only when HERO's tone plays.
        const silence = audio.createOscillator(), gain = audio.createGain();
        gain.gain.value = 0; silence.connect(gain); gain.connect(destination); silence.start();
        await Promise.race([audio.resume().catch(() => {}), new Promise(resolve => setTimeout(resolve, 300))]);
        if (audio.state === "running") destination.stream.getAudioTracks().forEach(track => stream.addTrack(track));
        else { void audio.close().catch(() => {}); audio = null; }
      } catch { /* Video encoding can continue without a generated sound. */ }
    }
    if (signal?.aborted) throw new DOMException("Cancelled", "AbortError");
    recorder = new MediaRecorder(stream, { mimeType: capability.mimeType, videoBitsPerSecond: 2600000 });
    const blob = await new Promise((resolve, reject) => {
      let settled = false;
      const cleanup = () => { signal?.removeEventListener("abort", abort); document.removeEventListener("visibilitychange", visibility); };
      const fail = error => {
        if (settled) return; settled = true; clearInterval(timer); cleanup();
        if (recorder.state !== "inactive") recorder.stop();
        reject(error);
      };
      const abort = () => fail(new DOMException("Cancelled", "AbortError"));
      const visibility = () => {
        last = performance.now();
        if (document.hidden && recorder.state === "recording") recorder.pause();
        else if (!document.hidden && recorder.state === "paused") recorder.resume();
      };
      signal?.addEventListener("abort", abort, { once: true }); document.addEventListener("visibilitychange", visibility);
      recorder.ondataavailable = event => { if (event.data.size) chunks.push(event.data); };
      recorder.onerror = event => fail(event.error ?? new Error("VIDEO_ENCODE_FAILED"));
      recorder.onstop = () => {
        clearInterval(timer); cleanup();
        if (settled) return; settled = true;
        if (!chunks.length) reject(new Error("VIDEO_EMPTY"));
        else resolve(new Blob(chunks, { type: recorder.mimeType }));
      };
      recorder.start(250); visibility();
      timer = setInterval(async () => {
        const now = performance.now(), delta = now - last; last = now;
        if (document.hidden || settled || recorder.state !== "recording") return;
        elapsed += delta;
        if (elapsed >= composer.plan.duration - 90) { clearInterval(timer); recorder.stop(); return; }
        onProgress(Math.min(1, elapsed / composer.plan.duration));
        if (!heroPlayed && composer.plan.heroTimestamp !== null) {
          const segment = composer.plan.segments.find(s => s.kind === "HERO");
          const heroAt = segment && segment.start + composer.plan.heroTimestamp - segment.from;
          if (segment && elapsed >= heroAt) {
            heroPlayed = true;
            if (audio?.state === "running") {
              const gain = audio.createGain(); gain.connect(audio.clipDestination);
              gain.gain.setValueAtTime(.055, audio.currentTime); gain.gain.exponentialRampToValueAtTime(.001, audio.currentTime + .3);
              const tone = audio.createOscillator(); tone.type = "sine"; tone.frequency.setValueAtTime(660, audio.currentTime); tone.frequency.linearRampToValueAtTime(990, audio.currentTime + .16);
              tone.connect(gain); tone.start(); tone.stop(audio.currentTime + .3);
            }
          }
        }
        if (painting) return;
        painting = true;
        try { await composer.paint(canvas, elapsed); }
        catch (error) { fail(error); }
        finally { painting = false; }
      }, 1000 / 24);
    });
    const extension = blob.type.includes("mp4") ? "mp4" : "webm";
    return new File([blob], `camera-game-${String(composer.plan.profile.gameNumber).padStart(3, "0")}-${composer.plan.format}s.${extension}`, { type: blob.type });
  } finally {
    clearInterval(timer); stream.getTracks().forEach(track => track.stop());
    if (recorder && recorder.state !== "inactive") recorder.stop();
    if (audio) void audio.close().catch(() => {});
    canvas.width = 0;
  }
}
