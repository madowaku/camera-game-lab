# EXP-005 PINCH WORLD — SPEC v0.1

Status: Ready for implementation  
Target: Mobile Web / PWA  
Primary device: Android Chrome  
Target play time: 20–30 seconds  
Purpose: Pinch / drag / release direct-manipulation prototype

## 1. One-line concept

Use your real thumb and index finger as a pair of virtual tweezers. Physically pinch a tiny object, carry it through the world, and release it into a socket.

The central question is:

> Does it feel like I am touching the game world, rather than moving a cursor?

---

## 2. Research hypothesis

Pinch input becomes interesting when both fingers matter spatially.

The prototype should NOT reduce the interaction to:

- point at object;
- detector says PINCH;
- object follows an invisible mouse cursor.

Instead, show the thumb and index fingertip as the two jaws of a virtual tweezer.

The object should be grabbed at their midpoint only when the fingers physically close around it.

---

## 3. v0.1 structure

Use three tiny sequential tasks in one round.

### Task 1 — PICK

- one circular object
- one large matching socket
- no obstacle
- teach grab, carry, release

### Task 2 — CARRY

- one square object
- matching socket on the other side
- one large barrier with a generous gap
- the held object collides with the barrier
- the hand/tweezer may move through the screen space, but the game object must obey the world boundary

Purpose: make the grabbed object feel like a world object, not a cursor.

### Task 3 — PLACE

- one triangular object
- smaller matching socket
- no time-pressure spike
- test precision and release confidence

Complete all three to finish.

Target total round length: 20–30 seconds.

---

## 4. Input contract

Extend the normalized body-input layer.

Minimum state/events:

- `HAND_PRESENT`
- `HAND_LOST`
- `PINCH_START`
- `PINCH_MOVE`
- `PINCH_END`
- `pinchAmount: 0..1`
- `pinchPosition: { x, y }`
- `thumbTip: { x, y }`
- `indexTip: { x, y }`

Game logic should not read raw MediaPipe landmark indices directly.

The input layer owns that translation.

---

## 5. Pinch geometry

Use hand landmarks:

- thumb tip
- index fingertip
- wrist
- middle-finger MCP or another stable hand-scale reference

Calculate:

- fingertip distance
- hand scale
- normalized pinch ratio = fingertip distance / hand scale
- pinch midpoint = average of thumb tip and index tip

Mirror X coordinates to match the selfie camera.

### Suggested hysteresis

Initial values:

- enter pinch: ratio <= 0.30
- leave pinch: ratio >= 0.42
- between values: keep previous state
- 2–3 stable frames before emitting edge event

These are tuning values.

Do not assume the existing HAND BEAT PINCH threshold is ideal for direct manipulation. Tune separately if needed, but keep shared math in the body-input layer.

---

## 6. Virtual tweezer visualization

Render:

- thumb-tip marker
- index-tip marker
- subtle line or jaw indicators between them
- pinch midpoint indicator in debug mode
- grasp highlight when an object is eligible

The gameplay cursor is the actual two-finger geometry.

Do not render a conventional mouse pointer.

When the fingers close, the visual jaws should visibly compress around the object.

---

## 7. Grab rule

An object can be grabbed only on a fresh `PINCH_START`.

Conditions:

1. hand is present;
2. no object is already held;
3. pinch midpoint is within the object's grab radius;
4. object is currently grabbable.

Recommended grab radius:

- object visual radius × 1.25–1.4

Choose forgiving values for the first playtest.

A held pinch that moves over an object later should NOT auto-grab it. Require release and a new pinch.

This prevents accidental "vacuum cursor" behavior.

---

## 8. Hold behavior

While grabbed:

- object follows `pinchPosition`;
- use light smoothing / spring interpolation to reduce landmark jitter;
- preserve a small tactile-feeling lag rather than hard teleporting if it feels better;
- keep object visually attached to the tweezer jaws.

Suggested first smoothing:

- exponential interpolation or spring equivalent around 12–20 Hz response

Do not introduce heavy physics instability in v0.1.

---

## 9. Release behavior

On `PINCH_END`:

- release immediately;
- object settles at current legal position;
- if inside its matching socket with sufficient overlap, snap gently into place;
- otherwise remain where released or fall according to simple stage rules.

Do not add throw velocity in v0.1.

If hand tracking is lost while holding an object:

- wait a short grace period, about 250–350 ms;
- if tracking returns, continue hold;
- otherwise release gently with zero throw velocity.

Tracking loss must not catapult the object.

---

## 10. World collision

Task 2 requires one simple collision demonstration.

The hand itself does not collide with the wall.

The grabbed object does.

If the player's pinch position crosses the barrier:

- the object should stop at the barrier boundary or slide along it;
- the tweezer visualization can continue beyond it;
- when the hand returns to a legal position, the object follows again.

This mismatch is intentional.

It communicates:

> Your hand is outside the world. The thing you are holding is inside it.

That is the main conceptual test of PINCH WORLD.

---

## 11. Socket rules

Use both shape and visual pattern, not color alone.

Suggested:

