# Camera Motion Lab v0.1: opt-in A/B experiment

Reference: [awesome-opus5-5-videos](https://github.com/yihui-dev/awesome-opus5-5-videos), especially the detailed pixel-wizard animation sequence (charge -> cast -> recover) and the rhythmic motion examples. The reference collection is prompts and demos, not reusable game source. No external effect artwork was copied.

## Goal

Compare **current presentation A** with a **stronger code-rendered motion B** in three already-working hand-driven games, without changing gameplay, camera inference, scoring, sound, or existing input controls.

| Game | A: current | B: additional presentation |
| --- | --- | --- |
| EXP-062 MARU MAGIC | native Phaser summoning | confirmed summon also creates a brief expanding golden sigil and a SUMMON! cue |
| Finger Seal Magic / HAND SPELL | current orbit motion | rune ring + luminous lock glyph on confirmed spell locks |
| TOY DRUM | current rhythm motion | musical pulse + quick beat glyph on judged hits and fever |

## Compare

The experimental layer **only activates when the URL includes `motionLab=B`**. Otherwise the whole site works as before. Keep the parameter **before** the hash:

- MARU MAGIC: `/?motionLab=A#/game/solo-maru-magic` versus `/?motionLab=B#/game/solo-maru-magic`
- HAND SPELL: `/?motionLab=A#/game/solo-hand-spell` versus `/?motionLab=B#/game/solo-hand-spell`
- TOY DRUM: `/?motionLab=A#/game/solo-toy-drum` versus `/?motionLab=B#/game/solo-toy-drum`

Both touch/demo and camera modes use the same confirmed game decisions. B is a DOM presentation layer inside the existing play surface. It does not alter game result payloads, Phaser graphics, exported photos/videos, or the existing Creator Mode recordings.

## Constraints / rollback

- Only three IDs are eligible. All other games ignore `motionLab=B`.
- B shares MotionDirector's already-present render/subscription callbacks: **no extra RAF, MediaPipe, library, download, or AudioContext**.
- At most 3 bursts simultaneously, decorative geometry is pointer-transparent and hidden from accessibility APIs; pause, visibility, reduced-motion and exit cleanup follow the existing director lifecycle.
- MARU native effects remain; its new DOM burst is attached only after a real summon, not during recognition, lost-hand recovery, or reset.
- To roll back, remove the URL parameter or set `motionLab=A`. No persisted preferences, database migration, or gameplay flags.

## Playtest gate (A401OP)

1. Use the same device, lighting, sound level and input source. Perform **five rounds in A and five in B** for each game, alternating A/B between rounds when practical.
2. Record: clarity of success (1–5), delight (1–5), distracting overlays (yes/no), missed or false reactions (count), obvious stutter (yes/no), and comfort (1–5).
3. Check 360×800 and 720×1280 portrait: labels must not obscure retry or essential recognition cues.
4. Test pause/resume, exiting, retry, backgrounding and Android reduced-motion preference.
5. Consider expanding to other games only when B is consistently preferred and **no meaningful performance or recognition regression** is observed.

## QA status

Added Node unit tests for explicit opt-in and event correctness. Physical A401OP camera accuracy, frame pacing, and real player preference still require on-device verification. This PR is intentionally not deployed to the production URL.
