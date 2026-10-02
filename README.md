# Camera Game Lab 📷🎮

Experimental web games where **your body is the controller**.

The lab is a shared input playground for camera-native game ideas: hand gestures, pinching, blinking, mouth input, body poses, rhythm actions, and more.

## LAB FEED — platform v0.1

The home screen is a portrait, vertically snapping feed: one experiment per
screen, swipe to discover, PLAY to launch. Games are registered
in `src/platform/experiments.js` with independent canonical IDs and lazy loaders.
Favorites, recent history and feed ordering stay on-device. FEED / EXPLORE,
JA / EN, sharing, input explanations and result RETRY / NEXT are shared by the shell.
No camera, microphone or MediaPipe model starts while browsing previews.

Existing links such as `/#duo`, `/#guardian`, `/#note-blaster`, `/#daitai` and
`/#watermelon` still open the corresponding game launcher. Game logic and local
metrics remain in the existing modules. New compatible games need one registry
entry to appear in discovery.

See [architecture, registry schema, compatibility and QA](docs/PLATFORM_V01.md)
and the [design system](DESIGN.md). Run `npm test`, `npm run build`, then
`npm run dev -- --host 127.0.0.1` to preview locally.

The [Expansion Blitz report](docs/EXPANSION_BLITZ_V01.md) records the two added
experiments, 138 tests, browser evidence and the remaining spec/human gates.

## EXP-004: BLINK HORROR

Look to escape; close both eyes to hide while the thing behind you retreats.
The 26-second round has deterministic rushes, audio proximity cues and explicit
tracking-loss pauses. A camera-free Space / hold-button demo follows the same rules.
Open `#/game/solo-blink-horror` from Feed or Explore. Results preserve camera/demo
provenance through RETRY, NEXT and SHARE. See [implementation and QA](docs/BLINK_HORROR_PROGRESS.md).
Physical-camera acceptance and human playtests are still pending.

## EXP-005: PINCH WORLD

Use your thumb and index finger as virtual tweezers: pick up a circle, carry a
square through a wall's gap, then place a triangle precisely. Only a fresh pinch
grabs; tracking loss gently drops without throwing. Touch/drag and arrow keys +
Space provide a camera-free demo. Open `#/game/solo-pinch-world` from Feed or Explore.
All three tasks lead to CLEAR, RETRY, NEXT and a source-labeled share result.
Physical mobile alignment, pinch reliability and game feel still need playtests.

## First playable: HAND BEAT v0.1

A ~15 second rhythm prototype using four hand inputs:

- ✋ OPEN
- ✊ FIST
- ✌️ PEACE
- 🤏 PINCH

The first goal is not a full game. It is to test whether camera input feels immediate, readable, fun, and shareable on a phone.

## EXP-002: FINGER GUN

A 15-second target-shooting spike. Point with your index finger, raise your thumb to arm, and fold it once to fire. The reticle follows the projected index-finger direction; hits score 100 points.

