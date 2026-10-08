# Camera UI Interaction Layer v0.1

Status: implementation branch `feat/camera-ui-interaction-v01` (not yet merged or physically validated)
Owner: camera-game-lab / TECH-CAMERA-UI-001
Origin: EXP-062 MARU MAGIC, touch-free fingertip retry validated in A401OP on 2026-10-08

## Product goal

"スマホを置いたまま、次のゲームを選び、遊び、もう一度遊べる。"
Make on-screen navigation usable without touching the phone while preserving touch, keyboard, screen readers and every existing game-control path.

### v0.1 scope

- FEED only: explicit opt-in `手で操作 ON/OFF` button.
- Front-camera fingertip cursor while FEED is visible.
- AIR TAP: select PLAY, next-card, favorite, or dedicated prev/next button after **650ms** steady hover.
- AIR SCROLL: vertical air flick inside leftmost **24%** of viewport, >= max(110px, 14% viewport height) within 650ms, one card per gesture; hand must settle before the next flick.
- Air navigation snaps immediately to the next card (existing touch/swipe navigation unchanged).
- MARU MAGIC retry continues its **700ms** proven dwell contract via the shared DwellTarget class.
- One hand only, no gesture classifier or fancy poses. Existing BodyInput + MediaPipe Hand Landmarker.
- FEED hand mode releases camera and recognizer on navigation into a game, backgrounding, pagehide, or explicit OFF. On returning to FEED it starts OFF.
- Whitelisted controls only; no synthetic arbitrary pointer event dispatch. The user's own tap/click/keyboard input always works.
- No stills, recordings, gesture position logs, network upload or local persistent camera samples.

### Excluded in v0.1

- Auto-enabling camera on every page load or returning from gameplay.
- Concurrent FEED camera and active game camera.
- Any autonomous game-menu/result camera UI except the existing MARU retry.
- Camera UI for modal dialogs, sharing, account settings, consent, or destructive actions.
- Full-page DOM scroll dragging or inertial pixel scrolling; this is one-card snap navigation.
- DUO support (hand ownership/consent needs its own design).
- Always-on speech or microphone control.

## Component boundaries

`src/cameraUi/core.js` is DOM-free and dependency-free. DwellTarget consumes {x,y}, monotonic milliseconds and a bounding rectangle; AirSwipe consumes viewport pixels and a blocked-target flag. Existing MARU scoring and drawing coordinates are never modified.

`src/cameraUi/input.js` is an opt-in BodyInput subclass using existing model/runtime lifecycle and landmark 8. It mirrors the full camera frame horizontally once, then maps to the visual viewport. This simple mapping needs A401OP calibration; the invisible camera view may not have exactly the same aspect ratio as the screen.

`src/cameraUi/feedDom.js` creates named semantic buttons, status text and visual cursor. `feedController.js` resolves only explicitly permitted targets via elementFromPoint; a hover is visual until completed and cannot activate unknown buttons or links. Button dwell is never forwarded as gameplay input.

`src/platform/feed.js` owns the navigation callback and destroys the camera UI controller before destroying the feed. The existing per-game camera only starts after hand-menu capture has stopped.

### State diagram

OFF -> STARTING -> ON -> OFF on manual toggle, route exit, pagehide, background, or camera failure.
ON + valid finger + target -> HOVER (ring fills) -> SELECT once -> require finger departure before selecting that target again.
ON + valid finger in left lane + quick vertical travel -> NEXT/PREV once -> settle to re-arm.
ON + missing hand or stale frame -> reset pending dwell/gesture, hide cursor, never trigger action.

## Failure handling & accessibility

- Camera permission denied/unavailable: show a localized nonblocking message; retain touch/keyboard.
- Loss of hand: no gesture or button activation from stale pixels.
- Motion during hover, changed target, lost tracking, interrupted frame >160ms: cancel dwell progress.
- Browser not visible: stop capture, release all tracks.
- Target inside offscreen/inert card: not eligible. Only the active snapped card should receive hand selection.
- Active buttons are native `button` elements with accessible labels; no critical interaction is camera-only.
- Reduced motion avoids animated cursor behavior; instant snap may be used.

## QA gate before adoption

1. `npm test`: existing MARU DwellRetry regressions and cameraUi tests pass.
2. `npm run build`: Vite/PWA compilation passes.
3. Chrome desktop: enable hand mode, deny permission, and exercise synthetic landmark cursor; no route/camera leak.
4. A401OP with phone propped up: 10 successful PLAY selections and 10 next/previous flicks, including a deliberate return to a previous card.
5. Test 20 nonintentional hand moves near controls; **0 unintended page launches** is a goal, not yet verified.
6. Verify non-target SHARE/INFO, overlay and offscreen cards never activate.
7. Turn off, background, switch language, enter/exit gameplay: no lingering camera tracks or overlapping inference.
8. Compare baseline touch scrolling and AIR SCROLL subjective responsiveness; abort or retune if it feels slower.

## Next candidate v0.2

After the A401OP gate, offer a single CameraUiSession controller to game launch / pause / result screens with screen-scoped whitelists, optional opt-in persistence, haptics/sounds, and explicit hand ownership in DUO. Do not silently enable all controls while a game reads hand input.
