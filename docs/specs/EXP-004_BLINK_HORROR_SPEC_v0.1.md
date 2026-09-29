# EXP-004 BLINK HORROR — SPEC v0.1

Status: Ready for implementation  
Target: Mobile Web / PWA  
Primary device: Android Chrome  
Target play time: 20–30 seconds  
Purpose: Eyes-open / eyes-closed horror interaction prototype

## 1. One-line concept

Keep your eyes open to make progress, but the thing in the dark approaches while it can see you. Close your eyes to hide and recover distance, but you lose the screen and stop progressing.

The physical cost is real:

> Close eyes = lose visual information.

---

## 2. Research hypothesis

Eyes-open / eyes-closed input can create genuine tension because the player must physically give up visual information to perform the defensive action.

This experiment tests whether the rule creates a stronger feeling than a normal "hold to hide" button.

It is not testing a full horror story.

---

## 3. Core loop

1. Detect one face and both eyes.
2. Calibrate briefly while the player looks normally at the screen.
3. Start the round.
4. While eyes are OPEN:
   - escape/progress meter fills;
   - the player can see the camera scene and monster;
   - danger also increases.
5. While eyes are CLOSED:
   - progress pauses;
   - danger decreases / the monster retreats;
   - visuals fade to near-black;
   - proximity information is communicated only by sound.
6. Random short monster "rush" periods make staying open continuously unsafe.
7. Reach 100% escape progress before danger reaches 100%.
8. Show result and replay.

The interesting decision must become:

> Can I keep looking a little longer, or should I close my eyes now?

---

## 4. Round model

Use normalized values.

### Escape progress

Range: `0.0 .. 1.0`

Suggested start values:

- eyes open: +0.075 per second
- eyes closed: +0

This requires roughly 13.3 seconds of total open-eye time to win.

### Danger

Range: `0.0 .. 1.0`

Suggested start values:

Normal phase:

- eyes open: +0.085 per second
- eyes closed: -0.060 per second

Rush phase:

- eyes open: +0.16 per second
- eyes closed: -0.040 per second

Clamp danger to 0..1.

Lose at danger >= 1.0.

These are tuning values. The first smartphone playtest should decide the final rates.

---

## 5. Rush behavior

The monster must not advance at a perfectly predictable rate.

Use deterministic pseudo-random rush windows for comparable playtests.

Suggested:

- 2–3 rushes per round
- rush length: 1.2–1.8 seconds
- first rush cannot occur during the first 3 seconds
- audio cue starts slightly before or at rush start

The player should hear that danger changed even if their eyes are closed.

Do not make the cue fully explicit. It should create uncertainty, not become a rhythm prompt.

---

## 6. Input contract

Game logic must consume normalized eye state, not raw MediaPipe blendshape names.

Minimum shared state/events:

- `FACE_PRESENT`
- `FACE_LOST`
- `EYES_OPEN`
- `EYES_CLOSED`
- `BLINK_BOTH`
- `blinkLeftScore: 0..1`
- `blinkRightScore: 0..1`

Recommended implementation:

- MediaPipe Face Landmarker
- face blendshapes enabled
- use `eyeBlinkLeft` and `eyeBlinkRight`

### Suggested thresholds

Initial values:

- closed candidate: both blink scores >= 0.62
- open candidate: both blink scores <= 0.35
- hysteresis between thresholds
- 2–3 frame stability before changing held eye state

A brief natural blink can emit `BLINK_BOTH`, but the held state should avoid excessive flicker.

Recommended held-closed qualification:

- both eyes above closed threshold for approximately 100–140 ms

Tune on-device.

---

## 7. Critical fairness rule

`FACE_LOST` must NEVER count as `EYES_CLOSED`.

If tracking disappears:

- pause progress;
- pause danger;
- pause random rush timing;
- show "Face the camera";
- resume only after stable face tracking returns.

Covering the camera must not become a valid hide strategy.

---

## 8. Calibration

At round start:

1. require face present;
2. ask the player to look normally at the screen for ~1 second;
3. collect baseline blink values if useful;
4. do not require a separate explicit calibration UI unless device testing proves necessary.

Prefer fixed thresholds plus hysteresis for v0.1.

Add per-device calibration only if real-world testing shows fixed values are unreliable.

---

## 9. Horror presentation

Use the mirrored selfie camera as the scene rather than hiding it.

The prototype fantasy:

> There is something behind you in the camera.

Required visual layers:

- mirrored camera feed
- dark vignette
- subtle grain / shadow treatment
- monster/silhouette positioned behind or beside the player's face
- monster scale/opacity increases with danger
- escape progress
- minimal danger indicator

Do not turn the danger meter into a precise numeric gauge if it kills tension.

A rough visual indicator is enough.

When eyes are closed, animate the app scene toward near-black. The player cannot see it physically, but this reinforces the state in recordings and accessibility testing.

---

## 10. Audio

Audio is essential because the player deliberately loses vision.

Minimum dynamic audio:

