
# EXP-021 TENSION BREAK! SOLO
## Implementation Task v0.1

**Project:** `madowaku/camera-game-lab`  
**Parent experiment:** EXP-021 TENSION DUEL  
**Goal:** Add a one-player, front-camera brick-breaker using the existing elastic finger net.

**Core experience:**

Cを作る → 指の間にネットが張られる → ボールを受け止める → 指を閉じて弾き返す → ブロックが壊れる！

---

## 0. Preflight: Protect existing work

Before implementation:

1. Inspect the current repository, existing branches and EXP-021 implementation.
2. PR #14 (`codex/tension-duel-polish`) was closed without merging as of 2026-10-10. Its source branch still exists. Check the latest active development branch before choosing a base.
3. Preserve all working TENSION DUEL functionality.
4. Create an isolated branch for SOLO. If SOLO depends on the unmerged polish branch, use a stacked PR or otherwise document the dependency.
5. Do not copy the entire DUEL implementation into a second game.

Reuse the existing elastic physics and camera infrastructure wherever practical.

**Do not modify DUEL scoring, 2-player assignment, goals or first-to-five behavior.**

---

## 1. Product definition

### Mode

**TENSION BREAK! SOLO**

- 1 player
- Front-facing camera
- One hand
- Right-handed / left-handed selection
- Landscape-first
- Break all blocks in 30 seconds
- Maximum 3 misses
- Three selectable layouts
- Touch/mouse practice mode
- JA / EN

### Input

Use the distance between the thumb tip and index fingertip to create an elastic net.

- Move hand: move net
- Tilt hand: control rebound
- Spread fingers: longer, softer elastic catch
- Pinch fingers: faster rebound

Use the current TENSION DUEL behavior, where spreading slows release and pinching accelerates it. Do not revert to the original design in which spreading always increases power.

PIN / HARE are outside v0.1.

---

## 2. TASK-001: Mode selection

Add an entry for SOLO without removing the existing DUEL entry.

Suggested choices:

**TENSION DUEL**
- 1 VS 1
- Two people, one camera

**TENSION BREAK!**
- SOLO
- One person, one hand

The two modes should look related but remain independently playable.

Follow the repository's existing routing/experiment registry convention. Do not introduce a conflicting route system.

---

## 3. TASK-002: Handedness selection

Before starting SOLO, show two large choices:

**右手で遊ぶ / RIGHT HAND**

**左手で遊ぶ / LEFT HAND**

Use these layouts:

| Setting | Net | Blocks | Ball returns toward |
|---|---|---|---|
| RIGHT HAND | Screen right | Screen left | Right |
| LEFT HAND | Screen left | Screen right | Left |

Persist the choice locally and restore it on next entry.

Allow changing hands from the pause menu. On change, restart the current stage with a visible confirmation rather than silently moving an active ball.

### Important coordinate rule

Do not flip the camera video, canvas text or whole UI when switching hands.

Define one canonical gameplay space, preferably:

- Logical paddle on left
- Logical bricks on right

Convert logical X positions at input/output boundaries:

```js
function logicalX(screenX, handSide) {
  return handSide === 'right' ? 1 - screenX : screenX;
}
```

Use an equivalent inverse mapping for rendering.

Both modes must produce identical logical physics under a horizontal mirror transformation.

The front-camera preview must continue looking like a mirror. The visible fingertip endpoints and collision geometry must remain aligned.

MediaPipe's handedness labels can depend on image orientation and mirroring assumptions. Verify them before relying on them. Do not reject a clearly tracked single hand solely because its classification label is inconsistent; provide a placement guide and calibration fallback.

---

## 4. TASK-003: Shared physics extraction

Review these existing modules:

- `src/tension/rules.js`
- `src/tension/handInput.js`
- `src/tension/duel.js`
- `src/tension/audio.js`

Prefer reusing pure functions for:

- Fingertip geometry
- Tension response
- Elastic deformation/recoil
- Closest-point-to-segment collision
- Finger movement smoothing
- Camera-to-arena projection
- Sound playback

Add a separate SOLO game-state module, tentatively `src/tension/soloRules.js`.

Do not reuse DUEL's full `stepMatch()` directly if that requires changing two-player scoring logic.

Suggested API:

```js
createSoloMatch(options)
stepSoloMatch(match, net, dt)
resizeSoloMatch(match, height)
createBrickLayout(layoutId)
```

