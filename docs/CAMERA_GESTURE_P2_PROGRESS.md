# Camera Gesture Layer v0.2 — P2 visual feel experiment

Date: 2026-10-10. Status: **opt-in A/B implementation**. B is experimental, never the default.  
Targets: EXP-044 SOFT SERVE and EXP-062 MARU MAGIC. No new MediaPipe inference, worker or dependency.

## Actual code-path invariants

### SOFT SERVE
- A retains `SoftServeGame` input, initial ready zone (`abs(rawHand.x-.5)<.14`, `y=.38..84`), 450ms hold, 65ms internal cone follow, game speed/score and Creator Mode.
- B imports `NozzleGuide` and passes the *already-projected, unclamped hand* into a **visual-only** coach shown by `drawSoftServe`. Coach uses `magneticSnap` *for rendering a separate guidance ring*, not for feeding `SoftServeGame.step()`. The ring is not the real cone, and the UI explicitly says B is visual only.
- Eligibility/color is determined from raw input, not from the magnetically assisted preview. Losing a hand, pausing or leaving ready phase resets guide state. No extra time filter gets stacked on the existing cone follower.

### MARU MAGIC
- A remains the original `smoothVec2(last, raw, dt, .028)` light-stroke smoothing.
- B replaces the *visual-only* light stroke with an adaptive filter using `exponentialSmooth`/`smoothVec2`, velocity-sensitive cutoff, and a maximum 16 px displacement from each accepted raw point.
- Scoring and completion remain controlled by `MaruGame.sample(raw, at)` and `MaruGame.points`. Results, retry behavior, timestamps and records are not sourced from `visualPoints`. B resets its filter at the start/clear/retry/deactivate.
- User-visible “INK B” label appears when the experiment is enabled; DEBUG view prints variant, visual sample count and visual offset. The light trail in B may differ visually even when final score stays exactly the same.

## A/B entry URLs

The **query string must be before the hash route**. The URL examples refer to the regular Cloudflare domain but will only work after deploying a build that contains P2. GitHub CI does not deploy Cloudflare.

- SOFT SERVE A: `https://camera-game-lab.cacao-ixora-coccinea.workers.dev/?debug=1&feel=A#/game/solo-soft-serve`
- SOFT SERVE B: `https://camera-game-lab.cacao-ixora-coccinea.workers.dev/?debug=1&feel=B#/game/solo-soft-serve`
- MARU MAGIC A: `https://camera-game-lab.cacao-ixora-coccinea.workers.dev/?debug=1&feel=A#/game/solo-maru-magic`
- MARU MAGIC B: `https://camera-game-lab.cacao-ixora-coccinea.workers.dev/?debug=1&feel=B#/game/solo-maru-magic`

Open on A401OP Chrome after actual deployment and grant camera permissions. A/B can be alternated via direct links. For a production review, use an HTTPS preview deployment from the branch, then compare A/B on the *same build*.

## Real-device test protocol (NOT yet performed)

1. Alternate A1 / B1 / B2 / A2 / A3 / B3 / B4 / A4 / A5 / B5. Keep camera distance, light, posture, sound and Android Chrome constant. Repeat 5 runs per variant for each title.
2. **SOFT SERVE**: start-up until successful nozzle hold (seconds), failed ring restarts, unintended missed pours, “guide vs actual cone” confusion, sense of lag 1–5, preference. Confirm B coaching never turns red when raw is eligible or green when raw is outside ready range.
3. **MARU MAGIC**: 5 circles each version, completion success, perceived hand-to-ink latency 1–5, jitter 1–5, trace-legibility 1–5, score acceptance. Compare whether the B stroke visually lags behind finger or creates unfair scoring perceptions. The raw circle score may vary between *separate physical attempts*; replay exactly identical trace through the same scorer to verify the implementation-level invariant.
4. Force short tracking loss, long loss, pause/resume, retry, result, changing face mode in SOFT SERVE CREATOR, and 360×800/mobile orientation layout. Observe no ghost or stale guidance after stop.
5. Keep videos/photos optional and explicitly chosen by player. Debug logs do not automatically upload camera imagery.

### Human adoption gates

- 10 deliberate tries: >=9 correctly registered; 30 sec neutral: <=1 false event; no new “stuck” recoveries.
- If B introduces extra lag or confusion, keep A and tune B; smoothness alone is not enough.
- A/B is small-sample qualitative evidence, not proof of a population effect.

## Automated QA and limitations

- `test/cameraGestureP2.test.js`: nozzle eligibility and reset, SoftServe state parity under identical raw trace, MARU A math parity, B lag bound/reset/invalid timing, pure scorer unchanged.
- GitHub PR workflow: `npm ci`, `npm test`, `npm run build` and Camera UI checks. Check actual run status before merging.
- Human A401OP camera success, perceived comfort, and cloud deployment are **not** established by CI.
