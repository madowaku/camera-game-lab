# Camera Motion Lab v0.2: seven-game A/B presentation

Reference: [awesome-opus5-5-videos](https://github.com/yihui-dev/awesome-opus5-5-videos), especially the detailed pixel-wizard animation sequence (charge -> cast -> recover) and the rhythmic motion examples. The reference collection is prompts and demos, not reusable game source. No external effect artwork was copied.

## Goal

Compare **current presentation A** with a **stronger code-rendered motion B** in seven already-working games, without changing gameplay, camera inference, scoring, sound, or existing input controls. Expanded from the three-game PR #10 pilot on 2026-10-09 following the user's preference for the enhanced presentation.

| Game | A: current | B: additional presentation |
| --- | --- | --- |
| EXP-062 MARU MAGIC | native Phaser summoning | confirmed summon also creates a brief expanding golden sigil and a SUMMON! cue |
| Finger Seal Magic / HAND SPELL | current orbit motion | rune ring + luminous lock glyph on confirmed spell locks |
| TOY DRUM | current rhythm motion | musical pulse + quick beat glyph on judged hits and fever |
| AIR SLASH | current slash motion | two short luminous cuts at sliced fruit; wider crossing for combos and X-SLASH |
| TILT TURBO | current speed motion | outward speed lines on confirmed near misses, drift and jump cues; no extra effect for BONK |
| NOTE BLASTER | current rhythm motion | musical pulse at the destroyed target; shots and breaches alone do not trigger success |
| PALM PONG | current orbit motion | hollow ripples at the confirmed paddle contact; the ball and native rally text stay visible |

## Compare

The experimental layer **only activates when the URL includes `motionLab=B`**. Otherwise the whole site works as before. Keep the parameter **before** the hash:

- MARU MAGIC: `/?motionLab=A#/game/solo-maru-magic` versus `/?motionLab=B#/game/solo-maru-magic`
- HAND SPELL: `/?motionLab=A#/game/solo-hand-spell` versus `/?motionLab=B#/game/solo-hand-spell`
- TOY DRUM: `/?motionLab=A#/game/solo-toy-drum` versus `/?motionLab=B#/game/solo-toy-drum`
- AIR SLASH: `/?motionLab=A#/game/solo-air-slash` versus `/?motionLab=B#/game/solo-air-slash`
- TILT TURBO: `/?motionLab=A#/game/solo-tilt-turbo` versus `/?motionLab=B#/game/solo-tilt-turbo`
- NOTE BLASTER: `/?motionLab=A#/game/voice-note-blaster` versus `/?motionLab=B#/game/voice-note-blaster`
- PALM PONG: `/?motionLab=A#/game/duo-palm-pong` versus `/?motionLab=B#/game/duo-palm-pong`

Camera-free checks: X for AIR SLASH, left/right arrows for TILT TURBO, hold keys 1–5 to match NOTE BLASTER's target lane, and start PALM PONG with its two centered practice paddles. PALM PONG camera play remains landscape.

Both touch/demo and camera modes use the same confirmed game decisions. B is a DOM presentation layer inside the existing play surface. It does not alter game result payloads, Phaser graphics, exported photos/videos, or the existing Creator Mode recordings.

## Constraints / rollback

- Only the seven listed IDs are eligible. All other games ignore `motionLab=B`.
- B shares MotionDirector's already-present render/subscription callbacks: **no extra RAF, MediaPipe, library, download, or AudioContext**.
- At most 3 bursts simultaneously, decorative geometry is pointer-transparent and hidden from accessibility APIs; pause, visibility, reduced-motion and exit cleanup follow the existing director lifecycle.
- MARU native effects remain; its new DOM burst is attached only after a real summon, not during recognition, lost-hand recovery, or reset.
- The new motifs animate transform/opacity using bounded CSS geometry, without full-screen flashes, blur filters or continuous particles. Enhanced burst lifetime now allows the existing sigil's longer animation to finish.
- PALM PONG B reads the core's confirmed contact in its 16 × 9 world; NOTE BLASTER B reads the existing hit effect location. A retains its prior positions and presentation.
- To roll back, remove the URL parameter or set `motionLab=A`. No persisted preferences, database migration, or gameplay flags.

## Playtest gate (A401OP)

1. Use the same device, lighting, sound level and input source. Perform **five rounds in A and five in B** for each game, alternating A/B between rounds when practical.
2. Record: clarity of success (1–5), delight (1–5), distracting overlays (yes/no), missed or false reactions (count), obvious stutter (yes/no), and comfort (1–5).
3. Check 360×800 and 720×1280 portrait: labels must not obscure retry or essential recognition cues.
4. Test pause/resume, exiting, retry, backgrounding and Android reduced-motion preference.
5. Before making B the default or releasing it to production, verify that it is consistently preferred and **no meaningful performance or recognition regression** is observed. The expanded opt-in set does not imply that these physical checks have passed.

## QA status

Node tests cover explicit opt-in, MARU lifecycle, and actual game-core collisions/near misses for the new motifs. `scripts/qa/camera-motion-lab.js` uses native practice controls to verify A/B presentation at 390×844 and 1440×900, event positions, single native captions, sensor-free practice, pause/resume, retry, route cleanup and live reduced motion. Screenshots go to `output/playwright/motion-lab-*.png`.

Verified 2026-10-09: full Node suite 659/659; focused motion tests 13/13 after the contact-position adjustment; browser QA 86 checks including the original three pilots and real CSS lifetime cleanup; production preview smoke 17 checks across all four new motifs. Build passed. Browser errors and failed resources: zero in the development QA; production exceptions: zero. Existing large-chunk build warnings remain.

Physical A401OP camera accuracy, frame pacing, and comfort still require on-device verification. The DOM effects are not included in CREATOR exports. This PR is intentionally not deployed to the production URL.
