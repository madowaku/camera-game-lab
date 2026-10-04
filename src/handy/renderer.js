import bearUrl from "./assets/bear-v1.webp";
import bunnyUrl from "./assets/bunny-v1.webp";
export const W = 720, H = 900;
export const spriteUrls = { bear: bearUrl, bunny: bunnyUrl };

export async function loadSprites() {
  const pairs = await Promise.all(Object.entries(spriteUrls).map(async ([name, url]) => {
    const img = new Image(); img.src = url; await img.decode(); return [name, img];
  }));
  return Object.fromEntries(pairs);
}
const smooth = p => p * p * (3 - 2 * p);
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

function rounded(c, x, y, w, h, r, fill) { c.fillStyle = fill; c.beginPath(); c.roundRect(x, y, w, h, r); c.fill(); }
function star(c, x, y, size, color, rotate = 0) {
  c.save(); c.translate(x, y); c.rotate(rotate); c.fillStyle = color; c.beginPath();
  for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4; const r = i % 2 ? size * .28 : size; c.lineTo(Math.cos(a) * r, Math.sin(a) * r); }
  c.closePath(); c.fill(); c.restore();
}
function heart(c, x, y, size, color) {
  c.save(); c.translate(x, y); c.scale(size / 20, size / 20); c.fillStyle = color; c.beginPath(); c.moveTo(0, 8);
  c.bezierCurveTo(-27, -8, -9, -27, 0, -14); c.bezierCurveTo(9, -27, 27, -8, 0, 8); c.fill(); c.restore();
}

export function palPose(pal, game, reducedMotion = false) {
  const t = game.elapsed, beat = (t - pal.slot * .15) * Math.PI * 4;
  const f = reducedMotion ? .3 : 1;
  let x = pal.x * W, y = pal.y * H, tilt = Math.sin(beat * .5) * .065 * pal.amplitude * f;
  let sx = 1, sy = 1, lift = (6 + Math.sin(beat) * 6) * f;
  if (game.phase === "intro") {
    const pop = smooth(clamp(t / .42, 0, 1)); sx = sy = pop * (1 + Math.sin(t * 13) * Math.exp(-t * 6) * .25);
    tilt += (pal.slot ? -1 : 1) * Math.sin(t * 3) * .16;
  }
  if (pal.state === "wobble") tilt += Math.sin(game.clock * 24) * .19 * f;
  if (pal.state === "search") { tilt = Math.sin(game.clock * 2.5 + pal.slot) * .22 * f; lift = 0; }
  if (game.phase === "playing" && pal.state === "present") {
    const age = clamp((t - pal.danceAt) / 1.1, 0, 1), bounce = Math.sin(age * Math.PI);
    switch (pal.dance) {
      case "idle": {
        const idle = Math.sin(clamp((t - pal.idleAt) / 1.6, 0, 1) * Math.PI) * f;
        // A little greeting, a curious lean, a tiny sneeze, or a hop. Player B
        // does it later and smaller, creating a conversation without input.
        if (pal.idleVariant === 0) tilt += Math.sin((t - pal.idleAt) * 10) * idle * .15;
        if (pal.idleVariant === 1) tilt += idle * (pal.slot ? -.25 : .25);
        if (pal.idleVariant === 2) { sy -= idle * .09; sx += idle * .05; }
        if (pal.idleVariant === 3) lift += idle * 19 * pal.amplitude;
        break;
      }
      case "step": x += Math.sin(age * Math.PI * 4) * 32 * pal.amplitude * f; tilt += Math.sin(age * Math.PI * 4) * .14 * f; break;
      case "jump": lift += bounce * 125 * pal.amplitude * f; sy = 1 + bounce * .08; sx = 1 - bounce * .07; tilt += bounce * .15; break;
      case "crouch": sy = 1 - bounce * .32; sx = 1 + bounce * .18; tilt = 0; break;
      case "spin": sx = Math.cos(age * Math.PI * 4) || .01; tilt = Math.sin(age * Math.PI * 4) * .15 * f; lift += bounce * 22 * f; break;
      case "dash": x += Math.sin(age * Math.PI * 6) * 50 * f; tilt += Math.sin(age * Math.PI * 6) * .3 * f; lift += 12 * f; break;
      case "sparkle": sx = 1 + bounce * .09; sy = 1 + bounce * .09; tilt += (pal.slot ? -1 : 1) * bounce * .16; break;
    }
  }
  if (game.interaction) {
    const age = (t - game.interaction.at) / game.interaction.duration;
    const blend = Math.sin(clamp(age, 0, 1) * Math.PI);
    const centerX = (game.pals[0].x + game.pals[1].x) * W / 2;
    const centerY = Math.min(game.pals[0].y, game.pals[1].y) * H;
    const targetX = centerX + (pal.slot ? 1 : -1) * (game.interaction.type === "hug" ? 48 : 88);
    x += (targetX - x) * blend; y += (centerY - y) * blend;
    tilt = (pal.slot ? -1 : 1) * blend * (game.interaction.type === "hug" ? .23 : .19);
    lift += blend * 24 * f;
  }
  if (["pose", "result"].includes(game.phase)) {
    if (Math.abs(game.pals[0].x - game.pals[1].x) * W < 220) {
      const center = clamp((game.pals[0].x + game.pals[1].x) * W / 2, W * .36, W * .64);
      x = center + (pal.slot ? 110 : -110);
    }
    tilt = pal.slot ? -.15 : .13; lift = pal.input?.y < .5 ? 42 : 8;
    sx = pal.slot ? 1 : 1.04; sy = pal.slot ? 1.04 : 1;
  }
  const size = pal.species === "bunny" ? 280 : 236;
  // Large lifts are a dance trigger, not a demand to push ears out of frame.
  const margin = size * .56;
  const minFloor = size * Math.max(1, sy) + Math.max(0, lift) + 185;
  return { x: clamp(x, margin, W - margin), y: clamp(y, minFloor, H - 75), tilt, sx, sy, lift, size };
}

