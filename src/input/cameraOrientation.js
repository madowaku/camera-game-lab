const rad = Math.PI / 180;
const dot = (a, b) => a.reduce((sum, n, i) => sum + n * b[i], 0);
// W3C intrinsic Z-X-Y rotation, applied to the rear lens (-Z), not raw Euler
// deltas. This avoids heading wrap and portrait beta/gamma singularities.
export function orientationBasis({ alpha, beta, gamma }, screenAngle = 0) {
  if (![alpha, beta, gamma].every((n) => typeof n === "number" && Number.isFinite(n))) return null;
  const a = alpha * rad, b = beta * rad, g = gamma * rad;
  const ca = Math.cos(a), sa = Math.sin(a), cb = Math.cos(b), sb = Math.sin(b), cg = Math.cos(g), sg = Math.sin(g);
  const rotate = ([x, y, z]) => {
    const u = cg * x + sg * z, v = -sg * x + cg * z;
    const w = cb * y - sb * v, q = sb * y + cb * v;
    return [ca * u - sa * w, sa * u + ca * w, q];
  };
  const s = screenAngle * rad;
  return { forward: rotate([0, 0, -1]), right: rotate([Math.cos(s), Math.sin(s), 0]), up: rotate([-Math.sin(s), Math.cos(s), 0]) };
}
export function relativeLook(current, neutral) {
  const x = dot(current.forward, neutral.right), y = dot(current.forward, neutral.up), z = dot(current.forward, neutral.forward);
  const deadzone = (n) => Math.abs(n) < .3 ? 0 : n;
  return { yaw: deadzone(Math.atan2(x, z) / rad), pitch: deadzone(Math.atan2(y, Math.hypot(x, z)) / rad) };
}

export class CameraOrientation {
  constructor(video, onFrame, env = window) { this.video = video; this.onFrame = onFrame; this.env = env; this.generation = 0; }
  async start() {
    this.stop(); const token = this.generation, env = this.env;
    if (!env.isSecureContext) throw new Error("secure");
    if (!env.DeviceOrientationEvent) throw new Error("sensor");
    // Call before the first await, while the launch button still has activation.
    const permission = typeof env.DeviceOrientationEvent.requestPermission === "function" ? env.DeviceOrientationEvent.requestPermission() : Promise.resolve("granted");
    if (await permission !== "granted") throw new Error("permission");
    if (token !== this.generation) throw new DOMException("Cancelled", "AbortError");
    this.abort = new AbortController(); this.neutral = null; this.current = null;
    const signal = this.abort.signal;
    env.addEventListener("deviceorientation", (event) => {
      const basis = orientationBasis(event, env.screen?.orientation?.angle ?? env.orientation ?? 0);
      if (!basis) return;
      this.current = basis; this.neutral ??= basis; this.lastFrame = performance.now();
      this.onFrame(relativeLook(basis, this.neutral)); this.resolveSensor?.();
    }, { signal });
    const sensor = new Promise((resolve, reject) => {
      this.resolveSensor = resolve;
      this.timer = setTimeout(() => reject(new Error("sensor")), 6000);
      signal.addEventListener("abort", () => reject(new DOMException("Cancelled", "AbortError")), { once: true });
    }).finally(() => { clearTimeout(this.timer); this.resolveSensor = null; });
    const media = env.navigator.mediaDevices;
    if (!media?.getUserMedia) { this.stop(); await sensor.catch(() => {}); throw new Error("camera"); }
    const feed = Promise.resolve().then(() => media.getUserMedia({ audio: false, video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } } })).then((stream) => {
      if (token !== this.generation) { stream.getTracks().forEach((t) => t.stop()); throw new DOMException("Cancelled", "AbortError"); }
      this.stream = stream; this.video.srcObject = stream;
      stream.getVideoTracks?.().forEach((track) => track.addEventListener("ended", () => { if (token === this.generation) this.onError?.(); }, { signal }));
      return this.video.play();
    });
    try { await Promise.all([sensor, feed]); }
    catch (error) { if (token === this.generation) this.stop(); throw error; }
    if (token !== this.generation) throw new DOMException("Cancelled", "AbortError");
  }
  recenter() { if (this.current) this.neutral = this.current; }
  stop() {
    ++this.generation; this.abort?.abort(); clearTimeout(this.timer);
    this.stream?.getTracks().forEach((track) => track.stop()); this.stream = null;
    this.video.pause(); this.video.srcObject = null;
  }
}
