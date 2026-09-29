# EXP-003 EAT / DON'T EAT — SPEC v0.1

Status: Ready for implementation  
Target: Mobile Web / PWA  
Primary device: Android Chrome  
Target play time: 20–25 seconds  
Purpose: Face / mouth input technical prototype

## 1. One-line concept

Objects fly toward the player's mouth. Open your mouth to eat FOOD. Keep it closed for DON'T EAT objects.

The physical verb and the game verb must match:

> Open mouth = EAT

The prototype succeeds only if that correspondence feels immediate, funny, readable, and fair.

---

## 2. Research hypothesis

A binary mouth-open input can support a short-form reaction game because:

- the gesture is visually obvious to the player and spectators;
- it requires no explanation once the rule is seen;
- the player's face becomes part of the game presentation;
- opening the mouth is more expressive than pressing a button.

This experiment is not testing content depth. It is testing whether mouth input itself is worth building on.

---

## 3. Core loop

1. Detect one face.
2. Wait until the mouth is closed and stable.
3. Start a 3–2–1 countdown.
4. Spawn one object at a time.
5. The object travels toward the player's mouth area.
6. If the object is FOOD, the player must open their mouth during the decision window.
7. If the object is DON'T EAT, the player must keep their mouth closed during the decision window.
8. Give immediate feedback.
9. Continue for 14 objects.
10. Show result and allow instant replay.

Target round length: about 22 seconds.

---

## 4. v0.1 content

Use two categories only.

### FOOD

Prototype visuals may use emoji or simple local SVG/CSS assets.

Examples:

- apple
- strawberry
- grape
- bread
- donut

### DON'T EAT

Examples:

- sock
- battery
- rock
- soap
- key

Do not add rule exceptions in v0.1.

The rule must remain:

> FOOD = open mouth  
> NOT FOOD = keep mouth closed

Use a deterministic 14-item sequence for the first implementation so playtests are comparable.

Recommended composition:

- 7 FOOD
- 7 DON'T EAT
- no more than 3 of the same category in a row

---

## 5. Input contract

EXP-003 should not depend directly on MediaPipe-specific category names inside game logic.

Add or extend the shared body-input layer so the game can consume normalized face state.

Minimum normalized state/events:

- `FACE_PRESENT`
- `FACE_LOST`
- `MOUTH_OPEN`
- `MOUTH_CLOSE`
- `mouthOpenScore: 0..1`
- `mouthPosition: { x, y }` when available

Recommended implementation source:

- MediaPipe Face Landmarker
- video mode
- one face
- face blendshapes enabled
- use `jawOpen` as the primary mouth-open signal

### Suggested thresholds

These are initial tuning values, not sacred constants.

- open candidate: `jawOpen >= 0.58`
- close candidate: `jawOpen <= 0.38`
- values between thresholds keep the previous stable state
- require 2–3 consecutive frames before changing stable state

Use hysteresis so the state does not flicker near one threshold.

Expose the thresholds as constants for quick device tuning.

### Edge-trigger rule

Eating must be triggered by a transition:

`MOUTH_CLOSE -> MOUTH_OPEN`

Holding the mouth open must not automatically eat several consecutive objects.

After a successful or failed EAT attempt, require a stable `MOUTH_CLOSE` before the next EAT edge can be armed.

---

## 6. Face-loss behavior

Loss of face tracking must NEVER be interpreted as eyes/mouth closed or as a valid answer.

If the face is missing for more than about 400–500 ms:

- pause object progression;
- pause the round timer;
- show a simple "Face the camera" guide;
- resume only after the face is stable again.

Do not consume an item while tracking is lost.

---

## 7. Mouth target position

When reliable mouth landmarks are available, derive a screen-space mouth center and mirror the X coordinate to match the selfie preview.

The flying object should visually converge toward that point.

If mouth-position tracking is noisy, fall back to a fixed lower-center target for v0.1 rather than delaying the experiment.

The input decision is mouth state, not collision accuracy.

---

## 8. Item timing

Recommended first values:

- item approach duration: 1.15–1.35 s
- decision window: final ~500 ms before contact
- feedback pause: 200–300 ms
- next item starts immediately after feedback

For FOOD:

- a fresh `MOUTH_OPEN` edge inside the decision window = correct
- no fresh open edge by contact = miss

For DON'T EAT:

- remaining stably closed through the decision window = correct
- a fresh open edge in the decision window = wrong eat

Opening too early should not buffer an answer.

The player should learn to "bite" at the object, not hold their mouth open.

---

## 9. Scoring

Keep scoring transparent.

- correct: +100
- wrong/miss: +0
- combo: count consecutive correct answers
- result: score, correct count, accuracy, best combo

No multipliers or upgrades in v0.1.

---

## 10. Visual presentation