export function renderStage(canvas, game, { sprites, video, source = "demo", reducedMotion = false, photo = false } = {}) {
  const c = canvas.getContext("2d"); c.clearRect(0, 0, W, H);
  const bg = c.createLinearGradient(0, 0, W, H); bg.addColorStop(0, "#fff5dd"); bg.addColorStop(.55, "#ffe3d1"); bg.addColorStop(1, "#e0efdc");
  c.fillStyle = bg; c.fillRect(0, 0, W, H);
  if (source === "camera" && video?.readyState >= 2 && video.videoWidth) {
    const scale = Math.max(W / video.videoWidth, H / video.videoHeight), w = video.videoWidth * scale, h = video.videoHeight * scale;
    c.save(); c.translate(W, 0); c.scale(-1, 1); c.drawImage(video, (W - w) / 2, (H - h) / 2, w, h); c.restore();
    c.fillStyle = "#fff1d515"; c.fillRect(0, 0, W, H);
  } else {
    c.fillStyle = "#f2c9ad66";
    for (let x = 30; x < W; x += 48) for (let y = 30; y < H; y += 48) { c.beginPath(); c.arc(x, y, 1.7, 0, Math.PI * 2); c.fill(); }
    c.fillStyle = "#cfdfc5"; c.beginPath(); c.ellipse(W / 2, H + 50, W * .9, 230, 0, 0, Math.PI * 2); c.fill();
    c.strokeStyle = "#9fbeaa55"; c.lineWidth = 2;
    for (let i = 0; i < 5; i++) { c.beginPath(); c.ellipse(W / 2, H + 70 + i * 34, W * .9, 235, 0, 0, Math.PI * 2); c.stroke(); }
    star(c, 76, 242, 16, "#d9a552"); star(c, 645, 370, 11, "#f1a691");
  }
  if (game.phase === "waiting") {
    for (const pal of game.pals) {
      const x = pal.x * W, y = pal.y * H;
      rounded(c, x - 77, y - 95, 154, 164, 72, pal.state === "present" ? "#fffef4d9" : "#fff9ee88");
      c.font = '64px "Segoe UI Emoji",sans-serif'; c.textAlign = "center"; c.fillStyle = "#665342"; c.fillText("✋", x, y - 10);
      c.font = 'bold 20px "Trebuchet MS",sans-serif'; c.fillText(pal.slot ? "RIGHT" : "LEFT", x, y + 42);
      if (pal.state === "present") star(c, x + 56, y - 60, 16, "#74ab80");
    }
    return;
  }
  const poses = game.pals.map(p => palPose(p, game, reducedMotion));
  for (const [i, pal] of game.pals.entries()) {
    const p = poses[i], img = sprites?.[pal.species];
    c.save(); c.fillStyle = "#4e473523"; c.beginPath(); c.ellipse(p.x, p.y + 5, 63, 12, 0, 0, Math.PI * 2); c.fill(); c.restore();
    if (source === "demo" && !photo) {
      c.strokeStyle = i ? "#51857b" : "#c7654b"; c.lineWidth = 3; c.setLineDash([6, 6]);
      c.beginPath(); c.ellipse(pal.input?.x * W || pal.x * W, pal.input?.y * H || pal.y * H, 38, 18, 0, 0, Math.PI * 2); c.stroke(); c.setLineDash([]);
    }
    if (img?.complete) {
      c.save(); c.translate(p.x, p.y - p.lift); c.rotate(p.tilt); c.scale(p.sx, p.sy);
      const width = p.size * img.naturalWidth / img.naturalHeight;
      c.drawImage(img, -width / 2, -p.size, width, p.size); c.restore();
    }
    if (!photo) {
      const label = pal.state === "search" ? "…?" : pal.state === "wobble" ? "!?" : i ? "B" : "A";
      rounded(c, p.x - 20, p.y + 22, 40, 31, 16, i ? "#dcf0e9" : "#ffe1d4");
      c.fillStyle = i ? "#416c62" : "#94513a"; c.textAlign = "center"; c.font = 'bold 19px "Trebuchet MS",sans-serif'; c.fillText(label, p.x, p.y + 45);
    }
    if (pal.dance === "sparkle" && game.elapsed - pal.danceAt < 1.1) for (let j = 0; j < 5; j++) {
      const a = j * Math.PI * .4 + game.elapsed; star(c, p.x + Math.cos(a) * 115, p.y - 150 + Math.sin(a) * 90, 10 + Math.sin(game.elapsed * 12 + j) * 4, "#e5b346", a);
    }
    if (pal.dance === "dash" && game.elapsed - pal.danceAt < 1.1) {
      c.strokeStyle = "#fff8e4"; c.lineWidth = 5;
      for (let j = 0; j < 3; j++) { c.beginPath(); c.moveTo(p.x - 98, p.y - 90 - j * 20); c.lineTo(p.x - 136, p.y - 90 - j * 20); c.stroke(); }
    }
  }
  if (game.interaction) {
    const [a, b] = poses, x = (a.x + b.x) / 2, y = Math.min(a.y, b.y) - 245;
    if (game.interaction.type === "hug") for (let i = 0; i < 3; i++) heart(c, x + (i - 1) * 45, y - i % 2 * 35, 18, "#ed997b");
    else { star(c, x, y + 90, 28, "#fffbdc", game.elapsed); star(c, x + 45, y + 55, 12, "#e5b346"); }
  }
  if (game.elapsed >= 28) {
    for (let i = 0; i < 48; i++) {
      const speed = reducedMotion ? 0 : Math.max(0, game.elapsed - 28) * (70 + i % 5 * 22);
      const x = (i * 137 + 39) % W, y = (i * 77 + speed) % (H - 100);
      c.save(); c.translate(x, y); c.rotate(i + game.elapsed * .5); c.fillStyle = ["#e99c7e", "#88bca8", "#e6be65", "#fffdf2"][i % 4]; c.fillRect(-5, -5, 10, 6); c.restore();
    }
  }
  if (photo) {
    rounded(c, 38, 38, W - 76, 92, 22, "#fffaf0e8"); c.textAlign = "center"; c.fillStyle = "#78533c";
    c.font = 'bold 39px "Trebuchet MS",sans-serif'; c.fillText("TODAY'S DUO", W / 2, 91);
    c.font = 'bold 20px "Trebuchet MS",sans-serif'; c.fillText("HANDY PALS · CAMERA GAME LAB", W / 2, H - 35);
    if (source === "demo") { c.font = '15px "Trebuchet MS",sans-serif'; c.fillText("CAMERA-FREE PRACTICE", W / 2, H - 63); }
  }
}
