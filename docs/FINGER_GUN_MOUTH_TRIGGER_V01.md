# FINGER GUN — index-finger aim, mouth trigger

Updated: 2026-10-04 (Asia/Tokyo)

Point with the index finger to move the reticle. Open the mouth to shoot: BAN!
Close, then open for each subsequent shot. Target overlap alone never fires,
and an off-target mouth shot is recorded as a miss. A microphone is not used.

The first round waits for a closed-mouth calibration (700ms); calibration does
not spend the 15-second play timer. Mouth detection reuses FaceInput's
aspect-corrected lip ratio, filtering, hysteresis and 90ms state hold. Hand and
face models receive the same video frame/timestamp from a single BodyInput
camera owner, with inference capped at 20Hz. Partial initialization failures
close the hand model before the shared GPU-to-CPU retry; normal teardown closes
both models and the camera stream.

Missing hands, missing faces, long frame gaps and unavailable targets (including
unfocused/hidden pages) disarm the trigger. Returning while the mouth is open
cannot fire. Both inputs must be visible with the mouth closed before another
open action. A new target does not rearm an already open mouth.

Discovery input metadata, JA/EN entrances, instructions, calibration/recovery
prompts and BAN hit/miss feedback use these rules. Target overlap gives an
immediate reticle highlight rather than a timed lock. Compact in-game captions
keep the firing field clear. The previous AimLock helper is retained for its
independent tests, but FINGER GUN no longer consumes it.

Validation:
- npm test: 346 passed, 0 failed; 13 new mouth-trigger/model-ownership cases.
- npm run build: Vite and PWA succeeded.
- scripts/qa/input-reliability.js: 98 browser checks, no page errors or failed
  resources. Verified closed-mouth preparation, aim without auto-fire, deliberate
  shots, held-mouth suppression, misses, hand/face recovery and model/stream
  teardown; JA/EN at 390x844, 360x500 and 1440x900. Existing HAND BEAT and SOFT
  SERVE flows were also checked by the same harness.

The browser fixture substitutes model output and a synthetic MediaStream.
Physical camera accuracy and human Input Gates remain unverified. This local
change has not been deployed to the public site.
