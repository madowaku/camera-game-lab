# DUO ARCADE UI / UX references

Updated: 2026-10-02 (Asia/Tokyo)

Use [UI UX Pro Max](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill/blob/main/.claude/skills/ui-ux-pro-max/SKILL.md)
as a review reference alongside the project's real-browser QA. Current guidance
comes from its priority table and
[quick reference](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill/blob/main/.claude/skills/ui-ux-pro-max/references/quick-reference.md),
not from running its design-system search engine. Apply web guidance to this
Vite/vanilla-JavaScript PWA; native app point/dp rules are not interchangeable
with web CSS pixels.

## Applied

- Language and game-mode controls have a minimum 44 CSS-pixel height, including
  the compact landscape mode chooser. Language controls have a minimum width
  of 44 pixels too.
- Portrait duel controls retain a 44-pixel minimum width and an 8-pixel gap.
- Front-camera errors explain the failed operation and provide retry / touch
  alternatives. Error text was checked in JA / EN using a simulated failure.

## Review priorities

- Keep P1/P2 labels, readiness and loss states understandable without color.
- Keep keyboard focus visible and icon-only controls named for screen readers.
- Keep startup loading feedback visible; preserve a clear recovery action.
- Preserve the 800×360 playing layout and safe-area spacing when adding controls.
- Check touch targets and text reflow in portrait and landscape after changes.
- Preserve the current arcade visual language; apply recommendations according
  to the game and its players.

## Verification

Browser review used the committed camera fix plus these CSS changes, excluding
other games under development in the shared workspace. At 800×360 and 1280×720,
language and mode buttons measured 44 pixels high. At 375×844, portrait duel
buttons measured about 46×46 pixels and the document had no horizontal overflow.
The 800×360 countdown/play layout fit the viewport without scrolling. A fallback
30-second round and rematch worked, with no browser console errors or warnings.
