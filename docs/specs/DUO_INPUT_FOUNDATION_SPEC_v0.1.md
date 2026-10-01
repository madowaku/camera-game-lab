# DUO INPUT FOUNDATION — SPEC v0.1

Status: Ready for implementation  
Target: Mobile Web / PWA  
Primary posture: Landscape  
Primary device: Android Chrome  
Purpose: Shared two-player camera-input foundation for EXP-020–023.

## 1. Core idea

Turn one front-facing camera into a two-player controller.

The input layer must detect two people, assign them consistently to P1 and P2, normalize useful body signals, and hide MediaPipe-specific details from individual games.

## 2. Player assignment

Landscape assumption:

- person on screen-left => P1
- person on screen-right => P2

Assignment must remain stable through small crossings, jitter, and brief detection loss.

Do not swap identities every frame by raw X ordering alone.

Suggested strategy:

1. detect up to two faces;
2. track each face center and short movement history;
3. match detections to previous tracks by nearest position;
4. only reassign sides after a sustained crossing;
5. if one player disappears briefly, reserve their slot.

Initial grace period:

```text
PLAYER_LOST_GRACE_MS = 800
```

## 3. Normalized per-player state

Expose, at minimum:

```ts
{
  present,
  faceX,
  faceY,
  faceScale,
  tilt,
  mouthOpen,
  eyesClosed,
  confidence
}
```

Derived events may include:

- MOUTH_OPEN_START
- MOUTH_OPEN_END
- BLINK
- TILT_LEFT
- TILT_RIGHT
- LEAN_LEFT
- LEAN_RIGHT
- FORWARD
- BACK
- PLAYER_LOST
- PLAYER_RETURNED

Games must consume normalized states/events, not raw landmarks.

## 4. Calibration

Before a duo round:

1. ask both players to enter frame;
2. show LEFT PLAYER / RIGHT PLAYER markers;
3. wait until two stable faces are present;
4. capture neutral face positions and scale;
5. show 3–2–1 countdown.

Calibration values:

- neutral X/Y
- baseline face scale
- neutral tilt

Allow recalibration from pause/result.

## 5. Layout

Landscape-first.

Recommended camera composition:

```text
+------------------------------------------------+
| P1 zone            ARENA            P2 zone    |
| [face]                                [face]    |
+------------------------------------------------+
```

The game may use a stylized/dimmed camera feed behind the arena or cropped player windows.

Keep critical gameplay readable even with a busy real-world background.

## 6. Face-loss behavior

If one player is lost:

- pause competitive state for up to a short grace window;
- show which player is missing;
- resume if they return;
- after a longer timeout, offer retry or fallback.

Do not silently transfer control to the remaining face.

## 7. Fallback controls

Each prototype should support keyboard/touch fallback for debugging.

Suggested debug mapping:

- P1: A / D + W or Space
- P2: Left / Right + Up or Enter

Fallback is not the primary experience, but every prototype must remain testable without a working camera.

## 8. Privacy

Before camera use:

JA:
```text
このゲームはインカメラを使います。
映像は保存・送信しません。
```

EN:
```text
This game uses your front camera.
Video is not stored or uploaded.
```

Camera processing is local to the browser in v0.1.

## 9. Debug overlay

Development-only overlay:

- P1/P2 face boxes
- face center
- track ID
- neutral position
- dx/dy
- tilt
- mouth-open value
- detected events
- FPS / inference interval
- lost timer

## 10. Performance target

Two-player recognition must remain playable on the baseline Android device.

Prefer stable 15–30 inference updates per second over unstable maximum frequency.

Rendering may run at 60fps while camera inference runs at a lower rate.

## 11. Acceptance criteria

A. Two players remain assigned correctly for 30 seconds.

B. Brief occlusion does not cause immediate P1/P2 swapping.

C. Both players can trigger independent inputs.

D. Landscape layout works at 800×360 and 1280×720.

E. All four DUO ARCADE prototypes can consume the same player-state contract.

## Principle

> Two faces in one camera are not two cursors.
> The relationship between them is part of the controller.
