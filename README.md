# Camera Game Lab 📷🎮

Experimental web games where **your body is the controller**.

The lab is a shared input playground for camera-native game ideas: hand gestures, pinching, blinking, mouth input, body poses, rhythm actions, and more.

## EXP-048: PALM PONG

Two hands become mint and coral paddles. Keep a cooperative rally going for
30 seconds in landscape. Open `#/game/duo-palm-pong` or `#palm-pong`. Includes
two-hand front-camera tracking, swept front-face collisions, catch guides,
650ms re-serves, tracking-loss pauses, separate two-touch / WASD + arrows
practice, JA/EN, best rally, RETRY and challenge sharing. Imagegen cover art
and commercially usable OpenTracks BGM are recorded in
[the asset manifest](docs/palm-pong-assets.json). See
[implementation and verification](docs/PALM_PONG_PROGRESS.md) and
[the pending five-round human playtest](docs/PALM_PONG_PLAYTEST.md).

## EXP-047: TOY DRUM

Swing your hands down into four colorful toy drums. Pop, squash, burst!
Open `#/game/solo-toy-drum` or `#toy-drum`. The 30-second portrait round moves
from five seconds of free play through forgiving light cues, two-hand DOUBLE,
FEVER and a giant two-hand BAAAN finish. Includes JA/EN, camera-free touch or
D/F/J/K practice, measured results, RETRY/NEXT/SHARE, pause and tracking recovery.
Imagegen artwork and commercially licensed OpenTracks BGM are documented in
[the asset manifest](docs/toy-drum-assets.json). See
[implementation and verification](docs/TOY_DRUM_PROGRESS.md) and
[the pending five-round human playtest](docs/TOY_DRUM_PLAYTEST.md).

## EXP-046: BODY WINGS

Spread your arms and become the plane. Bank your shoulders left and right through
30 rings in a 30-second RING RUSH. Open `#/game/solo-body-wings` or `#body-wings`.
Generated toy wings attach to the segmented, mirrored live player; arms may relax
after takeoff. Includes camera-free arrows/drag/touch practice, JA/EN, combo BOOST,
fictional flight stats, CREATOR face modes and a six-second BEST FLIGHT replay.
Imagegen artwork and OpenTracks music provenance are in
[the asset manifest](docs/body-wings-assets.json). See
[implementation and verification](docs/BODY_WINGS_PROGRESS.md) and
[the pending five-round human playtest](docs/BODY_WINGS_PLAYTEST.md).

## LAB FEED — platform v0.1

The home screen is a portrait, vertically snapping feed: one experiment per
screen, swipe to discover, PLAY to launch. Games are registered
in `src/platform/experiments.js` with independent canonical IDs and lazy loaders.
Favorites, recent history and feed ordering stay on-device. FEED / EXPLORE,
JA / EN, sharing, input explanations and result RETRY / NEXT are shared by the shell.
No camera, microphone or MediaPipe model starts while browsing previews.

All 14 experiments besides SOFT SERVE now have illustrated entrances, three
game-specific actions, JA / EN how-to sheets and a single primary result with
measured stats, practice provenance, RETRY and sharing. HAND BEAT, FINGER GUN
and EAT / DON'T EAT also use illustrated gameplay cues. See the
[quality alignment pass and verification](docs/QUALITY_ALIGNMENT_PROGRESS.md).

The original 15-game lineup now uses generated key art in discovery and game entrances. HAND BEAT, EAT / DON'T EAT, TINY BOT DUEL and DAITAI HERO also use generated transparent gameplay sprites. OpenTracks music has shared BGM ON/OFF and round lifecycle handling; HAND BEAT keeps its timed beat and singing mode stays music-free. See [generated media, music licenses and verification](docs/GENERATED_MEDIA_PASS_V01.md).

Existing links such as `/#duo`, `/#guardian`, `/#note-blaster`, `/#daitai` and
`/#watermelon` still open the corresponding game launcher. Game logic and local
metrics remain in the existing modules. New compatible games need one registry
entry to appear in discovery.

