# EXP-056 HAND SPELL — implementation and verification

Implemented on 2026-10-04 in the existing Camera Game Lab. Canonical route
`#/game/solo-hand-spell`, aliases `#hand-spell` and `#handSpell`.
Local built preview: http://127.0.0.1:5181/#/game/solo-hand-spell.

Five signs, three perfect spells and seven rule-based misfires, 15-second
challenge, progressive COPY THIS tutorial, SPELL BOOK, front camera and
camera-free practice, JA/EN, BGM/SE, pause and tracking-loss recovery are
implemented. CREATOR includes ORIGINAL/EFFECT/HIDE, seven-second automatic
edited replay and optional local silent video saving.

Imagegen produced the transparent dragon and dark mage. Canvas handles
hand-following rune stacks, shared charge, flame zoom, visual hitstop, bounded
shake, lightning, full-screen ice/frozen enemy and distinct misfire visuals.
GSAP controls seal lock, charge expansion and impact. Live reduced-motion
preferences and route cleanup stop those effects. The platform motion profile
counts only actual locks and leaves spell titles to the native canvas to avoid
duplicate captions.

## Verification completed

- `npm test`: 470 passed, zero failures. Twelve new tests cover all judgments,
  timelines/tutorial, hold/cooldown/fresh frames, rotation/mirror/world geometry,
  two-palm release, cropped camera projection, book sanitation and replay edits.
- `npm run build`: passed. Existing large lazy music-chunk warning remains.
- `scripts/qa/hand-spell.js`: 42 browser checks; 1440×900, 390×844, 360×800;
  tutorial, hidden memory, keyboard/buttons, pause, perfect/misfire, collection,
  retry, locale, live reduced motion, audio toggles, routing and resource cleanup.
  No browser exceptions or network failures in that run.
- `scripts/qa/hand-spell-camera.js`: 14 synthetic camera checks; HIDE privacy,
  no microphone, missing-hand pause/stable recovery, no phantom seal, three
  camera observation locks, both palms reserved for release, forward expansion,
  track teardown, denial and practice fallback. This is not a human playtest.
- `scripts/qa/hand-spell-outcomes.js`: 27 checks; all remaining spells use actual
  practice button sequences, nonblank canvas evidence, PLAY has no replay frames,
  all ten book entries and a successful CREATOR download.
- `scripts/qa/hand-spell-model.js`: real MediaPipe Hand Landmarker and Face
  Detector models/WASM loaded and inferred on a synthetic canvas video. Blank
  input produced no hand; front-only/no-audio constraints and model/track exit
  cleanup were checked. No physical webcam or human inference claim.
- `scripts/qa/hand-spell-production.js`: 19 checks against built assets, with no
  dev imports or injected outcome; dragon, thunder, ice and chick, mobile/desktop
  fit and no duplicate motion caption. Zero production exceptions/resource failures.
- `ffprobe` inspected `output/playwright/hand-spell-dragon_flame-7s.webm`:
  7.013473 seconds, VP9 270×480, one video stream and no audio stream.
- Screenshots were visually inspected; fixes include enemy aspect ratio,
  phone controls within reach, duplicate cast captions, soft thunder glow and
  full-screen ice with a visibly frozen enemy.

QA commands use `npx --yes --package @playwright/cli playwright-cli -s=hand-spell
run-code --filename scripts/qa/<script>.js`. Run the main, camera, outcomes and
model scripts in that order against the dev server; outcomes expects the two
discoveries from the main script. Production runs against a built preview.
Screenshots, reports and the exported WebM are in ignored `output/playwright/`.

Physical phone recognition quality, varied lighting/skin tones and iOS/Android
export support remain pending in [the playtest checklist](HAND_SPELL_PLAYTEST.md).
Full input/timeline/privacy decisions: [MVP specification](HAND_SPELL_SPEC_V01.md).
Audio URLs, licenses and image hashes: [asset manifest](hand-spell-assets.json).
Exact Imagegen requests: [generation prompts](hand-spell-image-prompts.txt).

## Music and entry copy update (2026-10-04)

The user-selected **The maze of aqua / 蒲鉾さちこ**, OpenTracks track 23061,
now plays through a dedicated lazy inline module. Track 1 was acquired from
the official download form; the opening 30 seconds retain the original tempo,
pitch and arrangement. Site/creator conditions, source and runtime hashes are
recorded in the asset manifest and music license. Seal locks no longer change
BGM speed; the original rune/charge SE still build anticipation.

Catalog and launch copy now read **指で印を結んで召喚せよ** / **Make the signs.
Summon your magic.** They do not reveal the potato outcome.

- Focused HAND SPELL and shared music tests: 17 passed.
- Production build: passed, with the existing large music chunk warning.
- Built-preview smoke: 20 checks passed. JA/EN catalog/entry copy, mobile fit,
  new credit/link and lazy module, native 30-second audio decoding/playback,
  BGM ON/OFF, 1x playback after three seals, pause/resume and result silence.
  No browser exceptions or failed resources. Evidence:
  `output/playwright/hand-spell-music-copy-smoke-report.txt` and
  `hand-spell-updated-entry-390.png`.