All gameplay calculations should be independently testable without a camera.

---

## 5. TASK-004: One-hand camera tracking

Configure SOLO for one active hand.

Required behavior:

- Thumb tip and index fingertip follow the existing mirrored preview
- Finger spacing determines net elasticity
- Hand tilt controls rebound angle
- Short recognition gaps receive existing stabilization
- Loss beyond the grace period pauses the simulation
- Reacquisition restores gameplay without inventing a miss

When two hands are visible, retain the selected tracked hand where possible rather than switching ownership each frame.

READY begins only after a usable net is detected in the correct play area.

Provide a large visual hint:

**MAKE A C / Cを作ってね！**

Do not let an invalid or missing hand consume lives.

---

## 6. TASK-005: SOLO court

Create a dedicated block-breaker court using the existing visual style.

Required:

- Ball / puck
- Finger net
- Blocks
- Solid top/bottom rails
- Solid wall behind the blocks
- Open miss edge behind the player's net
- Small hit effects
- Score, lives, timer

The court must mirror correctly between right-handed and left-handed modes.

Render actual blocks and collision rectangles from the same normalized layout data.

### Screen layout

Top:

**SCORE 0000 | ♥♥♥ | 00:30**

Center:

- Finger net
- Ball
- Blocks

Bottom:

Only short contextual hints.

Avoid large tutorial panels covering the gameplay area.

---

## 7. TASK-006: Three block layouts

Add three small layouts.

### A. FIRST BOING

Six blocks in two rows.

Purpose: Teach bouncing and aiming.

### B. THE GAP

Six blocks with a visible central gap.

Purpose: Encourage hand tilt and angle control.

### C. CORNER SHOT

Six blocks concentrated near the upper and lower areas.

Purpose: Make wall bounces and precise aiming useful.

All three layouts must be clearable using ordinary net reflections.

Do not add power-ups or special bricks in v0.1.

The user selects one layout per 30-second run. Clearing one layout is a complete victory; all three do not need to be cleared within the same timer.

---

## 8. TASK-007: Ball and brick physics

Use normalized court coordinates, consistent with the current TENSION DUEL physics.

Implement:

- Top/bottom wall reflection
- Rear wall reflection
- Ball-to-brick collision
- Brick destruction
- Bounce direction based on contacted brick face
- Ball-to-net collision
- Net capture/recoil/release
- Miss detection

Use fixed or bounded substeps to prevent fast balls tunneling through thin blocks or nets.

A single ball impact must not destroy the same brick multiple times or award duplicate points.

Suggested scoring:

- Normal brick: +100
- All bricks destroyed: CLEAR

No permanent progression in v0.1.

---

## 9. TASK-008: SOLO elastic return

Preserve the tested TENSION DUEL behavior.

**Wide C**
- Deep stretch
- Longer hold
- Softer and slower return

**Narrow C**
- Short hold
- Fast snap-back
- Higher outgoing speed

Tilting the net must still affect the outgoing trajectory.

To prevent impossible rallies, cap outgoing speed and reflection angles so the ball maintains a useful horizontal component.

Do not add a separate gesture recognizer for PIN, HARE or CATCH.

The existing elastic catch already supplies the core mechanic.

---

## 10. TASK-009: Lives, timer and serve

Default:

- 30-second round
- Three misses
- Clear all blocks to win

A miss happens only when the ball fully exits the player's goal/miss edge.

On miss:

1. Subtract one life.
2. Show a short visual cue.
3. Return the ball to a stable serve position.
4. Restart after a brief preparation delay.

First serve should be gentle and clearly telegraphed.

Timer counts active gameplay time only. It must pause for manual pause, tracking loss and tab backgrounding.

End states:

- **CLEAR:** all blocks destroyed
- **TIME UP:** timer reaches zero
- **GAME OVER:** three misses

Never serve another ball after the result state.

---

## 11. TASK-010: Practice input

Provide camera-free testing using mouse and touch input.

Required controls:

- Drag net vertically
- Adjust tilt
- Adjust finger opening
- Test both handedness options
- Restart without refreshing

Reuse the existing practice/input infrastructure where possible.

Practice is explicitly labeled so players do not mistake it for live-camera play.

All core logic must work with synthetic input.

---