- circle object -> circle socket
- square -> square socket
- triangle -> triangle socket

A socket accepts only its matching object.

On successful placement:

- soft snap animation
- pleasant sound
- tiny scale pulse
- immediately advance to next task

No inventory or menus between tasks.

---

## 12. Camera presentation

Use the mirrored selfie feed as the background.

Place the tiny world/game layer over the player's camera view.

The desired visual impression is:

> A giant real hand is reaching into a tiny digital world.

Keep the game objects large enough for a phone screen.

Do not shrink them merely to look cute if it harms grab reliability.

---

## 13. State machine

Suggested states:

- `IDLE`
- `WAIT_FOR_HAND`
- `COUNTDOWN`
- `TASK_1_PICK`
- `TASK_2_CARRY`
- `TASK_3_PLACE`
- `PAUSED_HAND_LOST`
- `RESULT`

The detector owns pinch state. The game owns grabbed-object state.

---

## 14. Score / result

Do not over-score a manipulation test.

Result screen:

- CLEAR
- total time
- successful grabs
- failed pinch attempts
- accidental releases

Optional:

- "clean run" when each object is placed with one successful grab

No leaderboards in v0.1.

---

## 15. Japanese / English copy

English:

- PINCH WORLD
- PINCH TO PICK UP
- CARRY IT TO THE SOCKET
- RELEASE TO DROP
- MOVE THROUGH THE GAP
- SHOW YOUR HAND
- CLEAR
- PLAY AGAIN

Japanese:

- PINCH WORLD
- 指でつまんで持ち上げる
- ソケットまで運ぶ
- 指を開いて離す
- すき間を通そう
- 手をカメラに映してください
- クリア
- もう一度

During play, prefer icon/animation instruction over long text.

---

## 16. Debug overlay

Developer/debug mode should show:

- hand present
- raw pinch ratio
- stable pinch state
- pinch midpoint X/Y
- thumb-tip X/Y
- index-tip X/Y
- grabbed object ID
- tracking FPS if available

Add a visible grab radius in debug mode.

This will make smartphone tuning dramatically faster.

---

## 17. Acceptance criteria

Technical pass:

- fresh pinch edge is reliably detected;
- 10 deliberate pinch/release cycles produce at least 9 correct pairs;
- holding a pinch does not generate repeated `PINCH_START`;
- object remains attached through ordinary hand jitter;
- release latency feels immediate;
- tracking loss does not throw the object;
- mirrored coordinates match what the player sees;
- all three tasks can be completed on deployed mobile HTTPS build.

Game-feel pass:

- the player naturally pinches the visible object instead of thinking about a cursor;
- Task 2 makes the player understand that the held object obeys world geometry;
- moving an object with real fingers feels satisfying even without points;
- a spectator can infer "they are pinching that thing" from a vertical recording.

If it only feels like air-mousing, revisit the virtual-tweezer visualization and grab rule before adding more levels.

---

## 18. Playtest notes to record

For at least 5 full runs:

- pinch miss count
- accidental grab count
- accidental release count
- perceived input lag
- horizontal/vertical offset between finger and object
- comfort distance from camera
- whether markers help or distract
- whether barrier collision feels magical, confusing, or convincing
- whether the player tries to use a second hand
- arm/hand fatigue

---

## 19. Explicitly out of scope for v0.1

Do not add:

- throw/flick velocity
- two-hand objects
- multi-touch hand tracking
- soft-body physics
- rope
- bridge building
- enemies
- combat
- level editor
- progression
- CRANE TACTICS rules
- online score
- recording/upload

This prototype exists to validate direct pinch manipulation.

---

## 20. Relationship to EXP-006 CRANE TACTICS CAM

EXP-005 is the input proof for EXP-006.

If PINCH WORLD passes, CRANE TACTICS should reuse:

- pinch geometry
- pinch edge events
- mirrored coordinates
- grab radius logic
- smoothing
- tracking-loss grace period
- release handling

CRANE TACTICS should add tactical rules, weight, legal tiles, units, and consequences later.

Do not duplicate the pinch implementation.

---

## 21. Exit decision

### PASS
Pinch feels like direct object manipulation. Proceed to deeper PINCH WORLD ideas and CRANE TACTICS CAM.

### PASS WITH UX WORK
The interaction is fun but alignment/jitter causes friction. Improve calibration/smoothing before game expansion.

### FAIL
It feels like a bad mouse pointer. Keep pinch as a discrete gesture for other games and stop direct-manipulation expansion.

---

## 22. Codex implementation directive

Implement EXP-005 PINCH WORLD from this specification as three tiny sequential manipulation tasks.

Priorities:

1. normalized pinch position and edge events in the shared body-input layer;
2. visible two-fingertip "virtual tweezer" interaction;
3. robust grab / carry / release with hysteresis and tracking-loss grace;
4. one simple barrier collision that proves the held object belongs to the game world;
5. Japanese and English;
6. mobile HTTPS deployment compatibility.

Reuse existing MediaPipe hand tracking and camera infrastructure. Do not build CRANE TACTICS, throwing, two-hand input, or a general physics engine yet.