The player's mirrored camera feed remains the primary background.

Required HUD:

- EXP-003 / EAT DON'T EAT
- current score
- combo
- remaining item count or progress bar
- large item approaching the mouth
- immediate feedback: EAT!, GOOD!, NO!, MISS!
- visible current detector state during debug mode only

The object should feel as though it is entering the player's real mouth.

Use scale-up and movement toward `mouthPosition`; on a successful eat, shrink/pop the item into the mouth point.

For a wrong eat, bounce or burst it away.

Do not spend time on illustration polish before the input loop is proven.

---

## 11. Audio

Reuse the project's existing audio/BGM infrastructure if practical.

Minimum:

- light approach cue or beat
- bite/pop sound for correct FOOD
- error sound for wrong decision

No additional licensed music is required for v0.1.

If existing OpenTracks music is reused, preserve the existing credit/license pattern.

---

## 12. State machine

Suggested game states:

- `IDLE`
- `WAIT_FOR_FACE`
- `WAIT_FOR_MOUTH_CLOSE`
- `COUNTDOWN`
- `ITEM_APPROACH`
- `ITEM_FEEDBACK`
- `PAUSED_FACE_LOST`
- `RESULT`

Game state should not be embedded in detector code.

---

## 13. Suggested files

Names may follow the current repository conventions.

Likely additions:

- `src/input/faceInput.js`
- `src/games/eatDontEat.js`

Likely shared changes:

- `src/input/bodyInput.js`
- `src/main.js`
- `src/i18n.js`
- `src/style.css`

Do not create a second camera stream if the shared body-input layer already owns the camera.

Prefer one video source shared by hand and face experiments.

---

## 14. Japanese / English copy

Minimum strings should exist in both languages.

English:

- EAT / DON'T EAT
- OPEN YOUR MOUTH TO EAT
- KEEP IT CLOSED
- FACE THE CAMERA
- CLOSE YOUR MOUTH TO READY
- CORRECT
- NO!
- MISS
- PLAY AGAIN

Japanese:

- 食べる / 食べない
- 口を開けて食べる
- 食べないときは口を閉じる
- カメラに顔を映してください
- 口を閉じると準備OK
- 正解
- ダメ！
- ミス
- もう一度

---

## 15. Debug overlay

Add a developer-only or easily removable debug overlay showing:

- face present yes/no
- raw `jawOpen`
- stable mouth state
- mouth X/Y
- FPS or inference interval if already available

This is important for real-device tuning.

The public game UI should not depend on the debug overlay.

---

## 16. Acceptance criteria

Technical pass:

- Face Landmarker runs on the deployed HTTPS build.
- 10 deliberate open/close cycles detect at least 9 correctly in normal indoor light.
- Neutral closed mouth for 10 seconds produces no more than 1 false open.
- Holding the mouth open does not consume multiple FOOD objects.
- Face loss pauses rather than scoring an answer.
- A full round completes without a page reload.

Game-feel pass:

- A new player understands the rule after seeing at most two items.
- Opening the mouth at the right moment feels more satisfying than tapping would.
- The player's behavior is readable in a vertical screen recording.
- The round creates at least one spontaneous "oops, I ate that" moment.

If the last two are false, do not add content. Revisit the interaction.

---

## 17. Playtest notes to record

For at least 5 full runs, note:

- false mouth opens
- missed deliberate opens
- detector delay
- easiest viewing distance
- whether players hold their mouth open to cheat
- whether they watch the item or their own camera image
- whether watching someone else play is funny/readable
- fatigue or discomfort

---

## 18. Explicitly out of scope for v0.1

Do not add:

- multiple rule sets
- nutrition/health claims
- progression
- shops
- ads
- online ranking
- camera recording/upload
- AR face masks
- chewing recognition
- tongue recognition
- multiplayer
- complex object physics

Prove the binary verb first.

---

## 19. Exit decision

After real-device testing choose one:

### PASS
Mouth input is accurate and intrinsically fun. Continue to v0.2 with rule twists.

### PASS AS MICROGAME
Funny for 15–30 seconds but shallow. Keep it as a Camera Arcade microgame.

### FAIL
Recognition or physical awkwardness overwhelms the joke. Preserve `faceInput` for EXP-004 and stop content work.

---

## 20. Codex implementation directive

Implement EXP-003 EAT / DON'T EAT from this specification as the smallest playable mobile-web experiment.

Priorities:

1. reliable normalized face/mouth input;
2. fair edge-triggered EAT detection;
3. 14-item / ~22-second complete loop;
4. Japanese and English;
5. deployed-build compatibility with the existing Cloudflare Workers Static Assets setup.

Reuse the existing body-input, i18n, audio, PWA, and camera infrastructure. Do not add unrelated features or large refactors. Keep detector thresholds easy to tune after smartphone testing.
