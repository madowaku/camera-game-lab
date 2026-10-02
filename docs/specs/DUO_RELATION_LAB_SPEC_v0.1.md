# DUO RELATION LAB — SPEC v0.1

Status: Design ready / implementation waits for DUO camera playtest gate
Depends on: DUO INPUT FOUNDATION
Purpose: Test whether the relationship between two players can become a first-class game input.

## Core hypothesis

TINY BOT DUEL treats P1 and P2 as two independent controllers.

DUO RELATION LAB asks a different question:

> Can the geometry, timing, role state, and information gap between two people become the controller?

The lab contains six deliberately different probes.

---

## Shared derived relation state

Games should not read raw MediaPipe landmarks.

Add a derived pair-state layer on top of the existing normalized P1/P2 states.

Suggested contract:

```js
pair = {
  bothPresent,
  midpointX,
  midpointY,
  deltaX,
  deltaY,
  distance,
  angle,
  scaleRatio,
  heightDifference,
  symmetry,
  approachVelocity,
  separationVelocity
}
```

All values should be normalized against calibration where practical.

Potential temporal events:

- PAIR_CLOSER
- PAIR_FARTHER
- PAIR_CROSS
- PAIR_ALIGNED
- PAIR_SYMMETRIC
- ROLE_SWAP

Do not add events unless a prototype proves they are useful.

---

# EXP-024 — HUMAN JOYSTICK

## One-line concept

**Two faces become one giant analog stick.**

## Input

- line from P1 face center to P2 face center = stick direction
- player distance = stick magnitude
- pair midpoint = neutral anchor reference

## Game

Guide one small ship through moving gates.

Neither player controls a separate object.

The ship only responds to the combined pair geometry.

## Round

30 seconds.

Pass as many gates as possible without hitting walls.

## Research question

Can two people learn to intentionally control one continuous vector through their relative position?

## Success signal

Players start giving each other coordination instructions such as:

- “a little higher”
- “stay there”
- “move left together”

rather than thinking in P1/P2 terms.

---

# EXP-025 — HUMAN BRIDGE

## One-line concept

**The line between two faces is the bridge.**

## Input

- P1 face position = left bridge endpoint
- P2 face position = right bridge endpoint
- line angle and height define the physical bridge

## Game

A tiny traveler automatically walks from left to right.

Players move their heads to:

- change bridge slope
- avoid spikes
- catch falling objects
- keep the traveler from sliding off

## Round

20–30 seconds.

Reach the goal or survive the course.

## Research question

Does turning the literal space between two people into a game object create an interaction that feels impossible with ordinary buttons?

## Key constraint

Use gentle movement. No physical contact or extreme leaning should be required.

---

# EXP-026 — LIGHT & SHADOW

## One-line concept

**One player creates the safe world. The other lives inside it.**

## Roles

P1 — LIGHT

- face X/Y moves a light source

P2 — RUNNER

- face X/Y moves a small character

## Game

The runner may only move safely inside cast shadow.

P1 positions the light so obstacles create usable shadow paths.

P2 traverses those paths.

## Round

One short room, 30–45 seconds.

Roles swap on retry.

## Research question

Can one player's movement meaningfully rewrite the other player's navigable world in real time?

## Success signal

Players naturally communicate about world state:

- “move the light up”
- “hold it”
- “now I can cross”

---

# EXP-027 — PARALLEL WORLD

## One-line concept

**Same place, different truths.**

## Roles / information

P1 sees RED hazards.

P2 sees BLUE hazards.

Each player can only detect part of the danger, but both control a shared traveler.

Suggested v0.1 control:

- P1 controls horizontal movement
- P2 controls vertical movement

## Game

Reach the exit while avoiding hazards only one player can see.

Each player must describe information the other does not have.

## Research question

Can camera control plus asymmetric information produce communication that is more important than dexterity?

## Constraint

Keep the maze visually simple. The experiment is about information sharing, not navigation complexity.

---

# EXP-028 — FACE CHICKEN

## One-line concept

**Approach, threaten, bail out.**

## Input

Use normalized pair distance only.

Players do not need to touch or collide physically.

## Game

Two vehicles rush toward a cliff / collision point.

The closer the players move toward the calibrated challenge zone, the more "commitment" their vehicle gains.

Either player may bail out by clearly retreating.

Scoring rewards late retreat, but entering the forbidden close-distance safety zone immediately cancels the round.

## Round

Best of 5 very short exchanges.

## Research question

Can real-world interpersonal distance create readable bluffing and tension without requiring contact?

## Safety

- define a comfortable minimum separation during calibration;
- never reward physical touching;
- if distance becomes too small, freeze and reset rather than score;
- UI must explicitly say “do not bump heads.”

---

# EXP-029 — HOT POTATO CROWN

## One-line concept

**The power belongs to exactly one player, and it keeps moving.**

## Game

Two tiny characters share one crown.

Only the crowned player can attack / score.

Getting hit transfers the crown.

The uncrowned player is faster.

## Input

Reuse ordinary per-player movement plus one discrete action.

The experiment is not about new tracking. It is about dynamic role transfer.

## Round

30 seconds.

Most crown-time or most crown-score wins.

## Research question

Does constantly transferring capability create stronger social play than fixed symmetric roles?

## Success signal

Players immediately change behavior when the crown changes hands.

---

# Comparison matrix

| Experiment | Main thing being tested | Pair relation type |
| --- | --- | --- |
| HUMAN JOYSTICK | continuous combined control | angle + distance |
| HUMAN BRIDGE | geometry as world object | line between players |
| LIGHT & SHADOW | one player rewrites other's world | cross-player causality |
| PARALLEL WORLD | communication under partial information | information asymmetry |
| FACE CHICKEN | bluffing through distance | interpersonal distance |
| HOT POTATO CROWN | moving capability | dynamic role state |

---

# Shared playtest questions

After each prototype ask:

1. Did players think in terms of “my controls,” or “our relationship”?
2. Did verbal coordination emerge without prompting?
3. Did either player need exaggerated movement?
4. Could the same experience be replaced by two touch sticks without losing much?
5. Was there a moment where players looked at each other instead of only at the screen?
6. Did the interaction remain readable to a spectator?

The strongest prototypes are the ones where replacing the camera with touch controls destroys the central joke or tension.

---

# Implementation principle

> Do not merely map two bodies to two cursors.

Treat the pair as a new sensor.
