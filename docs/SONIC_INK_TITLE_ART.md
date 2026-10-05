# SONIC INK title artwork

Generated 2026-10-06 with the built-in ImageGen tool, using the imagegen skill.
Final asset: `public/artwork/sonic-ink-title-v1.webp`.
Original local copy: `output/imagegen/sonic-ink-title-v1.png` (ignored).

The portrait key art is used behind real HTML title and launch controls in
`src/sonicInk/presentation.js`, and as the shared discovery artwork through
`src/platform/artworkAssets.js`. The artwork contains no text or baked-in
buttons. Title and controls remain accessible and localized in JA/EN.
The runtime file is a resized WebP conversion of the selected generated image;
the illustrated content is unchanged.
The WebP is 864 × 1535 pixels, approximately 76 KB. The source is 941 × 1672.

Verification: production/PWA build succeeds, all 508 unit tests pass, and all
22 checks in `scripts/qa/sonic-ink-title.js` pass. Checked title layouts at
1440/390/360px, JA/EN, live how-to and practice controls, drawing after launch,
feed/explore image loading, legacy URLs and no uncaught page errors.
Screenshots: `output/playwright/sonic-ink-title-*`.

## Final generation prompt

```text
Use case: stylized-concept.
Asset type: production key art for the title screen of SONIC INK, a front-camera game where pinching your fingers draws three-dimensional glowing lines that become music.
Primary request: A beautiful, adorable, polished 3D sound-toy illustration that feels joyful and inviting, with an elegant pastel stationery and glass-candy aesthetic.
Scene/backdrop: a dreamy pale lavender and blush atmosphere, with soft ivory light, subtle pearlescent haze, and real depth. Fill the entire portrait image; no frame.
Subject: one large, delicately hand-drawn heart made from a continuous luminous glass ribbon suspended in space, rose pink blending into lavender and mint; a small luminous five-petal flower and two glass musical notes floating nearby. A bright white pearl of light rests on the heart's line as its musical play head. A few tiny four-point golden sparkles convey the sound coming alive.
Materials: softly rounded translucent iridescent glass tubes, beautiful internal glow, fine white highlights, gentle bloom and soft ambient shadows. A high-end playful 3D illustration, sculptural and tactile, not flat vector art.
Composition/framing: vertical 9:16 game-title artwork, carefully balanced, entire central sculpture visible. Keep the main heart and notes in the middle 50% of the image. Leave the top 23% gently illuminated and visually calm for a real HTML title to be overlaid; leave the bottom 22% simple and calm for real PLAY buttons. Essential shapes should remain recognizable in a center square crop for a discovery-card thumbnail.
Lighting/mood: airy, sweet, creative, quietly magical; soft studio lighting and a warm luminous glow. Attractive at small phone size. Avoid harsh neon, excessive sparkle or dark sci-fi.
Color palette: milky ivory, blush rose, lavender, pale mint, and tiny butter-yellow highlights.
Text: no letters, no words, no logo, no UI buttons, no watermarks. The game title and interactive controls are added by the application. No people, no hands, no device mockup, no photographic room.
```