The round plays a 15-second excerpt of [8-bit Aggressive1 by もっぴーさうんど](https://opentracks.com/bgm/detail/1978) as background music. Its source, license, checksum, and edit details are recorded in [`src/assets/music/LICENSE.md`](src/assets/music/LICENSE.md). Vite inlines the encoded audio into the game bundle, so deployment does not expose a standalone MP3 asset.

## EXP-003: EAT / DON'T EAT

A 15-second face-input spike with 12 randomized items. Open your mouth for food and keep it closed for everything else. A short closed-mouth calibration runs before the game can start; mouth state is detected on-device with MediaPipe Face Landmarker.

The app supports Japanese and English. The selected language is saved in the browser.

## EXP-019: NOTE BLASTER

Open `/#note-blaster` to shoot notes with your voice. Enable the front camera
and microphone, then hold a comfortable "Do" for one second to set your own
reference pitch. Sing Do / Re / Mi / Fa / So to fire from your tracked mouth
onto the corresponding staff position. Hold a note to keep firing. The round
ends after 30 active seconds or three enemy breaches, and reports score,
accuracy, PERFECT rate and max combo. Twenty consecutive hits trigger a
five-second fever with larger piercing notes and doubled score.

Keys 1–5 and held touch buttons are available in the explicitly labeled practice
mode. Practice scores never update the voice high score. In voice mode the note
buttons play reference tones; they do not shoot. Sound effects are off by
default to keep speaker output out of the microphone. Missing face tracking,
interrupted audio or a hidden tab pauses gameplay; pause/resume, recalibration,
round cancellation and camera/mic teardown are available.

Camera and microphone need HTTPS or localhost. Audio and images are processed
on-device and never recorded or uploaded. MediaPipe's initial model/WASM load
requires a network connection. Physical camera alignment and voice usability
still need device playtesting; synthetic inputs do not establish game feel.
See [implementation and playtest notes](docs/NOTE_BLASTER_PROGRESS.md) and
the [original specification](docs/specs/EXP-019_NOTE_BLASTER_SPEC_v0.1.md).

## DUO ARCADE: EXP-020 TINY BOT DUEL

Open `/#duo` for the landscape two-player shell. Two faces share one front
camera: start on screen-left for P1 and screen-right for P2, close both mouths,
and hold still for calibration. Move your face gently left/right to move your
robot. Open your mouth once to fire; close it before firing again. Push the
other robot out of the ring, or reach the 30-second time limit.

Keyboard/touch controls work without camera permission. P1 uses A / D and
W / Space; P2 uses Left / Right and Up / Enter. Touch controls support multiple
simultaneous pointers. Face loss pauses the whole duel, retaining player slots;
pause/result also offers recalibration. Round metrics stay in localStorage
(`camera-game-lab-duo-rounds`, last 50 rounds), with camera and fallback rounds
marked separately. The development input overlay is hidden by default and its
toggle is omitted from production builds.

FACE RACER, ZOMBIE DUO and SKY DUEL remain queued behind the two-person camera
playtest gate. See [DUO implementation status and playtest checklist](docs/DUO_ARCADE_PROGRESS.md).
Run the five rounds using [Human Playtest Pass v0.1](docs/TINY_BOT_DUEL_HUMAN_PLAYTEST_PASS_v0.1.md).
The result's local playtest record includes round duration, recovery counts and
minimum inference FPS, and can download the browser's receipts as JSON.

## OUTCAM LAB: EXP-021 WATERMELON GUIDE

Open `/#watermelon` on a phone. The camera operator uses the rear camera and sees an AR watermelon the other player cannot see. Guide them by voice; a fast downward hand swing is tracked and graded HIT / CLOSE / MISS against the on-screen target. Three watermelons, 30-second cap. For desktop testing, tap the camera image to strike at that point.

This first OUTCAM prototype intentionally uses screen-space targets rather than floor-plane/depth anchoring. The research question is whether the camera-mediated information asymmetry is fun before adding heavier world tracking.

`EXP-021` here is namespaced under OUTCAM LAB; DUO ARCADE keeps its existing EXP-021 FACE RACER designation.

## EXP-020: GUARDIAN SPIRIT

Open `/#guardian` to summon WARDEN behind your mirrored front-camera image.
Sweep one hand to punch, extend an arm to shoot, spread both arms to shield,
and raise both hands with a full spirit gauge to defeat the boss. The active
round lasts about 30 seconds, followed by victory capture and a four-pose PHOTO
MODE. Photos are composed locally and can be saved as PNG, with or without UI.

The camera-free demo uses A / D (punch), S (shot), F (shield), W (ascension),
or the visible touch controls. Tracking loss freezes the round and requires
three seconds of continuous reacquisition. Camera/demo receipts and photo
metrics stay in localStorage. The existing EXP-020 TINY BOT DUEL is retained
separately; Guardian uses `EXP-020-GUARDIAN-SPIRIT` in its receipts.

See [specification](docs/specs/EXP-020_GUARDIAN_SPIRIT_SPEC_v0.1.md) and
[human playtest checklist](docs/GUARDIAN_SPIRIT_PLAYTEST.md).

## EXP-018: DAITAI HERO / だいたい勇者

Open `/#daitai` for a 30-second estimation battle with 12 fixed questions in
Japanese and English. Move your face left / right and hold briefly to answer.
For the center choice, move a little sideways and return to neutral. After an
answer, return to center before the next question. One-face calibration takes
three seconds; lost or multiple faces pause play. Tap, mouse and 1 / 2 / 3 keys
work without camera permission.

Results show score, accuracy, average / fastest response and max combo. See
[prototype progress and real-camera playtest notes](docs/DAITAI_HERO_PROGRESS.md).

## EXP-043: THE CAMERA IS IT

Point your phone to create the platforms for an automatic walker. Only the
framed world exists; a soft margin lets you recover disappearing ground.
Five stages move from looking ahead to framing two distant landing surfaces.
Open `#/game/outcam-the-camera-is-it` or `/#camera-is-it` from Feed or Explore.
Rear-camera background ON/OFF supports the same-rule comparison; drag and arrow
keys provide a camera-free demo. Each stage lasts 15–30 seconds, with CLEAR,
failed-stage RETRY and JA / EN. Camera and orientation require HTTPS or localhost.
See [implementation and five-session playtest gate](docs/CAMERA_IS_IT_PROGRESS.md).
Physical Android/iOS sensor checks and human playtests remain pending.

## Stack

- Vite
- MediaPipe Tasks Vision
- Vanilla JavaScript
- PWA via vite-plugin-pwa
- Cloudflare Workers Static Assets via Wrangler

## Local development

```bash
npm install
npm run dev
```

Camera access requires a secure context. `localhost` works for development; production should use HTTPS.

## Build

```bash
npm run build
npm run preview
```

Run the deterministic duo tracking and game-rule checks with `npm test`.

## Cloudflare deployment

This project is configured for **Cloudflare Workers Static Assets** in `wrangler.jsonc`.

Authenticate once:

```bash
npx wrangler login
```

Then deploy:

```bash
npm run deploy
```

Wrangler will publish the Vite `dist/` output to a Cloudflare `*.workers.dev` URL. Static asset requests are served directly by Cloudflare.

For a Cloudflare-flavored local preview after building:

```bash
npm run cf:dev
```

### Codex + Cloudflare

Cloudflare's current Codex setup supports a Cloudflare plugin with Skills and MCP access.

Inside Codex:

1. Run `/plugins`.
2. Install the **Cloudflare** plugin.
3. When a Cloudflare tool is first used, complete the OAuth flow in the browser.
4. Run Codex from this repository root so it can see `wrangler.jsonc`.

A useful first prompt is:

> Inspect this Vite/PWA project and its wrangler.jsonc. Verify it is correctly configured as a static SPA on Cloudflare Workers, run the build, authenticate if needed, deploy it, then report the deployed URL and any issues. Do not add a Worker script unless this app actually needs server-side logic.

## Privacy direction

Camera frames are intended to be processed on-device in the browser and are not uploaded by this app. MediaPipe Tasks may send performance/usage metrics as described by Google's MediaPipe privacy notice.

## Lab roadmap

1. HAND BEAT — gesture rhythm
2. FINGER GUN — finger-gun aiming / shooting
3. EAT / DON'T EAT — mouth-open decision game
4. BLINK HORROR — eyes-open / eyes-closed horror rule
5. PINCH WORLD — pinch / drag / release interaction
6. CRANE TACTICS CAM — pinch-and-carry tactical prototype

The reusable asset is the **body-input layer**, not any single game.
