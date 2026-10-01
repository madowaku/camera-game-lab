# EXP-021 FACE RACER — SPEC v0.1

Status: Ready for implementation  
Mode: Local 2-player race  
Orientation: Landscape  
Race length: 30–45 seconds

## 1. One-line concept

**顔を傾けてハンドル、口を開けてブースト。**

Two players race side by side using head/face movement instead of touch steering.

## 2. Research question

Does continuous face steering feel controllable and funny enough to support a racing game?

## 3. MVP presentation

Use a simple top-down or pseudo-3D road.

Recommended v0.1: top-down shared track because:

- steering readability is high;
- collision is easy to understand;
- camera-game latency is easier to judge.

## 4. Controls

Per player:

- head tilt or horizontal face offset => steering
- mouth-open edge => boost

Preferred steering input for first test:

```text
steer = clamp(tilt / TILT_MAX, -1, 1)
```

If tilt is unstable on target devices, fall back to face X offset.

Boost:

- short impulse
- cooldown 2–3 seconds
- visible charge indicator

## 5. Race design

v0.1 track:

- one looping circuit
- broad corners
- 2–3 gentle obstacles
- no sharp hairpins

Cars may bump each other.

Leaving road slows the car rather than stopping it.

## 6. Camera-game twist

Players are physically visible above/behind their cars.

Optional visual link:

- P1 car copies P1 head tilt
- P2 car copies P2 head tilt

This makes the connection between body and vehicle obvious to spectators.

## 7. Win condition

First to finish target laps, or farthest progress when timer ends.

For v0.1:

```text
LAPS = 2
MAX_RACE_SECONDS = 45
```

## 8. Success criteria

- steering feels learnable within one race;
- players can intentionally take a corner;
- input does not require exaggerated painful neck movement;
- collisions are readable;
- immediate rematch feels natural.

## 9. Out of scope

- drifting system
- items
- car upgrades
- AI opponents
- online multiplayer
- track editor
