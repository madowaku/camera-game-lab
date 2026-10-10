# Camera Game Motion Recipe Book v0.1

- Date: 2026-10-10
- Scope: camera-game-lab, shared motion vocabulary / implementation plan
- Status: DESIGN ONLY. No runtime changes or physical-device validation in this PR.
- Concept: **「触れた瞬間、世界が応える」 / The world responds to you.**

## 0. The design decision

Do **not** replace the motion system already in the repository.

- The existing src/platform/motionDirector.js, motionProfiles.js and motion.css own presentation for shared routes. Existing burst concurrency is capped at 3; 180ms hit / 90ms special-combo cooldowns and reduced-motion controls are in place.
- Games flagged native:true in motionProfiles.js (including MARU MAGIC and TENSION DUEL) own their own live visual cues. A recipe must replace or enhance a native effect **inside its owner**, not create a second global burst/caption.
- SOFT SERVE already owns gameplay visuals in src/softServe/renderer.js. Creator Mode v0.2 additionally has src/creator/DirectorEventBus.js, AutoDirector.js and ClipComposer.js. Its presentation events use **active-presentation milliseconds**.
- src/inputFeel/ owns hand-control feel, in seconds. **Do not** feed animation smoothing, camera interpolation or other display-only coordinates back into the authoritative input, hit judgement or score.
- The project already has GSAP, Canvas, CSS/WAAPI and Three.js available. v0.1 needs **no new runtime dependency**. Prefer existing game canvas/CSS/WAAPI; use GSAP only where a multi-step timeline materially reduces implementation complexity.

This is a **catalog of 12 reusable motion recipes**, not a new renderer or a library rewrite.

## 1. The three purposes

1. **GAME FEEL** (M01, M04, M06, M07): direct feedback for a confirmed action, with extremely short perceived latency. The player must sense that their own action caused it.
2. **JUICE EFFECT** (M02, M03, M05, M08): exaggerate a verified success/failure or exceptional moment without obscuring how the game works.
3. **AUTO DIRECTOR** (M09–M12): connect scenes and reveal the story in a *recorded* share clip. Export composition is explicitly separate from live gameplay.

Golden rules:
- **Meaning before spectacle.** Every motion is bound to a gameplay event or an explicit scene transition.
- **One hero per moment.** The game's native effect, shared MotionDirector and Creator overlay must not independently congratulate the player for the same event.
- **Fast acknowledgement, readable finish.** Immediate first response; allow a slightly longer tail after the decision.
- **Stable truth.** Visual effects never make a player win, alter a hitbox, simulate a recognized gesture, change input ownership or create a false success.
- **Camera stays private.** No outside motion service needs the camera stream or facial landmarks.

## 2. The recipe catalog

| ID | Family | Name | Semantic trigger | Where it belongs | Duration | Priority |
| --- | --- | --- | --- | --- | ---: | --- |
| M01 | FEEL | MAGIC SEAL | Valid circle *accepted* | MARU MAGIC native canvas | 650ms | P0 |
| M02 | JUICE | DELICIOUS POP | Valid bite; enhanced only for final bite | SOFT SERVE native canvas | 500ms | P0 |
| M03 | JUICE | ELASTIC VICTORY | Actual winner decided (first to five) | TENSION DUEL native render/result | 800ms | P0 |
| M04 | FEEL | GRAVITY SNAP | Placement accepted, not finger proximity alone | PINCH WORLD native/shared | 360ms | P1 |
| M05 | JUICE | COMBO PUNCH | Confirmed combo milestone | AIR SLASH / HAND BEAT | 420ms | P1 |
| M06 | FEEL | RHYTHM RIPPLE | Confirmed note/drum hit | TOY DRUM / NOTE BLASTER | 300ms | P1 |
| M07 | FEEL | REVEAL TRAIL | Stage gate positively unlocked | THE CAMERA IS IT | 550ms | P1 |
| M08 | JUICE | SPELL BACKFIRE | Gameplay reports failed spell | HAND SPELL | 680ms | P1 |
| M09 | DIRECTOR | ONE SHAPE TRANSITION | Planned clip segment boundary | Creator Mode composer | 350ms | P2 |
| M10 | DIRECTOR | HERO FOCUS | Selected HERO / fallback BIG_SUCCESS | Creator Mode composer | 450ms | P1 |
| M11 | DIRECTOR | KINETIC CAPTION | Intro hook / event caption in export | Creator Mode composer | 500ms | P2 |
| M12 | DIRECTOR | PERFECT LOOP | Explicit loopable clip and compatible end/start | Creator Mode composer | 2–4s loop | P2 |

