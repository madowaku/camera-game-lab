# TINY BOT DUEL — Human Playtest Pass v0.1

Updated: 2026-10-01  
Target: EXP-020 TINY BOT DUEL  
Device baseline: Android Chrome / landscape  
Required players: Two people  
Required camera rounds: 5 consecutive rounds

## 0. Purpose

This pass answers one question before EXP-021 FACE RACER:

> **Can two real people reliably control two tiny robots through one front camera, and does the duel feel worth replaying?**

The test is intentionally small. It is not a balance test, art review, or feature request session.

We are validating:

1. stable P1 / P2 identity;
2. intentional movement;
3. intentional mouth-shot input;
4. safe face-loss pause and recovery;
5. readable ring-out;
6. whether two-body play feels better than fallback controls.

---

## 1. Hard technical gate

FACE RACER should not begin from camera assumptions unless all of these pass.

- [ ] Five consecutive camera rounds complete.
- [ ] No confirmed P1 / P2 identity swap.
- [ ] Both players can move independently.
- [ ] Both players can shoot independently.
- [ ] Mouth already open after recovery does not create a stale shot.
- [ ] Deliberate face loss freezes robots and timer.
- [ ] Returning player keeps the same P1 / P2 label.
- [ ] Ring-out winner is always correct.
- [ ] Retry starts a clean round.
- [ ] No unrecoverable camera / calibration dead end.

A suspicion counter is evidence to inspect, not automatic proof of an identity swap.

---

## 2. Soft play-feel gate

Record after the five rounds.

Rate 1–5:

- Steering feels intentional: ___ / 5
- Shooting feels intentional: ___ / 5
- Knockback is readable: ___ / 5
- Near-edge danger is exciting: ___ / 5
- Ring-out feels satisfying: ___ / 5
- Body movement feels comfortable: ___ / 5
- “Play again” desire: ___ / 5
- Better with two bodies than two touch controls: ___ / 5

Most important free response:

> **What moment made both players react out loud?**

Notes:

---

## 3. Preflight

Before Round 1:

- [ ] Phone is landscape.
- [ ] Camera permission granted.
- [ ] Both players visible simultaneously.
- [ ] P1 is screen-left.
- [ ] P2 is screen-right.
- [ ] Both players keep mouth closed during calibration.
- [ ] BOTH PLAYERS READY appears.
- [ ] No extreme leaning is required.
- [ ] Camera model / WASM setup has finished.
- [ ] Debug / telemetry view is available if needed.

Record environment:

- Device:
- Android version:
- Browser:
- Lighting:
- Glasses: P1 / P2 / neither
- Approx. player distance:
- Approx. distance difference between players:

---

# 4. Five-round pass

## ROUND 1 — Natural first play

**Instruction to players:**

> 顔を左右に動かしてロボを動かす。口を開けて撃つ。相手を落としたら勝ち。

Do not explain implementation details.

Observe:

- [ ] Both understand movement within ~5 seconds.
- [ ] Both discover mouth shooting without repeated coaching.
- [ ] No player identity confusion.
- [ ] No accidental immediate shot from calibration.
- [ ] Ring-out is understood.

Result:

- Winner: P1 / P2 / DRAW
- Round duration:
- P1 shots:
- P2 shots:
- Player-loss count:
- Swap-suspicion count:
- Avg inference FPS:
- Accidental shots observed:
- Missed intended shots observed:

Player reaction:

- P1: 
- P2: 

---

## ROUND 2 — Deliberate control test

Ask both players to intentionally perform:

1. move left;
2. move right;
3. stop;
4. fire once;
5. fire twice with a close → open cycle.

Observe:

- [ ] P1 movement matches intention.
- [ ] P2 movement matches intention.
- [ ] P1 single shot fires once.
- [ ] P2 single shot fires once.
- [ ] Repeated shot requires re-arming.
- [ ] One player's movement does not control the other robot.
- [ ] One player's mouth input does not fire the other robot.

Then finish the round normally.

Result / anomalies:

---

## ROUND 3 — Face-loss recovery test

During live play:

1. briefly cover P1 face;
2. verify both robots and timer freeze;
3. uncover P1;
4. confirm P1 keeps identity;
5. repeat once for P2.

Important mouth test:

- Have the returning player come back with mouth already open.
- They must close before another shot can trigger.

Check:

- [ ] P1 loss pauses correctly.
- [ ] P1 returns as P1.
- [ ] P2 loss pauses correctly.
- [ ] P2 returns as P2.
- [ ] No stale shot after P1 return.
- [ ] No stale shot after P2 return.
- [ ] No old event replays after resume.
- [ ] Recovery does not require page reload.

