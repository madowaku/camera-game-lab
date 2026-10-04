# DON’T LAUGH physical playtest

Automated tests establish rules, browser paths and model integration. They do
not establish individual facial-expression accuracy or how funny the attacks are.

Pending hands-on gates:

1. Five normal rounds each on iPhone Safari, Android Chrome and a desktop webcam.
   Check startup permission, front-facing orientation, portrait framing and retry.
2. Hold neutral with different face shapes, glasses, facial hair and lighting.
   Talk, open the mouth and blink. Confirm no false loss from these alone.
3. Test a closed-mouth smile, a broad smile and genuine laughter. Confirm a short
   twitch survives and a sustained smile reliably loses. Tune threshold64 and
   smoothing55ms if needed; keep the 400ms hold and missing-frame protection.
4. Compare bird, enlarged nose, delay, self clones, text and sound. Confirm the
   last three seconds make the strongest moment. Check the learned group is
   helpful after repeated reactions without overclaiming predictive accuracy.
5. Lean outside frame, cover the face, introduce a second person, switch tabs
   and disconnect the camera. Check stopped time, stable recovery and mute.
6. In ORIGINAL/EFFECT/HIDE, inspect caught stills, replay and saved video. Check
   HIDE contains no real face. Confirm camera indicators stop on result and exit.
7. Save the silent CREATOR clip on devices that support MediaRecorder. Confirm
   unsupported devices still offer replay and keep the result usable.

MVP verification scripts are under `scripts/qa/dont-laugh*.js`; screenshots and
the encoded sample stay in ignored `output/playwright` and `output/dont-laugh`.
