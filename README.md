# Camera Game Lab 📷🎮

Experimental web games where **your body is the controller**.

The lab is a shared input playground for camera-native game ideas: hand gestures, pinching, blinking, mouth input, body poses, rhythm actions, and more.

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

## EXP-018: DAITAI HERO / だいたい勇者

Open `/#daitai` for a 30-second estimation battle with 12 fixed questions in
Japanese and English. Move your face left / right and hold briefly to answer.
For the center choice, move a little sideways and return to neutral. After an
answer, return to center before the next question. One-face calibration takes
three seconds; lost or multiple faces pause play. Tap, mouse and 1 / 2 / 3 keys
work without camera permission.

Results show score, accuracy, average / fastest response and max combo. See
[prototype progress and real-camera playtest notes](docs/DAITAI_HERO_PROGRESS.md).

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
