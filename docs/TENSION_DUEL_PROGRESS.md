# TENSION DUEL v0.1 implementation report

## Implemented
- Isolated `#tension-duel` route integrated into the existing mode selector and JA/EN switch.
- Two-hand front-camera input extends BodyInput and its existing lifecycle. Mirrored cover projection uses one isotropic coordinate scale.
- Intro C illustration, first-round three-step countdown, live player presence, automatic start when both hands are usable, short tracking hold and longer-loss pause, result/retry/back.
- Four centralized tension states, forgiving segment collision with substeps, same-net lock until separation, tilt/contact steering, bounded outgoing speed, elastic network rendering, hit rings and synthesized sounds.
- 15-second active-play rounds; scores, automatic serve toward conceding player after 0.8 seconds, return count and best rally on results.
- Camera-free controls: drag either lane, keyboard and six accessible native ranges. Focus and responsive layouts; landscape/fullscreen support; error recovery with bounded camera initialization.
- No saved video or persistent gameplay records. No PIN/HARE/CATCH or AI opponent.

## Verified
- `npm test`: 56/56 (existing 43 + new 13 pure rules tests).
- `npm run test:tension-ui`: 19 DOM-state checks and five UI-driven synthetic rounds, nine returns in each. Uses jsdom, stub canvas and injected hands, not a real browser/model.
- `npm run build`: successful Vite + PWA production build.
- JavaScript syntax and `git diff --check`: pass.
- Feature-scoped strict UI static audit: zero findings. Full-project static audit flags three pre-existing DUO touch-pad buttons as actionless; inspection confirms their pointerdown listeners exist in `src/duo/duoArcade.js:100`. Report retained; no unrelated DUO changes made.

## Not verified
- Actual browser rendering, screenshots, touch layout and real browser console: unavailable. Cloud browser refused both loopback and supervised preview with `ERR_BLOCKED_BY_CLIENT`. Local Chromium installation received an invalid download archive.
- Actual MediaPipe two-hand recognition, fingertip attachment, hand crossings, Android inference FPS, camera permissions on hardware and sound feel.
- Two-human first-play five-round gate. See `TENSION_DUEL_PLAYTEST.md`.
- GitHub push and deployment. Automatic approval review rejected the push because remote trust/ownership and authorization to transmit source were not established for this request. Nothing was published.

## ID note
The repository already uses EXP-021 for WATERMELON GUIDE and FACE RACER planning. The requested EXP-021 label is preserved with a TENSION qualifier; routing and filenames are unique. Existing IDs are not renumbered.

## Start locally
```sh
npm ci
npm run dev
```
Open the displayed local URL with `#tension-duel`. Camera requires localhost or HTTPS. Start with “Try without camera” to verify the loop, then use the camera and the human checklist.