- low ambience
- footsteps / scrape intensity based on danger
- heartbeat near high danger
- rush cue
- lose sting
- win release cue

Do not use extreme volume jumps or painful high-frequency jump scares.

If an existing licensed OpenTracks asset fits, reuse the existing licensing pattern. Otherwise use generated/simple local sound effects for v0.1.

---

## 11. State machine

Suggested states:

- `IDLE`
- `WAIT_FOR_FACE`
- `CALIBRATE`
- `COUNTDOWN`
- `PLAY_OPEN`
- `PLAY_CLOSED`
- `PAUSED_FACE_LOST`
- `WIN`
- `LOSE`

Eye state and game state should remain separate concepts.

---

## 12. Scoring

No complex score is needed.

Primary result:

- ESCAPED / CAUGHT
- completion time
- number of intentional close-eye hides
- closest danger reached

Optional fun stat:

- number of natural blinks detected

Do not reward players for avoiding natural blinking.

---

## 13. Japanese / English copy

English:

- BLINK HORROR
- LOOK TO ESCAPE
- CLOSE YOUR EYES TO HIDE
- FACE THE CAMERA
- DON'T LET IT REACH YOU
- ESCAPED
- CAUGHT
- PLAY AGAIN

Japanese:

- BLINK HORROR
- 見続けると脱出へ進む
- 目を閉じると隠れられる
- カメラに顔を映してください
- 近づかせるな
- 脱出
- 捕まった
- もう一度

Keep text short during play.

---

## 14. Debug overlay

Developer/debug mode should show:

- face present
- left blink raw score
- right blink raw score
- stable eye state
- danger value
- escape value
- rush active yes/no
- inference FPS if available

This overlay is for tuning only.

---

## 15. Acceptance criteria

Technical pass:

- face/eye detection works on deployed HTTPS mobile build;
- 10 deliberate close/open actions detect at least 9 correctly;
- normal open eyes do not flicker into held-closed state repeatedly;
- face loss pauses instead of hiding;
- round can be completed and failed without reload;
- audio remains synchronized while the eye state changes.

Game-feel pass:

- the player voluntarily closes their eyes at least once for strategic reasons;
- reopening the eyes creates a meaningful "where is it now?" moment;
- the player hesitates before deciding to keep looking;
- a vertical recording clearly communicates the unusual interaction.

The core pass condition is not "scary art." It is the moment where the player dislikes giving up visual information but chooses to do it anyway.

---

## 16. Playtest notes to record

For at least 5 full runs:

- false eye-closed detections
- missed deliberate closes
- natural blink behavior
- average open/closed rhythm
- whether players understand danger without numeric explanation
- whether audio remains useful while eyes are closed
- whether the rule feels tense or merely inconvenient
- eye fatigue / discomfort
- any tendency to cover the camera instead of closing eyes

Stop the session if the player reports eye strain or discomfort.

---

## 17. Explicitly out of scope for v0.1

Do not add:

- walking controls
- branching rooms
- narrative
- inventory
- weapons
- jump-scare chains
- gaze tracking
- individual left/right eye mechanics
- multiplayer
- recording/upload
- procedural monsters
- long rounds

Prove the open/closed trade-off first.

---

## 18. Future branches if PASS

Possible v0.2 directions:

- monster only visible from certain eye states
- left/right wink changes world layer
- audio-only movement while eyes are closed
- "look at it to freeze it" enemy
- multiple monsters with different eye rules
- memory/puzzle horror using information seen before closing

Do not implement these in v0.1.

---

## 19. Suggested files

Likely additions:

- `src/input/faceInput.js` if EXP-003 has not already created it
- `src/games/blinkHorror.js`

Likely shared changes:

- `src/input/bodyInput.js`
- `src/main.js`
- `src/i18n.js`
- `src/style.css`
- existing audio module if appropriate

EXP-003 and EXP-004 should share one Face Landmarker implementation.

Do not instantiate duplicate face models for separate games.

---

## 20. Exit decision

### PASS
The physical loss of vision creates real tension. Continue exploring camera-native horror.

### PASS AS MICROGAME
The mechanic is memorable for 20 seconds but does not sustain longer play. Keep it in Camera Arcade.

### FAIL
Players experience only annoyance, eye strain, or unreliable detection. Preserve face input for other prototypes and stop horror expansion.

---

## 21. Codex implementation directive

Implement EXP-004 BLINK HORROR from this specification as a 20–30 second camera-native horror experiment.

Reuse the shared Face Landmarker from EXP-003 if present. Add normalized eyes-open / eyes-closed state to the body-input layer rather than putting MediaPipe blendshape logic in the game.

Prioritize:

1. fair eye-state recognition and face-loss behavior;
2. open-to-progress / closed-to-hide risk loop;
3. sound that remains informative while the player cannot see;
4. minimal but readable monster presentation on the selfie feed;
5. Japanese and English;
6. deployed mobile-web compatibility.

Do not build story, levels, inventory, or additional horror systems until the physical eye-state loop passes real-device testing.
