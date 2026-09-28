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
