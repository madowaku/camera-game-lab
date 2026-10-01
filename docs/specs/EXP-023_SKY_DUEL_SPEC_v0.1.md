# EXP-023 SKY DUEL — SPEC v0.1

Status: Ready for implementation  
Mode: 2-player local flight experiment  
Orientation: Landscape  
Round length: 30–45 seconds

## 1. One-line concept

**二人で空を操る。操縦士と砲手で一機。**

The first version deliberately tests asymmetric cooperation rather than two separate planes.

## 2. Research question

Can two people share one vehicle through different body inputs without needing conventional controls?

## 3. Roles

P1 — PILOT

- head tilt left/right => bank
- face up/down or vertical movement => pitch

P2 — GUNNER

- face position => targeting reticle
- mouth-open edge => fire

Roles can swap on replay.

## 4. MVP mission

Fly through a short canyon/sky corridor and shoot targets.

Objectives:

- avoid obstacles;
- destroy marked drones;
- reach the finish before time expires.

The aircraft has 3 shield points.

## 5. Control philosophy

Pilot input should be low-frequency and forgiving.

Use:

- deadzones
- smoothing
- maximum bank limits
- auto-level assist

The gunner should be able to aim independently of aircraft orientation within a limited cone.

## 6. Cooperation moments

Create explicit situations where both roles matter:

- target appears while obstacle approaches;
- pilot must line up a firing window;
- gunner can destroy mines in the pilot's path;
- bonus gate requires steady flight while gunner hits a target.

## 7. Camera framing

Keep both players visible in small side windows or as translucent silhouettes.

Game view remains dominant.

Role labels:

```text
P1 PILOT
P2 GUNNER
```

## 8. Result

Show:

- distance
- targets destroyed
- damage taken
- co-op score
- role-swap button

## 9. Success criteria

- players understand their distinct roles quickly;
- gunner can aim without fighting the pilot's movement;
- pilot motion remains comfortable;
- communication emerges naturally;
- role swap creates a meaningfully different replay.

## 10. Out of scope

- full dogfight AI
- multiple aircraft
- advanced aerodynamics
- missiles / lock-on
- campaign
- online play