Notes:

---

## ROUND 4 — Position / distance stress

Keep normal play, but intentionally create mild asymmetry.

Try:

- one player slightly closer to camera;
- one player slightly farther away;
- small side-to-side movement;
- mild head rotation;
- brief overlap near the center without fully blocking each other.

Do **not** deliberately create extreme impossible tracking conditions.

Check:

- [ ] P1 / P2 remain stable.
- [ ] No control freeze without visible ambiguity.
- [ ] No sudden jump in movement scale.
- [ ] Shooting remains usable.
- [ ] Tracking recovers from brief overlap.

Record:

- Swap-suspicion count:
- Player-loss count:
- Avg inference FPS:
- Worst visible jitter:
- Any confirmed swap? YES / NO

Notes:

---

## ROUND 5 — No-test-instructions fun round

Return to normal play.

Do not ask players to test anything.

The purpose is to see whether the game still works when nobody is thinking about QA.

Observe:

- [ ] Players look at the game more than the debug / camera setup.
- [ ] Players intentionally attack / evade.
- [ ] A near-ring-out creates tension.
- [ ] Players understand the result immediately.
- [ ] At least one player wants an immediate rematch.

Result:

- Winner: P1 / P2 / DRAW
- Round duration:
- Rematch requested spontaneously: YES / NO
- Biggest laugh / surprise:
- Biggest frustration:

---

# 5. Observer shorthand

Use these codes during play instead of writing sentences.

| Code | Meaning |
| --- | --- |
| SWAP | confirmed P1 / P2 identity swap |
| SUS | identity-swap suspicion event |
| LOST | face lost |
| REC | successful recovery |
| GHOST | stale input after pause / recovery |
| XSHOT | accidental shot |
| MSHOT | intended shot missed |
| XMOVE | unintended movement |
| JITTER | visible unstable control |
| EDGE | near-ring-out felt exciting |
| CONF | player looked confused |
| REPLAY | spontaneous request for another round |

Example:

```text
R3 00:12 P1 LOST → REC, no GHOST
R4 00:18 SUS, no SWAP
R5 EDGE + REPLAY
```

---

# 6. Physical comfort check

After Round 5 ask both players:

- Did you need to move your face too far?
- Did neck movement feel tiring?
- Did you hesitate to open your mouth because recognition felt uncertain?
- Did you understand when a shot was accepted?
- Did you feel you were controlling the robot, or merely triggering it?

Record any discomfort immediately.

P1:

P2:

---

# 7. Technical summary

Fill from local telemetry / observation.

| Metric | Result |
| --- | --- |
| Camera rounds completed | / 5 |
| Confirmed identity swaps | |
| Swap suspicions | |
| Player-loss events | |
| Successful recoveries | |
| Stale shots after recovery | |
| Accidental shots | |
| Missed intended shots | |
| Average inference FPS | |
| Lowest observed inference FPS | |
| Ring-out result errors | |
| Retry failures | |

---

# 8. Decision gate

Choose one.

## GO — proceed to EXP-021 FACE RACER

Use when:

- all five rounds complete;
- no confirmed identity swap;
- no stale-input recovery bug;
- both players can intentionally move and shoot;
- ring-out / retry are trustworthy;
- body control is at least comfortable enough to continue experimentation.

## GO WITH FIXES

Use when:

- the core duo-input contract is trustworthy;
- issues are local tuning problems such as deadzone, shot threshold, knockback, UI readability, or feedback;
- fixes do not require redesigning player tracking.

List fixes before FACE RACER:

1.
2.
3.

## HOLD

Use when any of these occur:

- confirmed P1 / P2 swap;
- repeated wrong-player control;
- face-loss recovery corrupts input;
- camera round cannot reliably finish;
- natural body movement is fundamentally too uncomfortable or ambiguous.

Reason:

---

# 9. Extended TASK-017 scenarios

These are not required to finish the first five-round gate, but should be checked before declaring the full DUO ARCADE foundation accepted.

- [ ] Adult + child
- [ ] Different distances from camera
- [ ] Glasses
- [ ] Uneven lighting
- [ ] Brief face occlusion
- [ ] One player leaves / re-enters
- [ ] Baseline Android remains roughly 15–30 inference FPS

Notes:

---

# 10. Final verdict

Date:

Players:

Device:

Decision: GO / GO WITH FIXES / HOLD

### What worked

-

### What broke

-

### What felt fun

-

### What felt awkward

-

### Changes before FACE RACER

1.
2.
3.

### One-sentence verdict

> 