Camera input now follows the [Reliability Matrix, Input Law and first-use gates](docs/CAMERA_INPUT_RELIABILITY_V01.md). FINGER GUN uses index-finger aim and a closed-to-open mouth trigger; palm/fist manipulation and four distinct canned gestures replace smaller finger inputs elsewhere. SOFT SERVE previews attachment immediately and confirms it with a short hold ring. Human Input Gates A–E remain pending.

See [architecture, registry schema, compatibility and QA](docs/PLATFORM_V01.md)
and the [design system](DESIGN.md). Run `npm test`, `npm run build`, then
`npm run dev -- --host 127.0.0.1` to preview locally.

The [Expansion Blitz report](docs/EXPANSION_BLITZ_V01.md) records the two added
experiments, 138 tests, browser evidence and the remaining spec/human gates.

## EXP-045: HANDY PALS

Your hands become two tiny dancers. Show both palms for an automatic pop and
high-five, move freely for six broad dance reactions, bring hands together for
a high-five or hug, then finish the 30-second toy with a pose and souvenir PNG.
Choose bear or bunny independently for each hand; no scoring or penalties.
Open `#/game/solo-handy-pals` or `#handy-pals`. Camera-free mouse/touch drag,
WASD/arrow keys, JA/EN, photo save/share, RETRY/NEXT and pause are supported.
Characters and cover were generated with Imagegen. Licensed OpenTracks BGM is
120 BPM. See [implementation and verification](docs/HANDY_PALS_PROGRESS.md)
and [pending device/human checks](docs/HANDY_PALS_PLAYTEST.md).

## EXP-016: NOTE EATER

Eat a note and make a tune. Move your face to choose among five pentatonic
shapes, open your mouth once per bite, and grow a backing groove over 30 seconds.
Open `#/game/solo-note-eater` or `#note-eater`. Camera-free drag/arrows and
tap/Space practice, JA/EN, YOUR MELODY replay, RETRY/NEXT/SHARE and the shared
CREATOR face modes/highlight replay are supported. No microphone or fixed song.
See [implementation and verification](docs/NOTE_EATER_PROGRESS.md) and the
[pending physical-device/human gates](docs/NOTE_EATER_PLAYTEST.md).

## EXP-004: BLINK HORROR

Look to escape; close both eyes to hide while the thing behind you retreats.
The 26-second round has deterministic rushes, audio proximity cues and explicit
tracking-loss pauses. A camera-free Space / hold-button demo follows the same rules.
Open `#/game/solo-blink-horror` from Feed or Explore. Results preserve camera/demo
provenance through RETRY, NEXT and SHARE. See [implementation and QA](docs/BLINK_HORROR_PROGRESS.md).
Physical-camera acceptance and human playtests are still pending.

## EXP-005: PINCH WORLD

Move your palm over a shape, close your fist to pick it up, then open your hand
to drop it in its matching socket. Carry the square through a wall's gap and
place the triangle. A fresh palm-to-fist edge grabs; tracking loss gently drops
without throwing. Touch/drag and arrow keys + Space provide a camera-free demo.
Open `#/game/solo-pinch-world` from Feed or Explore. The historical title and
route stay compatible. Physical camera reliability and the first-use gates still
need human playtests.

## EXP-030: GHOST TRAIL

Escape your past in a 30-second front-camera round. Your nose controls a bright
ring while 3 / 6 / 9 / 12-second echoes replay your stored positions. Three lives,
near-miss bonuses, stable tracking recovery, JA / EN, and shared RETRY / NEXT.
Open `#/game/solo-ghost-trail` or `#ghost-trail`; a touch / mouse / arrow-key demo
works without camera permission. See [implementation and QA](docs/GHOST_TRAIL_PROGRESS.md)
and the [five-round human playtest sheet](docs/GHOST_TRAIL_PLAYTEST.md).
Physical camera acceptance and the human playtest are still pending.

## EXP-035: FRAME SMUGGLER

Open `/#smuggler` for a 30-second, two-person camera game. One person films;
the other shows one hand carrying a virtual gem. KEEP it in frame, HIDE it
outside during four inspections, then bring it BACK. Select the front or rear
camera before starting. Edge departures count as hiding; unexplained tracking
loss does not. Results include score, inspections cleared, best hide time,
caught count and SWAP ROLES.

