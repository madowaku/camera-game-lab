# EXP-022 ZOMBIE DUO — SPEC v0.1

Status: Ready for implementation  
Mode: Local 2-player cooperative shooter  
Orientation: Landscape  
Round length: 30 seconds

## 1. One-line concept

**二人で同じ画面を守れ。顔で狙って、口で撃て。**

Zombies advance from the screen depth/center while two players defend together.

## 2. Research question

Does cooperative two-player camera aiming create stronger social play than competitive scoring?

## 3. MVP

- one shared defense line
- zombies spawn from center/background
- P1 mainly covers left half
- P2 mainly covers right half
- zombies can cross between halves
- if too many reach the players, game over
- survive 30 seconds to win

## 4. Controls

Per player:

- face position / tilt => reticle
- mouth-open edge => shoot

Recommended first mapping:

- horizontal face motion maps to reticle X within player's half;
- vertical face motion maps to reticle Y;
- reticle smoothing reduces jitter.

No continuous autofire in v0.1.

## 5. Enemy set

Use only three simple zombie behaviors:

1. WALKER — slow straight movement
2. RUNNER — fast, low HP
3. TANK — slow, requires multiple hits

Silhouettes/placeholders are acceptable.

## 6. Cooperation rule

The game should create moments where one player helps the other.

Examples:

- zombies may cross center;
- TANK may require alternating hits from both sides;
- one shared panic meter / gate HP.

Do not force rigid ownership of targets.

## 7. Scoring

Primary objective: survive.

Secondary:
- total kills
- combo
- saves (shooting a zombie already close to the other player's zone)

Result should celebrate team performance, not P1 vs P2.

## 8. Feedback

- big hit reaction
- directional warning for escaped zombies
- shared danger alarm
- brief SLOW-MO on last-second save
- finish screen: SURVIVED / OVERRUN

## 9. Success criteria

- both players can independently aim and shoot;
- players naturally call out targets;
- helping the other side feels useful;
- one player's temporary tracking loss does not corrupt the other player's input;
- 30 seconds feels replayable.

## 10. Out of scope

- gore
- weapon inventory
- reload simulation
- story
- levels
- progression
- online co-op
