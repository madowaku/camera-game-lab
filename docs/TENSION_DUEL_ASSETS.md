# Tension Duel court and audio assets

Acquired/generated 2026-10-10. Runtime assets are local files, with no hotlinking.

## Court surface

Generated with the built-in Imagegen (`image_gen`) tool, then resized/encoded
with Pillow. No painting/compositing by code. Court markings are canvas geometry
so they match the fingertip projection at every aspect ratio.

- Source PNG: `C:/Dev/AssetsShared/Generated/tension-duel/air-hockey-court-v1.png`
- Runtime: `public/artwork/tension-duel-court.webp`, 1280 × 720, 54,166 bytes.
- SHA256: `24679DB10A0688E2E62B8BBF1E57998DBBBD8C6A992B114A003134D7F2994EA5`
- Full prompt: [TENSION_DUEL_ARTWORK.md](TENSION_DUEL_ARTWORK.md#court-surface--2026-10-10).

## Music

**Loop03 / ループ03 — OtoLogic**, licensed under
[Creative Commons Attribution 4.0](https://creativecommons.org/licenses/by/4.0/).
Commercial game use is allowed with attribution, as confirmed by the
[OtoLogic license page](https://otologic.jp/free/license.html).

- [Track and download page](https://otologic.jp/free/bgm/short-loop01.html)
- Download: `https://otologic.jp/sounds/bgm/mp3-zip/Loop03-mp3.zip`
- Original archive: `C:/Dev/AssetsShared/Audio/OtoLogic/Loop03/Loop03-mp3.zip`
- Runtime: `public/audio/tension-duel/loop03.mp3` (350,017 bytes).
- Unmodified short loop from `Loop03/Loop03.mp3`; duration 16 seconds.
- SHA256: `46A1FDF849533D75AF96F772EFCC6B3E21A142A41567E8D64BFCB9160EBD84E9`
- Credit displayed in the game's How to Play: **BGM: “Loop03” · OtoLogic
  (CC BY 4.0)**, linked to the track and license. Playback loops at lower volume.

## Sound effects

[Kenney Impact Sounds](https://kenney.nl/assets/impact-sounds) and
[Kenney Interface Sounds](https://kenney.nl/assets/interface-sounds), both CC0,
allow free commercial use. Original licenses are retained under
`public/audio/tension-duel/licenses/`.

Selected from the existing shared library at
`C:/Dev/AssetsShared/Audio/SE/`. Transcoded OGG → mono 44.1 kHz MP3 (96 kbps)
using FFmpeg for Safari compatibility; no cuts or other edits.

| Runtime file | Original file | Purpose | SHA256 |
|---|---|---|---|
| `hit.mp3` | `kenney_impact-sounds/Audio/impactGeneric_light_000.ogg` | Finger net return | `4BE5CC9D0C1EA6A87036CC0CA344D77A3D4406AA213C7AFCB034559C399D2D53` |
| `wall.mp3` | `kenney_impact-sounds/Audio/impactMetal_light_000.ogg` | Rail bounce | `DA590ACE61489E5B9BE04AE1D526CF010B1BD3F8DCEB199371B9BF89B2BA9B00` |
| `point.mp3` | `kenney_interface-sounds/Audio/confirmation_001.ogg` | Goal / point | `EF0BB68DABFD45EE927CC06B8D9F5877257E89BA092A2E31968DC1EB7D95E239` |
| `start.mp3` | `kenney_interface-sounds/Audio/confirmation_002.ogg` | Start / result | `86DB77368E350A8289942EB548BD8146F0E421506CFE07DE1EC09F27377E6112` |

Credit is optional for CC0; the game's credits also link both Kenney packs.
Net tension changes playback pitch; wall effects play quieter than net returns.
The catch cue is softened, followed by an original procedural Web Audio spring
tone on release. Wider fingers give a lower, longer boing; narrower fingers give
a higher, shorter cue. This synthesized sound introduces no third-party asset.
The public music and SE total 369,944 bytes. The official platform's PWA caches
them after first play; browsing the catalog does not request the audio files.
Decoding starts only after a player gesture. Music runs only during active play and pauses on
missing hands, pause, backgrounding, result, or exit. Failed downloads/decoding
never block play; effects fall back to short synthesized tones.
