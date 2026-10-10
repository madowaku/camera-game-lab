# EXP-053 TILT TURBO v0.2: AIR WHEEL

Status: implementation branch, **Android A401OP real-hand acceptance pending**.
Route: `#/game/solo-tilt-turbo`. v0.1 HEAD control remains available as a selectable fallback.

## Play promise

Turn an invisible wheel with two hands, overtake moving toy cars, and replay a
20-second sprint across three visually distinct courses. Don't require perfect
hand poses, pinches or grips: use two **palm centers**, separated horizontally.
The game's steering wheel rotates visibly in the camera panel. A parked phone
or stand is recommended for two-handed steering.

## Controls / implementation

- AIR WHEEL is the default front-camera mode. Uses one MediaPipe HandLandmarker
  with `numHands:2`, never a second face model in parallel. The shared
  `BodyInput` camera lifecycle handles permission, GPU->CPU fallback and cleanup.
- The two observed palm centers are sorted in **unmirrored video coordinates**.
  Their pixel-aspect-correct connecting-line angle is flipped once to match
  the mirrored preview. Hand array order is not a persistent ID and is not
  relied upon. A too-close/vertical/invalid pair yields no steering input.
- Start with both palms in frame and spread apart, hold roughly 650 ms to
  establish neutral, then rotate gently. Existing `TiltSignal` supplies the
  identical deadzone, 70ms smoothing and freshness policy. The old 450ms
  centered-loss response remains. No camera capture is sent to a server.
- `HEAD TILT` is a visible alternative, not silently activated after lost
  hands. Practice retains keyboard A/D, arrows, tap/hold left/right.
- Mode/course/car are selected before racing in the garage. Restart uses the
  selected options. The real camera is opened only when PLAY begins.

## Course / car matrix (first playable scope)

| ID | Course | Character |
| --- | --- | --- |
| toy-town | おもちゃタウン | Original curves and cones, now with moving cars |
| seaside | サンセット海岸 | Gentle shoreline bends and pastel palette |
| neon | ネオン高速 | Faster alternating S-bends and neon setting |

| ID | Car | Handling |
| --- | --- | --- |
| roadster | ロードスター | Classic response 110ms, 650ms hit penalty |
| kart | ミニカート | Faster steering, wider travel, 750ms hit penalty |
| van | ボックスバン | Slower response, narrow travel, 500ms hit penalty |

Each course supplies deterministic curve knots, cone locations and moving traffic.
Traffic travels along the same course at a lower forward speed. At the
scheduled passing point, the lateral gap determines collision (bonk + cooldown),
close pass, or clean pass. Successful passes are worth **150 points**; close
passes also award the existing 100-point NEAR bonus. All rivals are CPU
traffic, **not** remote players, ranked opponents or a full car racing AI.

No online matchmaking, 3D driving simulation, upgrade economy, physics-based
grip, multiplayer rankings, variable round duration, brake or throttle for v0.2.
The fixed 20-second finish, special final jump, CREATOR replay and score rules
(other than overtaking bonus) remain. Distance scoring is still tied to the
existing game clock model, not actual road meters.

## Important UX and verification gates

1. Run `npm test && npm run build`. This includes existing head-baseline tests
   and deterministic wheel, garage and overtaking tests.
2. On a 360x800 Android portrait screen, ensure the start button remains
   visible without scrolling. In the expanded garage, intentionally allow
   scrolling to choose a track.
3. Test 10 real AIR WHEEL starts on A401OP: two palms enter frame, neutral
   appears, turning left moves left and right moves right; especially check
   mirror direction, lamp reflections, camera occlusion and horizontal span.
4. Test alternating 5 rounds/head vs 5 rounds/hands. Record detection losses,
   input delay, comfort, and whether the user would voluntarily replay.
5. Check HIDE mode prevents raw video in exported CREATOR clips. ORIGINAL/EFFECT
   intentionally show the camera feed; clips stay local unless manually saved.
6. If hands drop on a phone held by the player, instruct use of a stand or
   fall back to HEAD TILT; **do not** quietly promote stale one-hand motion.
7. Check both phone portrait and tablet/desktop, reduced motion, pause and
   tab background, permission denied, no stream leaks, quick retry and JA/EN.
8. Do **not** call camera quality or first-try playability proven until real
   hands-on phone tests have passed. Current automatic tests establish only
   deterministic logic and build-level compatibility.

## Next design questions after real play

- If one hand holding a phone makes AIR WHEEL inaccessible, evaluate
  a one-hand wheel or touch-wheel hybrid rather than demanding a stand.
- Keep traffic as moving hazards until passing feels fun; only then add
  position ranking, rival personalities, a chasing camera or long championship.
- Auto Director should prioritize clean passes, close calls and final sprint.

## A401OP first hands-on follow-up (2026-10-10; post-PR preview)

Player feedback from actual phone use: AIR WHEEL feels substantially more like
steering, but hands needed to be raised near face height, and narrow roads made
mistakes dominate the fun. Prioritize physical comfort and a playful road first.

Changes in this PR after initial A401OP preview:

- **Camera framing / chest-height steering**: no minimum hand Y coordinate was
  ever enforced by `wheelRoll`. This is a **field-of-view** issue. During
  hand-camera calibration, show a large mirrored live view (PLAY and visible
  CREATOR modes only), count 0/1/2 detected hands, and coach the player to
  tilt the phone downward / move it back so hands at the solar-plexus height
  are in frame. Never falsely claim out-of-frame landmarks can be detected.
  In CREATOR HIDE, never reveal raw camera images even during calibration.
- **Road width vs collisions**: `roadHalf` is per-course and feeds **both**
  road polygons and authoritative wall collisions. Original width .83.
  Starter Toy Town **1.13 (+36%)**, Sunset Coast **1.05 (+27%)**,
  Neon Express **.88 (+6%)** for an optional tighter challenge.
- Same 20 second race, steering thresholds, score physics and head fallback;
  no added inference or new MediaPipe models. Framing view switches off
  at countdown; the camera itself is used for recognition throughout.

**Important**: the original immutable Cloudflare Version URL starting with
`8136f641` is a prior commit, so it DOES NOT automatically contain these
changes. Upload a **new version preview**, verify its commit/version IDs, then
run real A401OP checks before merging the draft PR or touching production.

Second-playtest checklist: (1) place phone on stand, adjust tilt so both hands
are visible at mid-chest height, (2) 3 starts without raising arms, (3) compare
Toy Town wide road versus Neon narrow course for hits/comfort, (4) verify
HIDE never shows camera pixels, (5) record comfort, false hand-loss, and
whether moving traffic now feels exciting rather than punitive.
