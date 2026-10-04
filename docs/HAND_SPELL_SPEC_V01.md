# EXP-056 HAND SPELL — implemented MVP

Open `#/game/solo-hand-spell` or `#hand-spell`. Portrait, one player.
PLAY and CREATOR both run one 15-second battle after the optional tutorial.
Choose DRAGON FLAME, THUNDER GOD or ABSOLUTE ZERO on entry.

## Input

- FIST: four curled fingers. PALM: four extended fingers; thumb is tolerant.
- ONE: index only. TWO: index and middle. THREE accepts index/middle/ring,
  or the illustrated thumb/index/pinky sign. The help sheet explains both.
- Local MediaPipe Hand Landmarker processes two hands; Face Detector locates
  the optional EFFECT mask. One front-camera video stream, no microphone.
- Joint straightness and wrist-to-tip distance ratios classify signs without
  a fixed image-axis direction. Finite 21-point observations and valid size are
  required. Cropped centers are excluded from input.
- A sign holds for 180ms before a visible lock, positive label and sound.
  400ms cooldown; a held pose cannot repeat. Repeating a sign needs a visible
  relaxed/unknown pose for 120ms, then another stable hold.
- Recognition uses only fresh observations (200ms maximum age). A new hand ID
  resets its candidate hold. After pause/recovery, the current held sign is
  blocked until the player changes or relaxes it.
- Release requires two distinct PALMs, a 120ms baseline, both palm spans growing
  at least 16%, then a 100ms stable expanded hold. Opening two palms is not
  recorded as another seal. A deliberate fourth single PALM needs a longer
  preparatory wait. RELEASE can also be tapped as an accessible fallback;
  the result records gesture/tap/keyboard provenance.
- 650ms of missing/cropped hands during tutorial, input or release pauses time.
  350ms of stable in-frame recovery resumes. Unknown signs give angle/hold
  coaching instead of silently scoring. Lack of recognition does not invent a sign.

## Battle timeline

0–2s: enemy enters and charges. 2–3.5s: three signs visible. 3.5–4s: blank
recall beat. 4–8s: player's input; three locks display RELEASE. A deliberate
release can be latched before 8s. 8–9s: final release opportunity.
9–9.85s: identical anticipation for every outcome.
9.85–12s: spell reveal. 12–15s: enemy and player reaction.
Early release locks the entered sequence and waits for the scheduled reveal.

DRAGON FLAME = ONE/TWO/THREE, THUNDER GOD = FIST/ONE/PALM,
ABSOLUTE ZERO = TWO/PALM/FIST. Targets are compared exactly and in order.

Misfire precedence: no release → SAD SMOKE; more than three → GIANT HAND;
fewer than three → POTATO; exact target → PERFECT; identical repeated signs
→ CHICK SWARM; reversed order → SELF BLAST; exactly one different sign
→ TINY FIRE; other combinations → FISH STORM.
This follows the specification's classification table where the illustrative
one-wrong chick example differs from that table.

## First use and collection

COPY THIS: TWO, then ONE/TWO, then ONE/TWO/THREE and a real release into a
dragon. First two steps create small rune magic. Tutorial time is excluded
from the challenge. A skip control is available; completion persists separately
for camera and practice. Practice uses 1–5/buttons for signs and R/RELEASE.

SPELL BOOK stores only valid discovered spell IDs, including all seven
misfires. Duplicate/corrupt data are sanitized. Denied storage leaves the
session playable. Practice stays visibly labelled in play, results, replay
and challenge text. No fabricated high-score ranking.

## CREATOR, privacy and lifecycle

PLAY keeps no video frames. CREATOR samples the actual composed canvas at
12fps into 135×240 frames, capped at 182 (under 24MB raw raster memory).
Seven-second replay: memory cue 2s, actual input compressed to 2s, release/
anticipation 1s, cast/reaction compressed to 2s. Includes CAN YOU CAST THIS,
the signs, player composition and actual outcome. This replay is intentionally
an edited recap rather than a continuous seven-second cut.

ORIGINAL retains the camera. EFFECT masks the detected face; when no face is
detected, it hides the video. HIDE excludes all camera imagery. No uploads,
microphone or automatic saving. Optional local MediaRecorder export is silent.
Exit/retry/page hide release camera tracks, models, audio, GSAP, RAF/listeners
and replay memory. Background and manual pause freeze the challenge.
JA/EN, BGM and SE toggles and live reduced-motion preferences are supported.

Assets, exact Imagegen prompts, audio license URLs and hashes:
[manifest](hand-spell-assets.json), [prompts](hand-spell-image-prompts.txt).