Durations are **design targets**, not measured timings. Exact scheduling may be adjusted after physical playtests.

## 3. P0 timeline blueprints (milestones in elapsed milliseconds)

### M01 MAGIC SEAL / MARU MAGIC

**Cause:** the authoritative MARU MAGIC result reports an accepted completed circle. Do not trigger on a nearly closed trace, cursor overlap, incomplete gesture, or visual-only candidate.

- 0–55: flash a narrow moving highlight along the **actual** recorded circle path, not an idealized replacement circle.
- 55–170: one thin external ring expands 1.0 → 1.13, opacity 0.9 → 0.35.
- 120–290: three to six short marks appear at even angular intervals. Stroke completion, not a second whole-screen explosion.
- 220–430: a restrained central seal rotates ~12 degrees and clicks into alignment.
- 430–650: highlights recede, leaving the game's real summon/result clear and legible.

Intensity: ordinary accepted circle = 0.7; a genuinely high scoring circle may use 1.0. Never use score bonuses or perfect wording unsupported by the scoring state.

Ownership: integrate with MARU MAGIC's native renderer. Keep the accepted shape itself and score readable; no concurrent shared MotionDirector burst. On invalid circle, keep existing failure feedback instead.

Reduced motion: static ring/accepted marker and score; no rotating or flashing sweep.

### M02 DELICIOUS POP / SOFT SERVE

**Cause:** the existing bite event reports actual consumption. Last bite's HERO event is stronger and occurs **once**.

- 0–80: the consumed cream outline compresses toward the mouth/contact point.
- 80–170: 4–6 tiny cream-colored droplets fan out; total radius at most 10% of stage width.
- 170–300: droplets curve back toward the center and shrink (not a distracting ongoing particle system).
- 300–500: settle into the next frame of the **actual remaining** cone.
- Final bite only: allow an additional short title accent for the native / Creator HERO, but not two simultaneous captions.

The bite amount, remaining cream shape, one-shot final event, game clock and score must remain unchanged. Existing SOFT SERVE bite art already contains shrink / pull-in / disappear timing: **adapt it** rather than stack a second competing effect.

Reduced motion: immediate consumed-state change and an unobtrusive static sparkle.

### M03 ELASTIC VICTORY / TENSION DUEL

**Cause:** the actual match ends with a winner. This game is currently **first to five, no time limit**. Do not show victory on each goal.

- 0–90: puck impact / goal arrival uses existing native cue; avoid new flash over the camera.
- 90–220: nearest court border and mesh deform visually up to 6% of their span; physics remains unchanged.
- 220–420: court line settles with one damped overshoot, while the winner's actual score expands 0.93 → 1.07.
- 420–600: winner score settles 1.07 → 1.00; loser score remains readable.
- 600–800: show one concise win accent. Rematch and navigation controls must remain operable.

In live DUO play, the final winner is authoritative. Never distort touch targets, hand positions, puck collision geometry, or change who scored. Pause/rotation/exit clear the decorative animation.

Reduced motion: instant score display and a static highlighted winner.

## 4. P1 recipe cards

### M04 GRAVITY SNAP (PINCH WORLD)
- Trigger: confirmed placement accepted by game.
- 0–90: placed object lands on its *actual accepted* coordinates.
- 90–230: visual outline expands subtly then contracts.
- 230–360: the object's shadow/halo fades.
- No animated magnetic correction of input position after release; no false placement.

### M05 COMBO PUNCH (AIR SLASH / HAND BEAT)
- Trigger: actual combo increment crosses a milestone, not repeated render frames.
- 0–85: existing score text scales to 1.09 with a tiny horizontal shift.
- 85–230: return to 0.98; line element underlines the number.
- 230–420: settle to 1.0. Keep all text JA/EN safe.
- Existing live caption takes precedence; never double-caption X-SLASH.

