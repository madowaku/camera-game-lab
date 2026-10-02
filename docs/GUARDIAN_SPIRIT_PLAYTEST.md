# GUARDIAN SPIRIT: implementation and human playtest

Open `/#guardian`. Use a front camera on a phone over HTTPS, or a PC webcam on
localhost. Keep your head and both shoulders visible, with room for your arms.
The demo offers touch/keyboard controls and a tracking-loss button.

Implemented: pose input through the shared BodyInput lifecycle, four normalized
action events, a segmented camera composition, delayed WARDEN tracking, combat,
boss/ascension, loss recovery, synthesized feedback audio, victory capture,
four photo poses, PNG download, hidden photo UI, retry, Japanese/English UI and
local round receipts. The art is an original articulated Canvas vector rig.

Design uses the user-authorized
[UI UX Pro Max skill](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill/blob/main/.claude/skills/ui-ux-pro-max/SKILL.md).
The design-system query `immersive mobile action game` returned a retro pixel
style; it does not match this brief. The focused `futuristic sci-fi HUD` query
matched `hud-sci-fi-fui`, which informed fine lines, monochrome technical labels
and luminous spirit accents. Touch/focus guidance informed 48px buttons, 8px
gaps, visible focus, loading/cancellation states and reduced-motion support.
No runtime dependency on that skill is added.

## Automated evidence

`node --test test/guardianSpirit.test.js` covers summoning gates, frozen timers
and enemies during loss, interrupted recovery, gesture priorities/rearming,
body-motion rejection, same-side attacks, aim assistance, scoring, shield expiry,
boss immunity, ascension/victory/capture, time-outs and crop geometry.

Browser checks are recorded in `output/playwright/`; these and demo runs do not
establish human game feel or physical camera performance.

Verified on Chromium: 1440×900 desktop, 390×844 and 375×812 portrait, 844×390
landscape, and reduced motion. Canvas renders at each size without horizontal
overflow. Demo combat reaches boss/ascension/victory and auto-capture; all four
poses, hidden photo UI and a downloaded PNG were checked. The time-out path
also reaches PHOTO MODE. Tracking loss freezes the visible timer; touch return
waits three seconds, manual pause freezes it, and language/mode changes work.
The real PoseLandmarker model/WASM was exercised with a generated blank camera
stream: no player means STAND HERE, ending releases tracks, and permission
denial shows a retryable error. This verifies lifecycle/inference integration,
not human recognition, mask quality or physical gesture usability.

## Required human pass: not yet recorded

Run five camera rounds, with two or more unfamiliar people if available. Do not
explain gestures until recording which two of three basic actions they infer.
Use the result's export button for receipts; camera and demo rounds are separate.
After trying photo mode, retry/end/switch modes to flush its duration to storage.

| Round | Device / person | Actions understood unaided | Presence / following (1–5) | Amplification (1–5) | Completed | Voluntary photo / seconds | Another guardian wanted? |
|---|---|---|---|---|---|---|---|
| 1 | | | | | | | |
| 2 | | | | | | | |
| 3 | | | | | | | |
| 4 | | | | | | | |
| 5 | | | | | | | |

During one round, leave the frame, return, interrupt the recovery countdown,
then return again. Check enemy/clock freeze and a continuous three-second
recovery. Also check fingers are unnecessary, shield holds for one second,
front-camera mirroring matches the attacking side, WARDEN survives in the photo,
all four poses are different, and hidden UI is absent from the saved PNG.

Record low-light tracking, mask-edge artifacts, cropped arms and sustained
phone inference/frame rate. These require actual devices and people. Conclude
GO only after the v0.1 criteria are observed; do not infer it from passing tests.
