# TINY BOT DUEL camera visibility fix

Updated: 2026-10-04 (Asia/Tokyo)

The front-camera stream could reach READY but remain almost invisible during
calibration: video opacity 0.45, a dark stage gradient and a full-stage 82% opaque
blurred overlay all compounded. This was reproduced using a playing synthetic
MediaStream; camera selection still requested exact facingMode user.

The preview now has full video opacity and lighter shading. Live-camera overlays
no longer darken or blur the whole frame. Calibration/recalibration hides the
arena canvas and puts instructions at the bottom so players can frame their
faces. Play and face-loss recovery keep the camera visible. A compact HUD
background and lower arena shade retain readable text. Keyboard/touch fallback
hides the released video. Existing mirrored object-fit contain framing and
front-camera selection remain intact.

Validation:
- npm test: 333 passed, 0 failed.
- npm run build: Vite and PWA succeeded.
- scripts/qa/tiny-bot-duel-camera.js: 27 browser checks, no page exceptions;
  844x390 landscape, 390x844 portrait and 1440x900 desktop.
- Verified: lazy camera permission, exact front-camera request, live calibration,
  two-face calibration to play, face-loss pause/recovery, manual pause,
  recalibration, fallback, denial/retry, English caption and stream cleanup.

Run the QA function with an existing Vite server on port 5173 and Playwright CLI:
`npx --package @playwright/cli playwright-cli -s=tinybot-camera run-code --filename scripts/qa/tiny-bot-duel-camera.js`
Screenshots are saved under output/playwright.

This fixture substitutes canvas.captureStream and MediaPipe face results.
Android hardware and two-person control reliability remain unverified; this
does not pass or replace the existing five-round human playtest gate.
No public deployment was made as part of this change.