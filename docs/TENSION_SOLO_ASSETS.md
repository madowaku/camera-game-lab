# TENSION BREAK! artwork and audio

## Imagegen

Built-in `image_gen` tool, generated 2026-10-10. No CLI/API fallback.
Original: `C:/Dev/AssetsShared/Generated/tension-break/intro-v1.png`.
Runtime: `public/artwork/tension-break-intro.webp`, 1536×1024, encoded with
Pillow at quality 85; no painting or image compositing by code.
SHA256: `2EBC5D888BC5818D7ECB7AE0B05F0DCEF9AF945E5D1EB909E7EDFB7F1A120782`.
Full final prompt: [TENSION_SOLO_IMAGE_PROMPT.md](TENSION_SOLO_IMAGE_PROMPT.md).
Court surface reuses the existing Imagegen DUEL court with collision rails,
bricks, puck and net drawn from actual gameplay geometry.

## Licensed music and effects

Checked the official license sources on 2026-10-10. Reuse local DUEL audio;
no hotlinks, no new purchase, no duplicate audio owner.

- BGM: **Loop03 — OtoLogic**, [track](https://otologic.jp/free/bgm/short-loop01.html),
  [terms](https://otologic.jp/free/license.html),
  [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/).
  Commercial use is allowed with attribution. Credits are visible in both
  SOLO's How to Play and its platform information sheet. Original short loop,
  unchanged; lower playback volume. Runtime: `public/audio/tension-duel/loop03.mp3`.
- SE: **Kenney Impact Sounds / Interface Sounds**, CC0, with the original
  license files retained in `public/audio/tension-duel/licenses/`.
  [Impact pack](https://kenney.nl/assets/impact-sounds),
  [Interface pack](https://kenney.nl/assets/interface-sounds).
  Sources are in `C:/Dev/AssetsShared/Audio/SE/`.
- Recoil: the existing original procedural Web Audio spring tone.

Hashes, source archive paths and OGG→MP3 encoding details are retained in
[TENSION_DUEL_ASSETS.md](TENSION_DUEL_ASSETS.md). Shared files are not modified.
Music plays during active gameplay only; failures keep gameplay available.
OpenTracks' official terms were also reviewed, but no OpenTracks asset is added.
