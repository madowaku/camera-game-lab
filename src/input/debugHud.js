import { cameraInputDebug } from "./debugStore.js";
import "./debugHud.css";

const formatNumber = value => Number.isFinite(value) ? (Math.abs(value) >= 100 ? value.toFixed(0) : value.toFixed(1)) : "—";
const esc = value => String(value ?? "").replace(/[&<>"']/g, ch => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" })[ch]);

function pathColor(kind) {
  if (kind.includes("raw")) return "#ffb24a";
  if (kind.includes("filter") || kind.includes("display")) return "#69e7ff";
  return "#b8ff83";
}

function drawPlot(canvas, channel) {
  const rect = canvas.getBoundingClientRect();
  const dpr = Math.min(2, globalThis.devicePixelRatio || 1);
  const width = Math.max(1, Math.round(rect.width * dpr));
  const height = Math.max(1, Math.round(rect.height * dpr));
  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width;
    canvas.height = height;
  }
  const c = canvas.getContext("2d");
  c.setTransform(dpr, 0, 0, dpr, 0, 0);
  const w = rect.width, h = rect.height;
  c.clearRect(0, 0, w, h);
  c.strokeStyle = "#ffffff12";
  c.lineWidth = 1;
  for (let i = 1; i < 4; i++) {
    c.beginPath(); c.moveTo(w * i / 4, 0); c.lineTo(w * i / 4, h); c.stroke();
    c.beginPath(); c.moveTo(0, h * i / 4); c.lineTo(w, h * i / 4); c.stroke();
  }

  for (const [key, trail] of Object.entries(channel?.trails ?? {})) {
    if (!trail.length) continue;
    const kind = key.split(":")[0];
    c.strokeStyle = pathColor(kind);
    c.lineWidth = kind.includes("raw") ? 1.3 : 2.2;
    c.globalAlpha = kind.includes("raw") ? .7 : .95;
    c.beginPath();
    trail.forEach((point, index) => {
      const x = point.x * w, y = point.y * h;
      if (index) c.lineTo(x, y); else c.moveTo(x, y);
    });
    c.stroke();
    const last = trail.at(-1);
    c.fillStyle = pathColor(kind);
    c.beginPath();
    c.arc(last.x * w, last.y * h, kind.includes("raw") ? 3 : 4.5, 0, Math.PI * 2);
    c.fill();
  }
  c.globalAlpha = 1;
}

function renderMetrics(channel) {
  const entries = Object.entries(channel?.metrics ?? {});
  if (!entries.length) return '<div class="camera-input-debug__empty">No extra metrics yet.</div>';
  return "<dl>" + entries.map(([key, value]) =>
    "<dt>" + esc(key) + "</dt><dd>" + esc(typeof value === "number" ? formatNumber(value) : value) + "</dd>"
  ).join("") + "</dl>";
}

function renderEvents(channel) {
  const events = [...(channel?.events ?? [])].slice(-8).reverse();
  if (!events.length) return '<div class="camera-input-debug__empty">No events yet.</div>';
  return "<ol>" + events.map(event => {
    const details = Object.entries(event.data ?? {})
      .filter(([, value]) => value != null && value !== "")
      .map(([key, value]) => key + "=" + (typeof value === "number" ? formatNumber(value) : value))
      .join(" ");
    return "<li><strong>" + esc(event.type) + "</strong>" + (details ? " <span>" + esc(details) + "</span>" : "") + "</li>";
  }).join("") + "</ol>";
}

export function mountCameraInputDebugHud({ available = false, autoOpen = false } = {}) {
  if (!available || typeof document === "undefined") return () => {};

  const toggle = document.createElement("button");
  toggle.type = "button";
  toggle.className = "camera-input-debug-toggle";
  toggle.textContent = "DBG";
  toggle.setAttribute("aria-label", "Camera input debug HUD");

  const hud = document.createElement("aside");
  hud.className = "camera-input-debug";
  hud.hidden = !autoOpen;
  hud.innerHTML = '<div class="camera-input-debug__head"><strong>Camera Input Debug</strong><button type="button" data-clear>CLEAR</button><button type="button" data-close>×</button></div><div class="camera-input-debug__tabs"></div><div class="camera-input-debug__body"></div>';
  document.body.append(hud, toggle);

  let active = null;
  let frameId = null;
  let dirty = true;

  const schedule = () => {
    dirty = true;
    if (frameId == null) frameId = requestAnimationFrame(render);
  };
  const unsubscribe = cameraInputDebug.subscribe(schedule);

  function render() {
    frameId = null;
    if (!dirty || hud.hidden) return;
    dirty = false;
    const snapshot = cameraInputDebug.snapshot();
    const channels = snapshot.channels;
    if (!channels.some(channel => channel.label === active)) active = channels[0]?.label ?? null;
    const channel = channels.find(item => item.label === active) ?? channels[0] ?? null;

    const tabs = hud.querySelector(".camera-input-debug__tabs");
    tabs.innerHTML = channels.map(item =>
      '<button type="button" data-channel="' + esc(item.label) + '" aria-pressed="' + (item.label === channel?.label) + '">' + esc(item.label) + "</button>"
    ).join("");

    const body = hud.querySelector(".camera-input-debug__body");
    if (!channel) {
      body.innerHTML = '<div class="camera-input-debug__empty">Waiting for camera input…</div>';
      return;
    }

    body.innerHTML =
      '<div class="camera-input-debug__stats">' +
      '<div class="camera-input-debug__stat"><small>STATUS</small><strong>' + esc(channel.status) + '</strong></div>' +
      '<div class="camera-input-debug__stat"><small>SCHEDULER</small><strong>' + esc(channel.scheduler) + '</strong></div>' +
      '<div class="camera-input-debug__stat"><small>INFERENCE FPS</small><strong>' + formatNumber(channel.inferenceFps) + '</strong></div>' +
      '<div class="camera-input-debug__stat"><small>INFERENCE ms</small><strong>' + formatNumber(channel.inferenceMs) + '</strong></div>' +
      '</div>' +
      '<canvas class="camera-input-debug__plot" aria-label="Raw and filtered input trails"></canvas>' +
      '<div class="camera-input-debug__legend"><span style="color:#ffb24a">raw</span><span style="color:#69e7ff">filtered/display</span><span style="color:#b8ff83">other</span></div>' +
      '<section class="camera-input-debug__metrics"><strong>METRICS</strong>' + renderMetrics(channel) + '</section>' +
      '<section class="camera-input-debug__events"><strong>EVENTS</strong>' + renderEvents(channel) + '</section>';
    drawPlot(body.querySelector("canvas"), channel);
  }

  function open() {
    hud.hidden = false;
    cameraInputDebug.setEnabled(true);
    toggle.textContent = "DBG ●";
    schedule();
  }

  function close() {
    hud.hidden = true;
    cameraInputDebug.setEnabled(false);
    toggle.textContent = "DBG";
  }

  toggle.addEventListener("click", () => hud.hidden ? open() : close());
  hud.querySelector("[data-close]").addEventListener("click", close);
  hud.querySelector("[data-clear]").addEventListener("click", () => cameraInputDebug.clear());
  hud.querySelector(".camera-input-debug__tabs").addEventListener("click", event => {
    const button = event.target.closest("[data-channel]");
    if (!button) return;
    active = button.dataset.channel;
    schedule();
  });

  if (autoOpen) open();
  return () => {
    unsubscribe();
    if (frameId != null) cancelAnimationFrame(frameId);
    cameraInputDebug.setEnabled(false);
    hud.remove();
    toggle.remove();
  };
}