## 12. TASK-011: Game flow and localization

Flow:

```text
MODE SELECT
    ↓
SOLO
    ↓
RIGHT / LEFT HAND
    ↓
LAYOUT A / B / C
    ↓
MAKE A C
    ↓
READY
    ↓
30-SECOND GAME
    ↓
RESULT
    ↓
RETRY / CHANGE LAYOUT / BACK
```

Support Japanese and English.

Keep introductory instructions short enough to understand without reading a manual.

Use the existing visual language, music and impact sound system. Add new assets only if they materially improve the experience.

---

## 13. TASK-012: Automated verification

Add pure-logic unit tests covering:

1. Right/left coordinate mirror equivalence
2. Both orientations produce symmetric rebounds
3. Net endpoints match mirrored fingertip positions
4. Wide/narrow elastic response remains consistent with DUEL
5. Brick destroyed once per hit
6. Ball cannot tunnel through blocks
7. Top/bottom walls reflect correctly
8. A missed ball subtracts exactly one life
9. Third miss ends the game
10. Thirty-second timeout
11. Clearing all bricks ends the game
12. Pause and tracking loss do not consume time or lives
13. Changing handedness resets SOLO safely
14. Resize/rotation preserves valid state
15. Existing DUEL tests remain unchanged and green

### Browser/UI checks

Verify both handedness options at:

- 844 × 390 landscape
- 390 × 844 portrait
- 1440 × 900 desktop

Check layout A/B/C, practice controls, result, retry, exit, language switching and no unintended horizontal overflow.

### Required commands

Use the current repository scripts and verify at least:

```bash
npm test
npm run test:tension-ui
npm run build
```

Do not modify tests merely to silence failures.

---

## 14. Implementation slices

### Slice A: Physics and symmetry

- Canonical SOLO coordinate space
- Right/left mirroring
- Ball and brick collisions
- Three lives and timer
- Pure logic tests

**Gate:** Both handedness options behave identically under mirroring.

### Slice B: Playable practice

- SOLO entry and menu
- Three layouts
- Canvas rendering
- Pointer/touch controls
- Elastic hit visual and SE
- Result and retry

**Gate:** Complete rounds work without the camera.

### Slice C: Front-camera integration

- One-hand input
- READY detection
- Tracking loss recovery
- Mirrored fingertip attachment
- Mobile layout
- JA/EN

**Gate:** Existing browser tests and new SOLO tests pass. Camera behavior requiring physical hardware is clearly listed as unverified until tested.

---

## 15. Human Playtest Gate

Use the A401OP or another real Android phone.

Run at least five SOLO attempts, including both right-hand and left-hand settings.

Check:

- Can the player create the net within 10 seconds?
- Is the net attached to the fingertips?
- Does the ball visibly interact with the net?
- Can the player intentionally aim at a different block?
- Can the player feel a difference between wide and narrow C?
- Does right/left switching feel natural?
- Does the camera remain responsive?
- Are 30 seconds and three lives reasonable?
- Does the player want to retry?

If players repeatedly miss because of camera tracking, adjust recognition and collision forgiveness before adding new content.

---

## 16. Stop rules

Do not expand scope to additional mechanics when:

- DUEL regressions occur
- Handedness mapping breaks camera alignment
- Net collision is visibly detached from fingers
- Ball physics behaves differently for mirrored modes
- Mobile rendering or inference becomes unstable
- Existing shared code requires an unnecessarily large rewrite

Resolve core reliability issues first.

---

## 17. Final deliverables

- Playable SOLO mode
- Right/left-handed selection with saved preference
- Three block layouts
- 30-second, three-life rules
- Shared elastic net behavior
- Camera and practice input
- Result/retry flow
- JA/EN
- Automated tests
- Production build
- Browser screenshots or equivalent evidence
- Human playtest checklist
- Isolated PR with correct branch dependency

Final report must distinguish:

**Implemented / Automated verified / Browser verified / Real-device verified / Not verified**

Do not claim a physical-camera success based only on synthetic input.

---

## 18. Design principle

The game's success is not measured by how many blocks it has.

The crucial moment is:

**広げて受ける。狙って閉じる。バィン！ パリン！**

If that feels good, TENSION BREAK! succeeds as a SOLO game.

If it does not, prioritize timing, aiming, tracking and elasticity over additional features.
