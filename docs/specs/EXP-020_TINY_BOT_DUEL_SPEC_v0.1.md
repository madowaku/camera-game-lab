# EXP-020 TINY BOT DUEL — SPEC v0.1

Status: Ready for implementation  
Mode: Local 2-player versus  
Orientation: Landscape  
Round length: 30 seconds

## 1. One-line concept

**顔で操縦、口で撃て。小さなロボを場外へ吹っ飛ばせ。**

Two players stand side by side in front of one phone and control tiny robots in the same arena.

## 2. Research question

Can two-player face control feel immediate enough for a readable competitive action game?

## 3. MVP rules

- one arena
- two robots
- no HP
- shots apply knockback
- falling out of the arena loses the round
- best-of-3 is optional; v0.1 may use instant rematch

## 4. Controls

Per player:

- face lean left/right => robot horizontal movement
- mouth open edge => cannon shot

Suggested movement normalization:

```text
dx = faceX - neutralFaceX
movement = deadzone(dx) * speed
```

Do not fire continuously from a permanently open mouth. Require close → open transition or a cooldown.

Initial shot cooldown:

```text
SHOT_COOLDOWN_MS = 450
```

## 5. Physics

Keep physics arcade-like, not realistic.

- robots accelerate quickly
- slight inertia
- shots cause strong knockback
- recoil may nudge shooter backward
- edge recovery should be possible but risky

The fun target is repeated near-falls, not instant unavoidable deaths.

## 6. Arena

v0.1 arena:

- one floating platform
- slightly raised center
- visible left/right danger edges
- optional center battery pickup

No stage hazards in v0.1.

## 7. Match flow

```text
WAIT FOR TWO
→ CALIBRATE
→ 3 2 1
→ FIGHT
→ RING OUT / TIME
→ RESULT
→ REMATCH
```

If time expires, compare distance from arena center only as a temporary tiebreaker. A draw is acceptable for v0.1.

## 8. Feedback

Shot:
- muzzle flash
- small recoil
- impact spark
- screen-space knockback line

Near edge:
- warning pulse
- robot wobble

Ring out:
- exaggerated fall
- quick winner banner

## 9. Success criteria

- both players understand movement within 5 seconds;
- mouth-shot is reliable enough for intentional fire;
- no frequent identity swaps;
- a round produces at least one laugh/surprise from physical play;
- rematch is one tap.

## 10. Out of scope

- character roster
- weapons
- online play
- progression
- complex physics
- stage selection
- monetization
