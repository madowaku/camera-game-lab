export function drawFishFace(c, image, { video, face, mode = 'EFFECT', oxygen = 100, open = false, hide = false } = {}) {
  c.clearRect(0, 0, 300, 200); c.drawImage(image, 0, 0, 300, 200);
  const x = 250, y = 105, rx = 34, ry = 43;
  const live = !hide && mode !== 'HIDE' && face && video?.readyState >= 2 && video.videoWidth;
  if (live) {
    const sx = face.left * video.videoWidth, sy = face.top * video.videoHeight;
    const sw = (face.right - face.left) * video.videoWidth, sh = (face.bottom - face.top) * video.videoHeight;
    c.save(); c.beginPath(); c.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); c.clip();
    c.translate(x, y); c.scale(-1, 1); c.drawImage(video, sx, sy, sw, sh, -rx, -ry, rx * 2, ry * 2);
    if (mode === 'EFFECT') {
      c.globalCompositeOperation = 'soft-light'; c.fillStyle = '#25d7b6'; c.fillRect(-rx, -ry, rx * 2, ry * 2);
      c.globalCompositeOperation = 'source-over'; c.strokeStyle = '#e9bf5d88'; c.lineWidth = 1.4;
      for (let row = 0; row < 3; row++) for (let side of [-1, 1]) {
        c.beginPath(); c.arc(side * 25, row * 10 + 7, 7, 0, Math.PI); c.stroke();
      }
    }
    c.restore(); c.strokeStyle = '#f1c764'; c.lineWidth = 2.2;
    c.beginPath(); c.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); c.stroke();
  }
  // Original keeps facial texture intact. EFFECT adds a slightly bulging fish gaze.
  if (mode === 'EFFECT' && live) {
    for (let side of [-1, 1]) {
      c.fillStyle = '#fff6d9'; c.beginPath(); c.ellipse(x + side * 15, y - 12, 10, 11, 0, 0, Math.PI * 2); c.fill();
      c.fillStyle = '#124e53'; c.beginPath(); c.arc(x + side * 15 + 1, y - 11, 5, 0, Math.PI * 2); c.fill();
      c.fillStyle = '#fff'; c.beginPath(); c.arc(x + side * 15 + 3, y - 14, 2, 0, Math.PI * 2); c.fill();
    }
  }
  if (oxygen < 55 || open) {
    c.fillStyle = '#f1b890'; c.beginPath(); c.ellipse(x, y + 22, 20, 13, 0, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#472837'; c.strokeStyle = '#ad5861'; c.lineWidth = 2;
    c.beginPath(); c.ellipse(x, y + 23, open ? 12 : oxygen < 20 ? 7 : 11, open ? 13 : oxygen < 20 ? 10 : 3, 0, 0, Math.PI * 2); c.fill(); c.stroke();
    if (oxygen < 55) {
      c.strokeStyle = '#624326'; c.lineWidth = 3;
      for (let side of [-1, 1]) { c.beginPath(); c.moveTo(x + side * 6, y - 29); c.lineTo(x + side * 25, y - (oxygen < 20 ? 20 : 26)); c.stroke(); }
    }
  }
}
