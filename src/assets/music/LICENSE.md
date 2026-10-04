# FINGER GUN music asset

- Track: [8-bit Aggressive1](https://opentracks.com/bgm/detail/1978)
- Creator: もっぴーさうんど (Moppy Sound)
- Source download: https://opentracks.com/bgm/detail/1978/download
- Creator's condition: follows the OpenTracks site license
- License: https://opentracks.com/help/articles/license/
- Downloaded: 2026-09-29
- Downloaded source SHA-256: `D348C102172E269DC4D9ABEA607E85EC1B5369662934B56F11633777825EFAB8`
- Bundled asset: `finger-gun-theme.mp3`
- Bundled asset SHA-256: `8ECEEDC05BF0A30D844C94B1CF3C1D6B9B0CCC74161A8128B988DD1FE3E520B2`
- Edit: the opening 15 seconds, stereo MP3 at 128 kbit/s, with a 0.75-second fade-out at the end
- Use: background music during FINGER GUN gameplay; the track is not offered as a download or music player

OpenTracks permits this track as background music in a game under its audio source license. The license does not require attribution; the game links to the track as a courtesy. Keep the music bundled with the game and do not redistribute the audio by itself.

## Shared game music added 2026-10-03

| Asset | Track / creator | Source | Creator conditions | Edit |
| --- | --- | --- | --- | --- |
| stage-one.mp3 | 8-bit Stage1 / もっぴーさうんど | [OpenTracks](https://opentracks.com/bgm/detail/1982) | [Site-conforming](https://opentracks.com/creator/detail/55#terms-of-use) | First 63.7s, 96 kbit/s stereo, normalized to −20 LUFS, 0.3s fade-out |
| milk-pudding.mp3 | みるくぷりん / キュス | [OpenTracks](https://opentracks.com/bgm/detail/16072) | [Site-conforming](https://opentracks.com/creator/detail/433#terms-of-use) | First 48s, 96 kbit/s stereo, normalized to −20 LUFS, 0.6s fade-out |
| uneasy-room.mp3 | 不穏ROOM / MAKOOTO | [OpenTracks](https://opentracks.com/bgm/detail/9957) | [Site-conforming](https://opentracks.com/creator/detail/258#terms-of-use) | First 85s, 96 kbit/s stereo, normalized to −20 LUFS, 0.4s fade-out |

Commercial game BGM and audio editing are permitted under the [OpenTracks audio-source license](https://opentracks.com/help/articles/license/). All three creator profiles were checked on 2026-10-03 and specify the site license. Credits appear in the game information and how-to sheets. Exact source and bundled SHA-256 hashes, processing settings and verification dates are in [the provenance manifest](../../../docs/opentracks-music.json). Source downloads stay in ignored local output, not public assets. Runtime music is bundled as inline data inside lazy game JS, with no standalone music file, download or listening feature.

HAND BEAT keeps its own timed beat. NOTE BLASTER uses music in practice mode only, so microphone input cannot hear and shoot the background track. Music stops during pause, tracking loss, results and navigation.

## EXP-045 HANDY PALS

- Track: [ぷかぷか](https://opentracks.com/bgm/detail/11821), 120 BPM.
- Creator: ゆうり (Yuli Audio Craft).
- Download: https://opentracks.com/bgm/detail/11821/download
- [Creator conditions](https://opentracks.com/creator/detail/204#terms-of-use): site-conforming; checked 2026-10-03.
- [OpenTracks audio-source license](https://opentracks.com/help/articles/license/): commercial game BGM and editing permitted; checked 2026-10-03.
- Source SHA-256: `AD6F181AA136764C4D9D864A7546621520F17584A1C6584882643B0D203C0C9B`.
- Asset: `handy-pals.mp3`, SHA-256 `025D394036181B45A61F545DB55708E37CDD0B6042454BD3748648D6B4305140`.
- Edit: first 30 seconds, 96 kbit/s stereo MP3, 44.1 kHz; −20 LUFS normalization, −2 dB true peak target; 50 ms fade-in, one-second fade-out.
- Delivery: inline audio in the lazy BGM JS module, with no standalone MP3 in public/ or dist/. The source download stays in ignored local output.
- Use: background music for the hand toy. No standalone listening or music download feature. The souvenir is a still PNG and contains no soundtrack.

The song starts after the automatic greeting, follows the shared BGM switch and stops on pause, results and departure. Brief hand-tracking loss keeps the toy and background music running. Exact provenance is in [the HANDY PALS manifest](../../../docs/handy-pals-assets.json).
