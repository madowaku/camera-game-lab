# EXP-050 COUNTER CAM — device and human gates

Status: pending. Browser simulation is not a physical camera or first-use pass.

Run five 30-second rounds on a front-camera phone, including iOS Safari and
Android Chrome. Mount the phone securely; fully extended arms must not reach it.

| Gate | Observe | Acceptance |
| --- | --- | --- |
| First use | READY → actual punch → left/right head movements | No settings screen; a comfortable neutral reaches FIGHT in about 5 seconds |
| First ten seconds | Red warning → head moves → yellow target → punch | Player says or demonstrates that counter punches do more damage |
| Punch | Left/right arms and forward punches at different comfortable speeds | One event per extension, no lateral sway false hits; no need for maximum force |
| Dodge | Head/body moves at least 28% of shoulder width from attack's aim | Fist passes the old head location; parked dodges fail once robot re-aims |
| Guard | Both hands beside cheeks | Blocks without generating a counter |
| Distance | Approach phone or move hands outside frame | Too-close calibration does not start; active round pauses when too close |
| Recovery | Cover face, lose wrists, leave camera briefly, background the tab | Timer and attacks stop; recovery gives full new warning |
| Finish | Four counters; retract a fist for 0.5s; punch | Gauge consumed once, large effect and 240 damage |
| Creator | ORIGINAL / EFFECT / HIDE; temporarily lose tracking | Replay respects selected face mode; HIDE never reveals a raw fallback |
| Mobile performance | Play three rounds with BGM and SFX | Smooth warnings and visible fists; no hot-phone stalls, audible clipping or input delay |
| Clip save | Save and play downloaded clip on each phone | 7-second playable silent clip, correct result and face mode |

Record device/browser, setup time, detected/missed/false punches, input losses,
counter count, finish result, first-ten-second comprehension and comfort.
Tune thresholds from these observations before marking camera reliability accepted.

Lab Input Gates A–E are also pending: 9/10 deliberate inputs, <=1 false
activation in 30 seconds, 4/5 first-time players succeeding within seconds
with only on-screen guidance, automatic recovery and readable recovery hints.

## Intentional v0.1 limits

- Punch is unified rather than separately scored jab/straight.
- Only ROOKIE ROBOT. No duck/hook/uppercut/stamina/network play.
- Creator captures 8fps frames and saves a silent clip. Live BGM and SFX are
  separate; no recorder soundtrack license is offered to downstream users.
- Shoulder/face-size checks are screen-space heuristics, not measurements of
  arm reach or phone distance. The explicit distance instruction remains required.
