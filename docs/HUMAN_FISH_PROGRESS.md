# EXP-059 HUMAN FISH v0.1 — implementation and verification

Implemented 2026-10-06 from the user's concept. The playable route is
`#/game/solo-human-fish`; `#human-fish` and `#humanFish` are aliases.

## Playable behavior

- A 45-second life in a generated tropical aquarium. Face translation controls
  swimming; one closed-to-open mouth gesture eats underwater or breathes at the
  surface. Arrival alone never restores oxygen.
- Deep pearls and golden food consume extra oxygen. Giant pearls and golden food
  create a bonus shrimp. Temptations and oxygen pressure increase after 30 seconds.
- Three cat attacks start with a one-second warning from 38 seconds. Sideways
  movement can evade them. Each hit costs oxygen and pushes the fish underwater.
- A gasp refills oxygen to 100%, with waves, droplets, body shudder and PUHAAAA!!.
  Low oxygen changes the expression and muffles sound. Zero oxygen floats the fish
  upward, then shows the six-stat life report and a behavior-based title.
- Touch / drag, arrows / WASD and button / Space practice; pause, BGM and SE mute;
  Japanese / English; retry, next game and life-report sharing.
- EFFECT / ORIGINAL / HIDE face presentation. Local PNG photos and CREATOR's
  seven-second real-play highlight, replay and silent native video export.

The main refinements to the concept are telegraphed cat attacks and freezing
oxygen/time after 0.5 seconds of sustained tracking loss. A returning face must
close its mouth before another bite. A late gasp gets a longer end card rather
than fabricated reaction footage.

## Verification completed

Visibility refinement, 2026-10-09: food markers are larger, with opaque dark
backings, bright outlines and readable food/point badges. Shrimp and golden food
have distinct shapes. The nearest food within the existing bite range displays
`パクッ！` / `BITE!`. Oxygen is now in the top HUD so it cannot hide bottom
treasures; deep prize badges sit above their markers. Existing game rules are
unchanged. Human Fish's 19 unit checks and the production build passed. Browser
QA passed 19 checks at 1440×900, 390×844 and 320×740, including real touch eating,
breathing, locale changes and reduced motion. Evidence: ignored
`output/playwright/human-fish-food-*.png` and `human-fish-food-qa.js`.

`npm test`: **527 passed, 0 failed**. Human Fish has 19 rule/input/director/audio
tests, including exact oxygen exhaustion time, managed 45-second survival,
surface breathing priority, mouth edge/recovery, deep temptation costs, three
cat strikes, calibrated movement and critical-oxygen audio restoration.

`npm run build`: succeeded. Existing large Phaser and inline music chunks cause
the Vite chunk-size advisory; they are split from the initial application bundle.
The produced `dist` contains no standalone MP3 music files.

`scripts/qa/human-fish.js`: **19 Chromium checks passed**. It exercises real
touch controls, shrimp eating, last-gasp recovery, pause, oxygen-zero ending,
retry with the same Phaser Game, feed cleanup, a complete 45-second creator life,
treasures/cat timeline, nonblank WebGL capture, photo download, video download
and locale switching. Desktop 1440×900 and mobile 390×844 were visually reviewed.

`scripts/qa/human-fish-camera.js`: **13 Chromium checks passed**. A synthetic
MediaStream and landmarks go through the actual NoteEaterInput classifier and
Human Fish mapping. It checks permission denial/fallback, neutral calibration,
mirrored movement, held-mouth single gasp, the three face modes, tracking-loss
freeze and recovery, multiple-face rejection, pause and stopped camera tracks.
This is not a physical-camera or MediaPipe-model inference test.

`scripts/qa/human-fish-production.js`: **13 Chromium checks passed** against
`vite preview` on port 5190, using only public controls and DOM evidence. It
checks the legacy alias, generated assets, instructions/credits, touch swimming,
shrimp eating, surface breath, separate BGM/SE mute, natural oxygen exhaustion,
the report, retry and feed cleanup. No production page errors or failed asset
responses were observed. Together the browser scripts pass 45 checks.

The public save controls produced these local verification artifacts:

- `output/human-fish/todays-human-fish.png`: actual aquarium/player frame.
- `output/human-fish/camera-game-059-7s.mp4`: H.264, 540×960, video-only,
  614,991 bytes. The edit plan is exactly 7,000ms; ffprobe reports 6.886367s
  for this native-encoder run because the shared exporter stops slightly before
  the endpoint. No BGM or microphone audio is present.
- `output/playwright/human-fish-*.png`: entrance, play, gasp, treasures, cat,
  life report, face modes and tracking-loss evidence.
- `output/human-fish/tests.txt`: final test output. QA artifacts are ignored by Git.

## Assets and architecture

Commit preparation, 2026-10-07: Human Fish and its required shared Phaser
dependencies were reconstructed over the current `main`, excluding unrelated
uncommitted work. All **596 tests passed** and the production build succeeded
for this isolated commit candidate. The earlier 527-test run above records the
implementation-time working tree; it is not the release test count.

The existing Phaser runtime, NoteEaterInput / MediaPipe acquisition, platform
launcher, music owner and CREATOR recorder/exporter are reused. No plugin,
package or external service was added for this game. The pure game core owns
rules; the Phaser Scene owns rendering; DOM owns controls and permissions.
There is one simulation loop. Retry reuses the Game; feed exit destroys it.

The avatar is a 300×200 face-composited CanvasTexture refreshed about every 65ms;
the full camera frame is not uploaded as a Phaser texture. CREATOR keeps a
12-second rolling buffer plus important windows, under the shared 24MiB cap.
It reduces capture resolution/frequency under load. PLAY retains one recent
still in memory for the optional photo control and does not record a video.

Images were generated with the built-in `image_gen.imagegen` tool, copied into
`src/humanFish/assets`, and normalized to WebP. Music is OpenTracks “aquarium” by
えだまめ88, verified against the site license and creator terms. Shared Kenney
CC0 sounds supplement locally synthesized effects.

Exact image prompts, source URLs, licenses, edits and SHA-256 hashes are in
[`human-fish-assets.json`](human-fish-assets.json) and
[`human-fish-image-prompts.txt`](human-fish-image-prompts.txt).
The implemented rules are in
[`specs/EXP-059_HUMAN_FISH_SPEC_v0.1.md`](specs/EXP-059_HUMAN_FISH_SPEC_v0.1.md).

## Remaining device playtest

Use a real front camera to check whether small head movements reach the full
tank comfortably and closed/open mouth gestures feel dependable. Play one life
while moving briefly out of frame; oxygen/time should pause and recovery should
not invent a bite. Verify PHOTO, a full CREATOR life and repeated retries on
Android Chrome and iPhone Safari, including reduced motion and backgrounding.

These physical camera, mobile GPU and human-feel checks have not been performed
in this environment. Oxygen costs and movement sensitivity are isolated in the
core/signal modules for tuning after that playtest. The game has not been deployed.
