const nowMs = () => globalThis.performance?.now?.() ?? Date.now();
const finite = value => Number.isFinite(value);
const trim = (items, at, windowMs) => items.filter(item => at - item.at <= windowMs);

export class CameraInputDebugStore {
  constructor({ trailMs = 2200, eventLimit = 16 } = {}) {
    this.trailMs = trailMs;
    this.eventLimit = eventLimit;
    this.enabled = false;
    this.channels = new Map();
    this.listeners = new Set();
  }

  setEnabled(value) {
    const enabled = !!value;
    if (enabled === this.enabled) return;
    this.enabled = enabled;
    if (!enabled) this.clear();
    this.notify();
  }

  ensure(label) {
    const key = label || "CAMERA";
    let channel = this.channels.get(key);
    if (!channel) {
      channel = {
        label: key,
        status: "OFF",
        scheduler: "—",
        inferenceMs: null,
        inferenceFps: null,
        frameTimes: [],
        metrics: new Map(),
        trails: new Map(),
        events: [],
        updatedAt: 0,
      };
      this.channels.set(key, channel);
    }
    return channel;
  }

  status(label, status, error = null, at = nowMs()) {
    if (!this.enabled) return;
    const channel = this.ensure(label);
    channel.status = status ?? "UNKNOWN";
    channel.updatedAt = at;
    if (error) this.event(label, "ERROR", { name: error.name, message: error.message }, at);
    else this.notify();
  }

  inference(label, { at = nowMs(), durationMs = null, scheduler = null } = {}) {
    if (!this.enabled) return;
    const channel = this.ensure(label);
    channel.frameTimes.push(at);
    channel.frameTimes = channel.frameTimes.filter(value => at - value <= 1000);
    channel.inferenceFps = channel.frameTimes.length > 1
      ? (channel.frameTimes.length - 1) * 1000 / (channel.frameTimes.at(-1) - channel.frameTimes[0])
      : 0;
    channel.inferenceMs = finite(durationMs) ? durationMs : channel.inferenceMs;
    if (scheduler) channel.scheduler = scheduler;
    channel.updatedAt = at;
    this.notify();
  }

  metric(label, key, value, at = nowMs()) {
    if (!this.enabled) return;
    const channel = this.ensure(label);
    if (value == null || typeof value === "boolean" || finite(value) || typeof value === "string") {
      channel.metrics.set(key, value);
      channel.updatedAt = at;
      this.notify();
    }
  }

  point(label, kind, point, {
    at = nowMs(),
    width = 1,
    height = 1,
    slot = point?.slot ?? point?.id ?? 0,
  } = {}) {
    if (!this.enabled || !point?.present && point?.present !== undefined) return;
    if (!finite(point?.x) || !finite(point?.y) || !finite(width) || !finite(height) || width <= 0 || height <= 0) return;
    const channel = this.ensure(label);
    const key = `${kind}:${slot}`;
    const trail = channel.trails.get(key) ?? [];
    trail.push({ at, x: point.x / width, y: point.y / height, kind, slot });
    channel.trails.set(key, trim(trail, at, this.trailMs).slice(-120));
    channel.updatedAt = at;
    this.notify();
  }

  points(label, kind, points, options = {}) {
    if (!this.enabled) return;
    for (const point of points ?? []) this.point(label, kind, point, { ...options, slot: point?.slot ?? point?.id ?? 0 });
  }

  event(label, type, data = {}, at = nowMs()) {
    if (!this.enabled) return;
    const channel = this.ensure(label);
    channel.events.push({ at, type, data });
    channel.events = channel.events.slice(-this.eventLimit);
    channel.updatedAt = at;
    this.notify();
  }

  clear(label = null) {
    if (label) this.channels.delete(label);
    else this.channels.clear();
    this.notify();
  }

  snapshot() {
    return {
      enabled: this.enabled,
      channels: [...this.channels.values()]
        .sort((a, b) => b.updatedAt - a.updatedAt)
        .map(channel => ({
          label: channel.label,
          status: channel.status,
          scheduler: channel.scheduler,
          inferenceMs: channel.inferenceMs,
          inferenceFps: channel.inferenceFps,
          metrics: Object.fromEntries(channel.metrics),
          trails: Object.fromEntries([...channel.trails].map(([key, value]) => [key, value.map(point => ({ ...point }))])),
          events: channel.events.map(event => ({ ...event, data: { ...event.data } })),
          updatedAt: channel.updatedAt,
        })),
    };
  }

  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  notify() {
    for (const listener of this.listeners) listener();
  }
}

export const cameraInputDebug = new CameraInputDebugStore();
