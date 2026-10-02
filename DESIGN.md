# Camera Game Lab design

## Purpose
Short camera experiments should become understandable by doing. The camera and body input are the main play surface. TENSION DUEL's distinctive interaction is an elastic membrane between real fingertips.

## Existing visual language
Retain the dark lab shell, shared `.button`, `.button--primary`, `.language-switch`, `.mode-switch`, and `.howto` owners in `src/style.css`. Do not redesign sibling experiments for a new route.

## Runtime tokens
`src/style.css` owns the existing application palette: background #0b0d10, foreground #f4f7fb, muted #8d97a5 and shared system typography. TENSION DUEL's local tokens are declared once on `.td-shell` in `src/tension/duel.css`: P1 #7be4ec, P2 #ffbe86, ball/foreground #fff9ed, arena #101c25. P1/P2 text accompanies color. System sans-serif remains Japanese capable; numeric scores use tabular figures.

## TENSION DUEL layout and behavior
- Route: `#tension-duel`; name disambiguates the previously used EXP-021 IDs.
- Intro: one C illustration, one action sentence, camera start as primary and a clearly labeled camera-free alternative.
- Ready: live fingertip nets, separate P1/P2 presence indicators, three brief tips over three seconds after both hands are ready. Tips can be skipped.
- Play: only scores, remaining time and small player readiness indicators. No large instructions over a live ball. Brief loss preserves the net for 250ms; longer loss freezes both ball and timer until both hands return.
- Result: winner, score, return count, best rally, retry and back. Retry reuses the running camera.
- Camera error: permission/connection recovery text, retry and camera-free alternative. Initialization is bounded to 25 seconds.
- Landscape is preferred; portrait preserves all actions and offers a short rotation hint. Controls wrap rather than overflow.
- Drag controls have native range and keyboard alternatives. All actions use buttons. Focus is visible; reduced motion removes optional movement effects.

## Canonical owners
| Capability | Canonical owner | Source of truth | Allowed variants | Verification |
|---|---|---|---|---|
| Camera lifecycle | BodyInput / FrontCamera | src/input/bodyInput.js | two-hand DuelInput | existing camera tests + synthetic smoke |
| Locale | main.js / i18n.js | locale switch | experiment copy in tension/messages.js | JA/EN browser checks |
| Navigation | selectMode | src/main.js | #tension-duel | route / exit browser checks |
| Controls | shared button CSS; native range | src/style.css | tension-scoped layout/focus | keyboard / mobile checks |

## Verification scope
Project-owned rule tests and a production build are required. Browser tests cover simulated rounds, restart, translation, mobile layout and failure recovery. Real hand recognition, Android performance and initial two-person usability require hardware/human playtests and must not be inferred from simulation.
