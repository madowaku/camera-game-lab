---
version: alpha
name: CAMERA GAME LAB
description: A camera-native arcade discovered one experiment at a time.
colors:
  background: "#10120f"
  surface: "#1b1e18"
  text: "#f4f5e9"
  muted: "#a9b09e"
  primary: "#d7ff3f"
  border: "#363c30"
typography:
  sans:
    fontFamily: '"Yu Gothic", "Hiragino Kaku Gothic ProN", "Trebuchet MS", sans-serif'
  mono:
    fontFamily: '"Cascadia Mono", Consolas, monospace'
rounded:
  DEFAULT: "0.5rem"
  lg: "1.25rem"
spacing:
  section-gap: "2rem"
  page-max: "72rem"
components:
  button: {}
  card: {}
  dialog: {}
---

# CAMERA GAME LAB Design System

## Overview

### Creative North Star
A camera viewfinder meets a pocket arcade: one large, tangible gesture, one short challenge, one PLAY button. The signature is a bright cutout-like gesture inside quiet viewfinder corners.

### Product context and register
Consumer game discovery, primarily portrait phones at 360×800 and 720×1280, with desktop keyboard support. The October 2026 sprint brief is the product authority; README and existing games supply compatibility evidence. Global scope with Japanese and English support; no Japan-specific commerce or identity data. Product register throughout, expressive in previews and restrained in permissions and errors. No user research or native copy review is claimed.

Keep game names, FEED, EXPLORE, PLAY, RETRY and short arcade labels in English, as requested. Japanese explanatory copy is conversational and concise; privacy and failures use plain polite sentences. UI labels and accessible names follow the selected locale. Avoid social-network imitation, purple neon panels, dense science-fiction HUDs, engagement counters and decorative Japanese stereotypes.

## Colors
Runtime token ownership is `src/platform/platform.css` (`--pl-bg`, `--pl-surface`, `--pl-text`, `--pl-muted`, `--pl-accent`, `--pl-border`). Frontmatter mirrors those defaults. Experiment accent colors live only in `experiments.js` and become `--accent` on their surfaces. Existing game palettes remain game-owned. Use dark text on bright PLAY buttons. Focus and selected state must also use outlines, text or `aria-pressed`.

## Typography
Use local fonts to prevent loading shifts. Latin display: Impact / Haettenschweiler; Japanese display and body: Yu Gothic / Hiragino, then Trebuchet MS. Body starts at 16px; metadata is deliberately compact. Japanese prose has 1.7 line height, normal letter spacing and strict line breaking; no italic emphasis. Mono labels are for experiment numbers and technical decorative annotations, never long explanations.

## Layout
Feed owns its `100dvh` scrolling surface with full-height snap cards. Explore and games keep natural document scrolling. Header stays compact; feed artwork occupies remaining space above the title. Cards cap at 600px on desktop. Safe-area top, bottom and horizontal insets apply to the shell. Touch controls are at least 44px. Small-height/zoom layouts permit taller cards and proximity snapping so nothing is clipped.

## Elevation & Depth
Use borders and flat surfaces. A native dialog styled as a bottom sheet owns modal depth; its backdrop dims the scene. Toasts are fixed status announcements, never the sole copy of an error. No decorative glass panels.

## Shapes
Preview corners are squared. Buttons use an 8px radius; the info sheet uses 20px upper corners. Actions use simple glyphs in 44–48px controls with text tooltips/accessibility labels. Illustrations are inline SVG, distinct from game graphics.

## Components
PLAY is a wide solid primary button. Secondary actions are bordered or ghost; loading preserves button geometry and is announced. Hover changes surface/brightness; keyboard focus uses a visible outline; pressed state translates by 1px; disabled state lowers emphasis with a real disabled attribute.

Navigation is FEED / EXPLORE with active text and underline. Explore uses labeled search with explicit clear and IME-safe filtering, plus button filters. Shared dialog handles INFO and manual sharing. Shared toast handles favorite and sharing acknowledgments. Unknown routes and import failures have explicit recovery actions.

Motion uses short 160ms control transitions and slow, small preview gesture movements. Only the current and adjacent previews animate. Reduced motion disables animation and smooth scrolling. Native scrolling always owns the swipe.

## Do's and Don'ts
- Keep a single one-line instruction in the feed and move details to INFO.
- Preserve focus, location, language and result recovery consistently across screens.
- Never start sensors from a feed scroll, preview or page load.
- Never let fixed viewport sizing clip Explore, game controls or enlarged text.

## References
- [Frontend Design Premium](https://github.com/TryHand-Co-Ltd/frontend-design-premium): production behavior, Japanese layout and accessibility guidance; applied with the installed frontend-design skill.
- [UI/UX Design Library](https://github.com/justinhartman/ui-ux-design-library): reference index for mobile and interaction-design reading; no assets or book text copied into the product.

Behavior owners and verification are recorded in `docs/PLATFORM_V01.md`. CSS and this file change together when tokens change.
