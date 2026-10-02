# EXP-020 GUARDIAN SPIRIT — v0.1

## Purpose

Small body gestures are amplified by a giant guardian behind the player. Test:
the presence of another being, the pleasure of acting through that companion,
and the desire to take a photograph together. This introduces the proposed
VIRTUAL COMPANION INPUT family.

The existing DUO experiment also uses EXP-020. Its files and identity remain;
this experiment is identified by `EXP-020-GUARDIAN-SPIRIT` and `/#guardian`.

## MVP

- One player and one WARDEN: a large, mysterious, approachable armored figure.
- Mirrored front camera fills the stage. WARDEN follows the head and shoulder
  center with a 150 ms smoothing constant; scale derives from shoulder width.
- Layered 2D art with separate helmet, torso, arms, hands, halo and spirit core.
  The initial implementation uses original Canvas vector parts instead of PNG
  parts. No full 3D, complex finger recognition or spatial AR is required.
- Blue-white/mint guardian; black-red silhouette demons. Pose segmentation
  repaints the real player over WARDEN to establish the foreground/background.

## Round and input

1. Camera permission → head/shoulder alignment → stable presence → 3, 2, 1.
2. Brief noise, spirit materialization, eyes open: YOUR GUARDIAN HAS AWAKENED.
3. Thirty active seconds of combat. IMPs appear at the edges and approach.
4. **GUARDIAN PUNCH:** sweep a bent arm rapidly sideways. Same-side giant fist,
   area hit, 85 ms enemy hit stop, shake and expanding shockwave.
5. **SPIRIT SHOT:** extend/thrust one arm. Arm direction guides an assisted
   projectile toward the closest demon. Fingers are not required.
6. **GUARDIAN SHIELD:** spread both arms horizontally. One-second barrier;
   successful defense displays BLOCK! Arms must return before another edge.
7. Defeats charge SPIRIT GAUGE; eight IMPs fill it. DEMON LORD appears at 22
   seconds. Ordinary attacks cannot defeat it; IMPs continue spawning so an
   incomplete gauge can still be filled.
8. **GUARDIAN ASCENSION:** full gauge + boss present + both hands raised.
   Guardian enlarges, charges a beam, flashes and eliminates all enemies.
9. Victory preserves the camera and guardian. VICTORY PHOTO counts down from
   three and captures a local PNG. A time-out offers retry and photo mode.
10. PHOTO MODE: A crossed arms, B pointing together, C large hand above the
    player's head, D peace. POSE switches the rig, SHOT takes a new photo.
    Photo UI can be hidden. The latest image can be downloaded.

Player loss freezes all round progression, enemies and shield duration. COME
BACK appears; continuous reacquisition for three seconds is required to resume.
Manual pause and background-tab suspension also freeze the round.

## Score and recording

IMP: +100, combo multiplier increases every three consecutive kills, capped at
4×. Block: +200. Hit: −100, floor zero, resets current combo. Result records
DEMONS, maximum COMBO, BLOCK and SCORE.

Synthesized local audio covers summoning, heavy punches, shots, crystal shield,
charging, victory and camera shutter. Sound can be disabled. Reduced-motion
preference removes shake, noise, bobbing and animated ambient particles.

Camera processing and photo composition are on-device. MediaPipe model/WASM
downloads require a network connection; photos and frames are not uploaded.
The latest photo is held as a session blob, not written to browser storage.
The latest 50 round receipts are stored locally, tagged camera/demo. JSON export
includes photo counts and active PHOTO MODE duration, with no inferred human
verdict.

## Human verification

At least five people or five real camera rounds. Ask whether WARDEN feels
behind them, whether amplification feels good, whether gestures are legible,
whether they want to move it more, and whether they want a photo. Voluntary
photo time longer than combat is a strong positive signal.

Success: two of three basic actions understood without explanation, natural
following, complete 30-second play, voluntary PHOTO MODE use, and at least one
request for another guardian. Demo and synthetic tests cannot establish this.

## Excluded from v0.1

Full 3D, intricate finger recognition, online features, guardian growth,
multiple guardians, long stages and precise spatial AR. Future options:
Guardian Collection, Bond, Selfie, Boss Hunt and two-player companion combat.
