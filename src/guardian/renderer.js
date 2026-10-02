// Separate head, torso, arm and hand parts form an original 2D WARDEN rig.
// Canvas composition keeps the live camera, person mask and exported photo aligned.
export function coverTransform(sourceWidth, sourceHeight, width, height) {
  const scale = Math.max(width / sourceWidth, height / sourceHeight);
  return { width: sourceWidth * scale, height: sourceHeight * scale,
    x: (width - sourceWidth * scale) / 2, y: (height - sourceHeight * scale) / 2 };
}
const mix = (a, b, t) => a + (b - a) * t;
const polygon = (ctx, points, fill, stroke = "#a8f5ee", lineWidth = 1.5) => {
  ctx.beginPath(); points.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y));
  ctx.closePath(); ctx.fillStyle = fill; ctx.fill();
  if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lineWidth; ctx.stroke(); }
};
const line = (ctx, points, color = "#a8f5ee", width = 2) => {
  ctx.beginPath(); points.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y));
  ctx.strokeStyle = color; ctx.lineWidth = width; ctx.stroke();
};

export class GuardianRenderer {
  constructor(canvas, video, input) {
    this.canvas = canvas; this.ctx = canvas.getContext("2d", { alpha: false });
    this.video = video; this.input = input; this.foreground = document.createElement("canvas");
    this.fg = this.foreground.getContext("2d");
    this.anchor = null; this.effects = []; this.time = 0;
    this.reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
    this.resizeObserver = new ResizeObserver(() => this.resize()); this.resizeObserver.observe(canvas);
    this.resize();
  }
  resize() {
    const rect = this.canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    this.width = rect.width; this.height = rect.height;
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 1.5);
    this.canvas.width = Math.round(rect.width * pixelRatio); this.canvas.height = Math.round(rect.height * pixelRatio);
    this.pixelRatio = pixelRatio;
    this.foreground.width = this.canvas.width; this.foreground.height = this.canvas.height;
    this.anchor = null;
  }
  toStage(point, demo = false) {
    if (demo || !this.video.videoWidth) return { x: point.x * this.width, y: point.y * this.height };
    const cover = coverTransform(this.video.videoWidth, this.video.videoHeight, this.width, this.height);
    return { x: cover.x + point.x * cover.width, y: cover.y + point.y * cover.height };
  }
  effect(event) { this.effects.push({ ...event, age: 0 }); this.effects = this.effects.slice(-16); }
  reset() { this.effects.length = 0; this.anchor = null; }
  drawCamera(ctx, source, mirror = true) {
    const sourceWidth = source.videoWidth || source.width, sourceHeight = source.videoHeight || source.height;
    const cover = coverTransform(sourceWidth, sourceHeight, this.width, this.height);
    ctx.save();
    if (mirror) { ctx.translate(this.width, 0); ctx.scale(-1, 1); }
    ctx.drawImage(source, cover.x, cover.y, cover.width, cover.height); ctx.restore();
  }
  draw({ game, pose, demo, photo = false, photoPose = 0, dt = 16 }) {
    if (!this.width) return;
    const ctx = this.ctx, w = this.width, h = this.height;
    const frozen = game.paused;
    if (!frozen) {
      this.time += dt;
      this.effects.forEach((effect) => effect.age += dt);
      this.effects = this.effects.filter((effect) => effect.age < (effect.type === "ascend" ? 2300 : 750));
    }
    ctx.setTransform(this.pixelRatio, 0, 0, this.pixelRatio, 0, 0);
    ctx.fillStyle = "#0c171a"; ctx.fillRect(0, 0, w, h);
    const camera = !demo && this.video.readyState >= 2 && this.video.videoWidth > 0;
    if (camera) {
      this.drawCamera(ctx, this.video);
      ctx.fillStyle = "#071a2020"; ctx.fillRect(0, 0, w, h);
    } else this.drawSanctuary(ctx, w, h);
    const guardianVisible = photo || !["align", "countdown"].includes(game.phase);
    if (pose) {
      const shoulder = this.toStage(pose.center, demo), head = this.toStage(pose.head, demo);
      const left = this.toStage({ x: pose.center.x - pose.shoulderWidth / 2, y: pose.center.y }, demo);
      const right = this.toStage({ x: pose.center.x + pose.shoulderWidth / 2, y: pose.center.y }, demo);
      const scale = Math.max(0.28, Math.min(2.4, h / 540, Math.abs(right.x - left.x) * 2.8 / 340));
      const target = { x: shoulder.x, y: head.y - 105 * scale, scale };
      this.anchor ??= { ...target };
      const amount = 1 - Math.exp(-dt / 150);
      if (!frozen) for (const key of ["x", "y", "scale"]) this.anchor[key] = mix(this.anchor[key], target[key], amount);
    }
    this.anchor ??= { x: w * 0.5, y: h * 0.22, scale: w / 540 };
    ctx.save();
    const impact = this.effects.find((event) => (event.type === "punch" && event.hit || event.type === "damage") && event.age < 160);
    if (impact && !this.reducedMotion.matches) ctx.translate(Math.sin(impact.age * 0.14) * 5, Math.cos(impact.age * 0.18) * 3);
    if (guardianVisible) this.drawGuardian(ctx, game, photo ? photoPose : -1, pose);
    // Repaint the player over WARDEN using the pose model's soft person mask.
    if (camera && this.input.maskReady && pose) {
      const fg = this.fg;
      fg.setTransform(this.pixelRatio, 0, 0, this.pixelRatio, 0, 0);
      fg.clearRect(0, 0, w, h); fg.globalCompositeOperation = "source-over";
      this.drawCamera(fg, this.video);
      fg.globalCompositeOperation = "destination-in"; this.drawCamera(fg, this.input.mask);
      fg.globalCompositeOperation = "source-over"; ctx.drawImage(this.foreground, 0, 0, w, h);
    } else if (demo) this.drawDemoPlayer(ctx, pose);
    if (!photo) {
      game.enemies.forEach((enemy) => this.drawDemon(ctx, enemy.x * w, enemy.y * h, w * 0.055, enemy.age));
      if (game.boss) this.drawDemon(ctx, w * 0.5, h * 0.24, w * 0.18, this.time, true);
      if (game.shieldMs > 0) this.drawShield(ctx, game.shieldMs);
      this.drawEffects(ctx, w, h);
    }
    ctx.restore();
    // A quiet edge vignette leaves the camera legible, especially around faces.
    const vignette = ctx.createLinearGradient(0, 0, 0, h);
    vignette.addColorStop(0, "#04111499"); vignette.addColorStop(0.23, "#04111400");
    vignette.addColorStop(0.76, "#04111400"); vignette.addColorStop(1, "#041114c0");
    ctx.fillStyle = vignette; ctx.fillRect(0, 0, w, h);
  }
  drawSanctuary(ctx, w, h) {
    const glow = ctx.createRadialGradient(w * 0.5, h * 0.32, 0, w * 0.5, h * 0.32, w * 0.7);
    glow.addColorStop(0, "#1a3d43"); glow.addColorStop(1, "#091517");
    ctx.fillStyle = glow; ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = "#65c6c51c"; ctx.lineWidth = 1;
    for (let x = 0; x < w; x += w / 10) line(ctx, [[x, 0], [x, h]], "#72d9d009", 1);
    for (let y = 0; y < h; y += w / 10) line(ctx, [[0, y], [w, y]], "#72d9d009", 1);
    ctx.save(); ctx.translate(w * 0.5, h * 0.32);
    for (const size of [w * 0.28, w * 0.39]) {
      ctx.beginPath(); ctx.arc(0, 0, size, 0, Math.PI * 2); ctx.stroke();
      for (let i = 0; i < 12; i++) {
        const angle = i * Math.PI / 6;
        line(ctx, [[Math.cos(angle) * (size - 5), Math.sin(angle) * (size - 5)],
          [Math.cos(angle) * (size + 5), Math.sin(angle) * (size + 5)]], "#65c6c533", 1);
      }
    }
    ctx.restore();
    for (let i = 0; i < 25; i++) {
      const x = (i * 79.7) % w, y = ((i * 43 + h - (this.reducedMotion.matches ? 0 : this.time * 0.008)) % h + h) % h;
      ctx.fillStyle = "#bcfff9"; ctx.globalAlpha = 0.1 + (Math.sin(i) + 1) * 0.12;
      ctx.fillRect(x, y, i % 4 === 0 ? 2 : 1, 2);
    }
    ctx.globalAlpha = 1;
  }
  drawGuardian(ctx, game, poseIndex, playerPose) {
    const { x, y, scale } = this.anchor;
    const ascend = game.phase === "ascension" ? Math.min(1, game.phaseMs / 1100) : 0;
    const bob = this.reducedMotion.matches ? 0 : Math.sin(this.time / 1500) * 4;
    const awakening = game.phase === "awakening" ? Math.min(1, game.phaseMs / 750) : 1;
    ctx.save(); ctx.translate(x, y + bob); ctx.scale(scale * (1 + ascend * 1.3), scale * (1 + ascend * 1.3));
    ctx.globalAlpha = 0.85 * awakening;
    // Halo and cloth trail remain behind the articulated plates.
    ctx.save(); ctx.strokeStyle = "#a0f6ef66"; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(0, 0, 87, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.arc(0, 0, 105, -0.4, Math.PI * 1.3); ctx.stroke();
    for (let i = 0; i < 8; i++) {
      const a = Math.PI * i / 4;
      line(ctx, [[Math.cos(a) * 95, Math.sin(a) * 95], [Math.cos(a) * 113, Math.sin(a) * 113]], "#d9fffa80", 2);
    }
    ctx.restore();
    polygon(ctx, [[-76, 138], [-103, 358], [-45, 438], [0, 372], [45, 438], [103, 358], [76, 138]], "#497e7c38", "#b7fff63a");
    line(ctx, [[-60, 200], [-55, 354], [-38, 393]], "#92ede066", 1);
    line(ctx, [[60, 200], [55, 354], [38, 393]], "#92ede066", 1);
    // Torso: alternating facets, collar and a diamond spirit core.
    polygon(ctx, [[-83, 68], [-108, 100], [-75, 218], [0, 266], [75, 218], [108, 100], [83, 68], [0, 91]], "#b3e2d454");
    polygon(ctx, [[-83, 68], [-108, 100], [-48, 172], [0, 146], [0, 91]], "#94cabf60", "#cefff04d");
    polygon(ctx, [[83, 68], [108, 100], [48, 172], [0, 146], [0, 91]], "#e0ffef70", "#ddfff55e");
    polygon(ctx, [[-48, 172], [-75, 218], [0, 266], [0, 146]], "#4e8e8950", "#cefff04d");
    polygon(ctx, [[48, 172], [75, 218], [0, 266], [0, 146]], "#81c6b96a", "#cefff04d");
    for (let i = 0; i < 3; i++) line(ctx, [[-47 + i * 5, 181 + i * 18], [0, 207 + i * 15], [47 - i * 5, 181 + i * 18]], "#c9fff766", 2);
    ctx.save(); ctx.shadowBlur = 20; ctx.shadowColor = "#9affec";
    polygon(ctx, [[0, 111], [18, 139], [0, 170], [-18, 139]], "#defff6", "#ffffff", 1);
    ctx.restore();
    // Helmet: an inhuman stone mask, swept crown, bright slit eyes.
    polygon(ctx, [[-43, -48], [0, -67], [43, -48], [38, 19], [0, 62], [-38, 19]], "#9ecfc285", "#e1fff1");
    polygon(ctx, [[-43, -48], [-20, -35], [-20, 14], [0, 62], [-38, 19]], "#396a6855", "#cefff05e");
    polygon(ctx, [[43, -48], [20, -35], [20, 14], [0, 62], [38, 19]], "#e2fff488", "#cefff066");
    polygon(ctx, [[-43, -39], [-58, -84], [-15, -61], [0, -92], [15, -61], [58, -84], [43, -39], [0, -55]], "#c2eedb9c");
    polygon(ctx, [[-25, -22], [0, -5], [25, -22], [17, 7], [0, 22], [-17, 7]], "#173c3fd9", "#a6f6e380");
    const eyesOpen = game.phase !== "awakening" || game.phaseMs > 550;
    if (eyesOpen) {
      ctx.save(); ctx.shadowColor = "#c8fffd"; ctx.shadowBlur = 16;
      line(ctx, [[-27, -12], [-9, -6]], "#e4ffff", 4); line(ctx, [[9, -6], [27, -12]], "#e4ffff", 4); ctx.restore();
    }
    line(ctx, [[0, 25], [0, 47]], "#d9fff6", 2);
    for (const side of [-1, 1]) {
      const shoulder = { x: side * 112, y: 106 };
      let elbow = { x: side * 159, y: 200 }, wrist = { x: side * 145, y: 295 }, hand = "fist", handRotation = 0;
      if (poseIndex === 0 || game.phase === "idle") { elbow = { x: side * 132, y: 208 }; wrist = { x: -side * 52, y: 179 }; }
      if (poseIndex === 1) {
        const arm = playerPose?.arms.filter((arm) => arm.wrist).reduce((best, arm) => {
          const reach = (value) => Math.hypot((value.wrist.x - value.shoulder.x) * playerPose.aspect, value.wrist.y - value.shoulder.y);
          return !best || reach(arm) > reach(best) ? arm : best;
        }, null);
        const pointingSide = arm?.side === "left" ? -1 : 1;
        if (side === pointingSide) {
          const dx = arm ? (arm.wrist.x - arm.shoulder.x) * playerPose.aspect : 1;
          const dy = arm ? arm.wrist.y - arm.shoulder.y : -0.3;
          const length = Math.hypot(dx, dy) || 1, nx = dx / length, ny = dy / length;
          elbow = { x: shoulder.x + nx * 65, y: shoulder.y + ny * 65 };
          wrist = { x: shoulder.x + nx * 135, y: shoulder.y + ny * 135 };
          hand = "point"; handRotation = Math.atan2(ny, nx) + Math.PI / 2;
        }
      }
      if (poseIndex === 2 && side < 0) { elbow = { x: -165, y: 164 }; wrist = { x: -25, y: 30 }; hand = "palm"; handRotation = Math.PI / 2; }
      if (poseIndex === 3) { elbow = { x: side * 185, y: 167 }; wrist = { x: side * 207, y: 82 }; hand = "peace"; }
      if (game.shieldMs > 0 || ascend > 0) { elbow = { x: side * 205, y: 95 }; wrist = { x: side * 273, y: 55 - ascend * 110 }; hand = "palm"; }
      const recent = [...this.effects].reverse().find((effect) => ["punch", "shot"].includes(effect.type) && effect.age < 430 &&
        (effect.side === "left" ? -1 : 1) === side);
      if (poseIndex === -1 && recent) {
        const amount = Math.sin(recent.age / 430 * Math.PI);
        elbow = { x: side * (166 + amount * 40), y: 148 - amount * 20 };
        wrist = { x: side * (166 + amount * 75), y: 170 - amount * 90 };
        hand = recent.type === "shot" ? "point" : "fist";
        if (recent.type === "shot") {
          const aim = recent.targets?.[0] ?? recent.direction ?? { x: side < 0 ? 0.2 : 0.8, y: 0.3 };
          const dx = (aim.x * this.width - x) / scale - shoulder.x;
          const dy = (aim.y * this.height - y) / scale - shoulder.y;
          const length = Math.hypot(dx, dy) || 1, nx = dx / length, ny = dy / length;
          elbow = { x: shoulder.x + nx * 65, y: shoulder.y + ny * 65 };
          wrist = { x: shoulder.x + nx * 135, y: shoulder.y + ny * 135 };
          handRotation = Math.atan2(ny, nx) + Math.PI / 2;
        }
      }
      this.drawArm(ctx, shoulder, elbow, wrist, side, hand, poseIndex === 2 && side < 0 ? 1.7 : 1, handRotation);
      polygon(ctx, [[side * 87, 69], [side * 145, 53], [side * 177, 100], [side * 134, 128], [side * 91, 105]], "#d2f9e68c");
      line(ctx, [[side * 121, 70], [side * 149, 100], [side * 133, 111]], "#295453", 3);
    }
    ctx.restore();
  }
  drawArm(ctx, shoulder, elbow, wrist, side, hand, size, handRotation = 0) {
    const plate = (a, b, radius, fill) => {
      const angle = Math.atan2(b.y - a.y, b.x - a.x), nx = Math.sin(angle) * radius, ny = -Math.cos(angle) * radius;
      polygon(ctx, [[a.x + nx, a.y + ny], [b.x + nx * 0.7, b.y + ny * 0.7],
        [b.x - nx * 0.7, b.y - ny * 0.7], [a.x - nx, a.y - ny]], fill);
      line(ctx, [[a.x, a.y], [b.x, b.y]], "#e0fff755", 2);
    };
    plate(shoulder, elbow, 24, "#80b7b283"); plate(elbow, wrist, 29, "#bae7d996");
    ctx.save(); ctx.translate(wrist.x, wrist.y); ctx.rotate(handRotation); ctx.scale(size, size);
    polygon(ctx, [[-25, -19], [17, -24], [31, 0], [23, 32], [-19, 37], [-34, 11]], "#c8f8e5c0");
    for (let i = 0; i < 3; i++) line(ctx, [[-17 + i * 11, -12], [-15 + i * 11, 14]], "#416c668f", 2);
    if (hand === "peace" || hand === "point") {
      line(ctx, [[-7, -13], [-13, -61]], "#cbffed", 11);
      if (hand === "peace") line(ctx, [[7, -16], [24, -58]], "#cbffed", 11);
    }
    if (hand === "palm") for (let i = 0; i < 4; i++) line(ctx, [[-17 + i * 11, -13], [-24 + i * 16, -45]], "#cbffed", 8);
    ctx.restore();
  }
  drawDemoPlayer(ctx, pose) {
    const head = this.toStage(pose?.head ?? { x: 0.5, y: 0.38 }, true), w = this.width;
    ctx.save(); ctx.translate(head.x, head.y); ctx.scale(w / 500, w / 500);
    polygon(ctx, [[-55, 57], [-90, 91], [-115, 247], [-93, 330], [93, 330], [115, 247], [90, 91], [55, 57]], "#0b1f24", "#629e9d66", 1.5);
    ctx.fillStyle = "#1f3c42"; ctx.beginPath(); ctx.ellipse(0, -2, 46, 57, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = "#8cc7bf80"; ctx.lineWidth = 1.5; ctx.stroke();
    polygon(ctx, [[-43, -19], [-27, -54], [14, -62], [43, -34], [44, -1], [20, -22], [-8, -30], [-41, -2]], "#081a1f", null);
    line(ctx, [[-22, 9], [-12, 9]], "#a5d8cd", 2); line(ctx, [[12, 9], [22, 9]], "#a5d8cd", 2);
    line(ctx, [[-8, 34], [8, 34]], "#a5d8cd70", 2);
    line(ctx, [[-49, 68], [0, 84], [49, 68]], "#7ec2ba60", 1.5);
    ctx.fillStyle = "#a5d8cd"; ctx.font = "10px Consolas, monospace"; ctx.textAlign = "center";
    ctx.fillText("YOU", 0, 142); ctx.restore();
  }
  drawDemon(ctx, x, y, size, age, boss = false) {
    ctx.save(); ctx.translate(x, y + (this.reducedMotion.matches ? 0 : Math.sin(age / 180) * 5)); ctx.scale(size / 40, size / 40);
    const warning = boss ? true : age > 2600;
    if (warning) {
      ctx.strokeStyle = "#ff71637a"; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(0, 0, 55, 0, Math.PI * 2); ctx.stroke();
    }
    polygon(ctx, [[-25, -17], [-42, -48], [-34, -4], [-53, 18], [-28, 13], [-21, 34], [0, 49], [21, 34], [28, 13], [53, 18], [34, -4], [42, -48], [25, -17], [0, -29]], "#210f18ec", "#ed6e657f", 1.5);
    polygon(ctx, [[-27, -15], [-17, -8], [0, 0], [17, -8], [27, -15], [20, 14], [0, 35], [-20, 14]], "#6927327f", null);
    line(ctx, [[-23, -3], [-8, 3]], "#ff8a6b", 4); line(ctx, [[8, 3], [23, -3]], "#ff8a6b", 4);
    line(ctx, [[-10, 23], [0, 16], [10, 23]], "#ff8a6b", 2);
    if (boss) {
      polygon(ctx, [[-29, -20], [-35, -69], [-9, -43], [0, -66], [9, -43], [35, -69], [29, -20]], "#7a343d", "#ff8a6b", 1.5);
      ctx.font = "6px Consolas, monospace"; ctx.textAlign = "center"; ctx.fillStyle = "#ffc1a9"; ctx.fillText("DEMON LORD", 0, 66);
    }
    ctx.restore();
  }
  drawShield(ctx, remaining) {
    const w = this.width, h = this.height;
    ctx.save(); ctx.globalAlpha = Math.min(1, remaining / 160);
    ctx.strokeStyle = "#c1fff0"; ctx.lineWidth = 2; ctx.fillStyle = "#a5fae41a";
    const points = Array.from({ length: 6 }, (_, i) => [w * 0.5 + Math.cos(i * Math.PI / 3) * w * 0.42,
      h * 0.51 + Math.sin(i * Math.PI / 3) * w * 0.48]);
    polygon(ctx, points, "#a5fae419", "#bcfff5", 2);
    ctx.beginPath(); ctx.ellipse(w / 2, h * 0.51, w * 0.44, w * 0.51, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.restore();
  }
  drawEffects(ctx, w, h) {
    for (const event of this.effects) {
      const p = Math.min(1, event.age / 600), fade = 1 - p;
      ctx.save();
      if (event.type === "punch") {
        const side = event.screenSide ?? (event.side === "left" ? -1 : 1);
        const x = w * (side < 0 ? 0.27 : 0.73), y = h * 0.49;
        ctx.globalAlpha = fade;
        if (event.age < 240) {
          ctx.save(); ctx.translate(x, y); ctx.scale(w / 230 * (0.8 + p), w / 230 * (0.8 + p));
          polygon(ctx, [[-25, -27], [21, -30], [38, -8], [27, 32], [-20, 33], [-36, 8]], "#cffff1dd", "#ffffff", 2);
          for (let i = 0; i < 3; i++) line(ctx, [[-16 + i * 12, -16], [-15 + i * 12, 5]], "#4a857a", 2);
          ctx.restore();
        }
        ctx.strokeStyle = "#d1fff3"; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.ellipse(x, y, 10 + p * w * 0.45, 5 + p * w * 0.2, -0.4 * side, 0, Math.PI * 2); ctx.stroke();
      }
      if (event.type === "shot") {
        const target = event.targets?.[0] ?? event.direction ?? { x: 0.75, y: 0.3 };
        ctx.globalAlpha = fade; ctx.shadowColor = "#c0fff5"; ctx.shadowBlur = 15;
        line(ctx, [[this.anchor.x, this.anchor.y + 150 * this.anchor.scale], [target.x * w, target.y * h]], "#e1ffff", 8 * fade);
      }
      for (const target of event.targets ?? []) {
        ctx.globalAlpha = fade;
        for (let i = 0; i < 8; i++) {
          const angle = i * Math.PI / 4;
          line(ctx, [[target.x * w + Math.cos(angle) * p * 80, target.y * h + Math.sin(angle) * p * 80],
            [target.x * w + Math.cos(angle) * (p * 80 + 13), target.y * h + Math.sin(angle) * (p * 80 + 13)]], "#cffff4", 2);
        }
      }
      if (event.type === "damage") { ctx.fillStyle = `rgba(230,76,72,${fade * 0.22})`; ctx.fillRect(0, 0, w, h); }
      if (event.type === "awaken" && event.age < 250 && !this.reducedMotion.matches) {
        for (let i = 0; i < 12; i++) { ctx.fillStyle = `rgba(208,255,251,${fade * 0.15})`; ctx.fillRect(0, (event.age * 3 + i * 71) % h, w, 2 + i % 5); }
      }
      if (event.type === "ascend") {
        const charge = event.age / 1900;
        ctx.globalAlpha = Math.min(0.85, charge * charge);
        ctx.fillStyle = this.reducedMotion.matches ? "#78c5b82a" : "#f1fff9"; ctx.fillRect(0, 0, w, h);
        if (charge < 0.8) {
          line(ctx, [[w * 0.5, h * 0.85], [w * 0.5, h * 0.12]], "#e1fff1", w * charge * 0.42);
        }
      }
      ctx.restore();
    }
  }
  photograph({ game, pose, demo, photoPose, includeUi }) {
    this.draw({ game, pose, demo, photo: true, photoPose, dt: 0 });
    const output = document.createElement("canvas"); output.width = this.canvas.width; output.height = this.canvas.height;
    const ctx = output.getContext("2d"); ctx.drawImage(this.canvas, 0, 0);
    if (includeUi) {
      const w = output.width, h = output.height;
      ctx.fillStyle = "#05171dd9"; ctx.fillRect(0, h - w * 0.14, w, w * 0.14);
      ctx.fillStyle = "#dbfff5"; ctx.textAlign = "left"; ctx.font = `bold ${w * 0.028}px Consolas, monospace`;
      ctx.fillText("GUARDIAN SPIRIT", w * 0.04, h - w * 0.082);
      ctx.fillStyle = "#add5cb"; ctx.font = `${w * 0.022}px Consolas, monospace`;
      ctx.fillText(`DEMONS DEFEATED: ${game.defeated}   COMBO: ${game.maxCombo}${demo ? "   / DEMO" : ""}`, w * 0.04, h - w * 0.04);
    }
    return output;
  }
}