Camera-free touch/keyboard practice is labeled separately. Camera results offer
six human observations, local round records and JSON export. The real two-person
five-round gate is still pending. See the [specification](docs/specs/EXP-035_FRAME_SMUGGLER_SPEC_v0.1.md)
and [playtest checklist and verification](docs/FRAME_SMUGGLER_PLAYTEST.md).

## First playable: HAND BEAT input v0.2

A ~15 second rhythm prototype using four hand inputs:

- ✋ OPEN
- ✊ FIST
- ✌️ PEACE
- 👍 THUMB UP

The first goal is not a full game. It is to test whether camera input feels immediate, readable, fun, and shareable on a phone.

## EXP-002: FINGER GUN

A 15-second target-shooting spike. Show your face and index finger, then close your mouth for a short calibration. Point to aim and open your mouth: BAN! Close, then open for each new shot; holding your mouth open never repeats fire. Off-target shots count as misses, and hits score 100 points. Hand and face recognition share one front-camera stream; no microphone is needed. After tracking loss, close your mouth with both inputs visible before firing again.

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

## EXP-025: FALSE BRIDGE

Open `/#/game/outcam-false-bridge` (or `/#false-bridge`) to complete five little
worlds with everyday shapes seen through the rear camera. Set an empty background,
hold still for one second, align a shape, then tap LOCK. The clipped camera image
stays in the world while the character crosses or climbs; the last stage retains
a bridge while you add a pillar. No object recognition or model download.

Coverage, nearby spill and line angle provide forgiving GOOD / GREAT / PERFECT
feedback. Darkness, background movement or weak evidence offer LOOK GOOD? with
accept / retry. Demo mode uses draggable material, angle/size sliders and keys,
without requesting a camera. JA / EN, result sharing, RETRY and NEXT are supported.

Images stay in memory and are discarded on departure. Local completion receipts
contain measurements and camera/demo/self-judgment provenance, never images.
See [implementation and verification](docs/FALSE_BRIDGE_PROGRESS.md) and the
[five-session human playtest gate](docs/FALSE_BRIDGE_PLAYTEST.md). Physical mobile
camera quality and the fun of the interaction are still unverified.

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
For the center choice, nod down and look ahead again. After an
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

## EXP-044: SOFT SERVE

Swirl vanilla soft serve with one hand, choose your own height, then move the
cone sideways and eat it with your mouth before it melts or falls. Open
`#/game/solo-soft-serve` or `#soft-serve`. Three illustrated steps introduce
the action; shrinking guides, height rewards and repeated mouth approaches
carry a 20–40 second round. Mouse / drag / arrow keys and click / tap / Space
provide labeled camera-free practice. JA / EN, sound, pause, result breakdown,
RETRY and shared results are supported.

The launcher offers PLAY and CREATOR. CREATOR starts after choosing ORIGINAL,
EFFECT or HIDE and composes a 9:16 view. Auto Director keeps the final bite and
three seconds of reaction, then automatically creates standard (up to 15 seconds)
and seven-second videos. Failed rounds also produce clips. Replay, video saving,
file sharing and RETRY are available; recording and editing stay on-device.
The shared `src/creator/` modules use game events and Director Profiles.
See [Creator Mode v0.2 and verification](docs/CREATOR_MODE_V02_PROGRESS.md)
and [the pending five-play human check](docs/CREATOR_MODE_V02_PLAYTEST.md).

Hand and mouth tracking use one front-camera stream with MediaPipe. The initial
models require a connection; camera frames stay on-device. See
[implementation, verification and the five-round playtest sheet](docs/SOFT_SERVE_PROGRESS.md)
and [specification](docs/specs/EXP-044_SOFT_SERVE_SPEC_v0.1.md).
Physical-device tracking and human game feel remain unverified.

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
5. PINCH WORLD — palm / fist / open manipulation
6. CRANE TACTICS CAM — pinch-and-carry tactical prototype

The reusable asset is the **body-input layer**, not any single game.