### M06 RHYTHM RIPPLE (TOY DRUM / NOTE BLASTER)
- Trigger: judged hit/event with real impact position.
- 0–45: 1 ring at impact center; immediate.
- 45–180: ring radiates 0.5 → 1.5 and fades.
- 180–300: secondary thin echo dissolves.
- Audio is game-owned. No added audio context or compulsory new SFX.

### M07 REVEAL TRAIL (THE CAMERA IS IT)
- Trigger: game reports stage gate clear/unlocked.
- 0–150: light traces the **available path**, not the gaze direction.
- 150–350: gate briefly highlights.
- 350–550: fade without obscuring the next objective.
- Seated-player range is a hard constraint: motion never encourages a >90-degree head turn or any unnecessary physical reach.

### M08 SPELL BACKFIRE (HAND SPELL)
- Trigger: game-confirmed failed spell.
- 0–90: a small shape buckles inward.
- 90–260: a funny mismatched glyph ejects sideways.
- 260–500: glyph folds back, with a small bounce.
- 500–680: reveal the game's true failure state. No flashing strobe or faux success.

## 5. Creator Mode cards

These are **export/composition recipes**, not additional DOM flashes in the live game. First target is SOFT SERVE, the currently integrated Creator v0.2 game. Expanding Creator to other games is a separate opt-in project.

### M09 ONE SHAPE TRANSITION
One existing shape (dot, cone tip, ring or score capsule) carries across a segment boundary and morphs into the next scene. 350ms, within the clip plan; avoid arbitrary crossfades. For Canvas export, draw from clip time and segment metadata. Do not depend on wall-clock transitions.

### M10 HERO FOCUS
Around a selected HERO timestamp: 0–100ms 1.00 → 1.025 zoom; 100–280ms restrained label; 280–450ms restore. Existing ClipComposer already implements ~450ms of 1.025 zoom and a label up to 700ms: refine **that single implementation**, don't duplicate it. Preserve the post-HERO reaction window. No fake hero if none was recorded.

### M11 KINETIC CAPTION
One brief statement tied to the actual clip: hook, rule, or real outcome. 0–120ms letter/word rise, 120–360ms hold, 360–500ms exit. Export captions must be composed into Canvas frames; DOM overlays do not appear automatically in exported video. Avoid false numerical claims. Do not repeat native labels.

### M12 PERFECT LOOP
Only when the profile opt-in says the moment is loopable and the planner can create a 2–4 second plan. Align end and beginning in shape, scene, orientation and camera-frame treatment. A loop is rejected if the actual frames mismatch or would create a jarring face jump. Maintain clear creator source / practice provenance.

## 6. Shared API proposal (implementation phase, not yet exported)

A recipe is an animation **description** plus renderer-specific adapter. The same ID can be mapped to gameplay canvas or Creator Canvas, but those runtimes are not required to share a single drawing engine.

Example proposed contract, descriptive only:

    playRecipe({
      id: 'M01',
      eventId: 'circle:42',  // dedupes confirmation events
      source: 'game',       // game | creator
      activeTimeMs: 12340,
      position: { x: 0.5, y: 0.5 }, // normalized 0..1
      intensity: 0.7,
      metadata: { accepted: true }
    });

Output obligations:
- create one disposable recipe instance; duplicate eventId is ignored.
- render is determined from elapsed ACTIVE milliseconds so pause/background do not advance it. Export composition should be seekable: frameAt(t) is deterministic.
- owner game still controls win/lose, motion cue priority, camera, stage sizing and cancellation.
- dispose removes references/timelines when leaving, retrying or switching routes.
- position defaults to a safe center only for decorative effects, never for scoring/truth.
- NEVER store image frames or face landmarks in a recipe.

**Integration gate:** first implement P0 inside existing native owners. Extract a shared pure function / recipe registry only after two recipes demonstrate genuine overlap. Avoid premature architecture.

## 7. Budget, legibility and safety

