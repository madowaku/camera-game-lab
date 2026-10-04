# POSE WALL — pending device and human playtest

Status on 2026-10-04: browser logic, synthetic camera lifecycle and actual model
boot checked; no human recognition-rate or first-use gate result is claimed.

Primary input: large upper-body poses, Reliability Rank B. Player motion:
see a pose-shaped hole, move both arms, hold during contact. Recovery: keep face
and shoulders in the guide; return a missing arm to the frame. Upper body only.

Test actual iOS Safari and Android Chrome front cameras in portrait; include
360×800, ordinary indoor lighting, varied body/arm sizes and both camera distances.
Use a stable phone support and ensure there is physical room to raise arms.
Record browser, device, date, lighting, camera aspect and cold/warm model state.

| Player | Starts without written explanation? | PLAY→first wall (cold/warm) | Y/T/ONE UP/MUSCLE/HERO recognized | Feels matched but CRASH | Hands leave frame | Loss/recovery understandable? | Wants RETRY? |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Pending | Pending | Pending | Pending | Pending | Pending | Pending |
| 2 | Pending | Pending | Pending | Pending | Pending | Pending | Pending |
| 3 | Pending | Pending | Pending | Pending | Pending | Pending | Pending |
| 4 | Pending | Pending | Pending | Pending | Pending | Pending | Pending |
| 5 | Pending | Pending | Pending | Pending | Pending | Pending | Pending |

Design gates: four of five understand without explanation; on average at least
four of five poses recognized; perceived-correct CRASH rate ≤10%; natural desire
to retry after 15 seconds; a play video communicates the rule without narration.
Ask separately whether PERFECT feels satisfying and whether SQUEEZE/CRASH is fun.

Shared input gates A–E: perform each intended pose ten times (≥9/10 successful),
remain deliberately mismatched for 30 seconds (≤1 false pass), first input from
visual guidance, leave/return to frame, and identify what to fix from the UI.
Inspect T-pose wrist clipping, HERO side orientation, short wrist occlusion,
250–400ms contact stability and camera-permission/phone-rotation interruption.

Keep cold-start timing separate from warm timing. Measure actual inference gaps
and whether camera/pose motion stalls before changing thresholds. The current
300ms averaging and 150ms joint grace passed synthetic tests; tune only against
recorded user evidence. Future creator recording is outside this MVP.