- Mobile baseline: A401OP, portrait 360x800 and 720x1280. Test the real camera path; synthetic QA is not a substitute.
- Real-time target: no new MediaPipe model, camera pass, permanent RAF, new stream or per-frame DOM layout measurement.
- Reuse existing motion's 3 concurrent effects as a ceiling. P0 uses one native effect per moment. Prefer 4–8 short-lived shapes to dozens of DOM particles.
- Use transform/opacity if in DOM; Canvas draw on existing game render callback; never run a separate unbounded simulation just for glitter.
- If inference/render FPS is poor, degrade decorative particle count to zero before changing gameplay responsiveness.
- Respect prefers-reduced-motion at startup and when toggled during play.
- Never block clickable retry, pause, share or navigation elements. Decorations are pointer-events:none / aria-hidden when DOM based. Gameplay status remains accessible as text.
- Do not make rapid flash patterns, rely only on colors, or overlay the player's face with a camera-derived effect outside an explicitly selected Creator face mode.
- Before adding any asset or music from examples, check individual license / attribution. Prompt Motion entries are references, not a grant to redistribute the example videos, prompts as product assets or third-party music.

## 8. Sources and transferable lessons

Prompt Motion is a collection of other makers' example videos, prompts and Skills:
- https://prompt-motion.com/
- https://www.prompt-motion.com/stephanlivera-df17a2 — kinetic typography + shapes + sound; inspiration for M05/M11.
- https://www.prompt-motion.com/twoclipping-5cba86 — one shape traversing multiple UI states, timing connected to a real action; inspiration for M09.
- https://prompt-motion.com/ultimaxbt-bbebf5 — persistent orange dot/matched first/last frame, animation from time rather than retained mutable state; inspiration for M09/M12.
- https://www.prompt-motion.com/lexnlin-6161a6 — Cinetic film skill, potential **offline creator marketing workflow**, not a live-game dependency.

These recipe descriptions are original interpretations designed for camera-game-lab, not copied artwork or borrowed code. Media examples are for human review and inspiration.

## 9. Implementation tasks

### P0-A: MARU MAGIC M01
- Identify the one authoritative accepted-circle event and existing native drawing/transition.
- Integrate M01 in its existing render owner.
- Test accepted vs incomplete/invalid gesture, score truth, retry, loss/reacquire, pause and background.
- Keep production performance and controls identical with motion off.

### P0-B: SOFT SERVE M02
- Replace/refine existing bite animation, don't layer duplicate particles.
- Distinguish ordinary bites and exactly one final HERO.
- Verify real leftover cream shape and Creator playback/export behavior; confirm there is no double hero caption.

### P0-C: TENSION DUEL M03
- Enhance match-final result only; preserve 5-point scoring and goal ownership.
- Verify retry, pause, fullscreen/rotation, landscape, two-player tracking loss, and no oversized screen overlay.
- Camera-free synthetic pass first, A401OP human test second.

### P0-D: Recipe QA matrix
- Unit: confirm event exactly once, dedupe, no false positives, exact clock ownership, reduced motion, unsubscribe/dispose.
- Browser: 360x800 / 720x1280 / 390x844 / landscape; no overflow, no hidden primary controls, no JS errors; reduced-motion on/off while mounted.
- A401OP: five real plays per game if physical setup permits. Record whether action feels *faster*, *clearer* and *more satisfying* than the existing A baseline, and any visible FPS/stutter/heat regression.
- Release gate: no camera/gameplay logic change; no new false successes; input reliability unchanged; visual meaning understood without explanation. If uncertain, retain old effect behind a test flag.

## 10. Follow-on sequence

1. Ship only the book (this PR): preserve clean main and give Codex an executable brief.
2. Implement M01, M02, M03 as native additive polish on separate small PR(s). Do not auto-deploy.
3. Evaluate on A401OP with A/B toggles and capture observations, not camera imagery.
4. If all three pass, extract a tiny shared recipe vocabulary and implement M04–M08.
5. Only then extend ClipComposer's existing opt-in Creator path with M09–M12.

**Success definition:** the player says “今、自分が動かした！” within the first second, and the game remains just as playable with animations disabled.
