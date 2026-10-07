# Game music assets

## HAND SPELL (EXP-056)

- Track: [The maze of aqua](https://opentracks.com/bgm/detail/23061), by 蒲鉾さちこ.
- Official download form: https://opentracks.com/bgm/detail/23061/download,
  track 1. Acquired 2026-10-04; original kept only in ignored
  `output/music-sources/hand-spell/`.
- [Site license](https://opentracks.com/help/articles/license/) and
  [creator conditions](https://opentracks.com/creator/detail/418) checked
  2026-10-04: commercial game background use permitted. The creator prohibits
  reposting, redistribution, AI training/AI modification and major song
  alterations. Individual permission and credit are optional.
- Opening 30 seconds, 96 kbit/s stereo MP3, 44.1kHz, −20 LUFS / −2dB true
  peak target, 50ms fade-in and 1s fade-out. Original tempo, pitch and arrangement
  preserved, including throughout the three seal locks.
- Source SHA-256: `8CEEF402F49F214ED4D0A13DCC66C12A292C51A135CDD7D35A4D90D4CDA85C2A`.
- Bundled `hand-spell.mp3` SHA-256:
  `6E0F70FE17D5965B069D3CF37E40C9B749C7C4202EC9CE27C5F87BC1A380C2FD`.
- Dedicated lazy inline module, with BGM mute/pause/foreground/result/exit
  lifecycle. No standalone audio in public/dist, listening player or audio
  download. CREATOR exports are silent. Courtesy credit in the how-to sheet.

Exact acquisition and processing: [manifest](../../../docs/hand-spell-assets.json).

## TILT TURBO (EXP-053)

- Reuses the locally downloaded [8-bit Stage1 by もっぴーさうんど](https://opentracks.com/bgm/detail/1982).
- [OpenTracks license](https://opentracks.com/help/articles/license/) permits
  commercial game background use and editing; [creator terms](https://opentracks.com/creator/detail/55)
  follow that license. Rechecked 2026-10-04.
- Existing source/edit/checksums remain in `docs/opentracks-music.json` and
  `docs/tilt-turbo-assets.json`. Bundled SHA-256:
  `7C225F5848F0BC949E47083DB414913502D22535EBA08186BE37582F47A70972`.
- Plays only in the active race through shared MusicBed; follows BGM mute,
  manual/background pause, result and exit. Face loss does not pause the race.
- Lazy inline JS audio; no standalone MP3 in public/dist and no music download
  or listening feature. CREATOR replay and saved video contain no audio.

## PALM PONG (EXP-048)

- Track: [パステルハウス](https://opentracks.com/bgm/detail/1021), by かずち.
- Download: https://opentracks.com/bgm/detail/1021/download, track 1 (loop).
- [Site license](https://opentracks.com/help/articles/license/) permits commercial
  game background use and editing; checked 2026-10-04.
- [Creator conditions](https://opentracks.com/creator/detail/50) add no restriction
  relevant to this cooperative game; checked 2026-10-04.
- Source SHA-256: `4EA51334AAE039354E4D288A0A2B3123C28747B65FEE1914B8C0FD560EBE71EA`.
- Bundled `palm-pong.mp3` SHA-256:
  `92AB8AD38EE182E0311D59C0A668CD13FDB83E092E128EA1917712F8AB6C0727`.
- Opening 30 seconds, stereo MP3 at 96 kbit/s / 44.1kHz, normalized to −23 LUFS
  with −2dB true peak target, 50ms fade-in and one-second fade-out.
- Inlined into the lazy BGM JS module. No standalone audio file in `public/` or
  `dist/`, music download, listening feature, recording or creator export.
- Plays as a quiet background bed during the active round, including re-serves;
  follows BGM ON/OFF and stops for pauses, result and exit. Return notes and
  milestone sounds are original Web Audio synthesis.
- Original download is retained only in ignored `output/palm-pong/`.

Exact prompts, processing and asset paths: [manifest](../../../docs/palm-pong-assets.json).

## TOY DRUM (EXP-047)

- Track: [おもちゃの一日](https://opentracks.com/bgm/detail/7044), by いまたく.
- Download: https://opentracks.com/bgm/detail/7044/download (track 1, loop version).
- [Creator conditions](https://opentracks.com/creator/detail/273#terms-of-use):
  follows the site license; checked 2026-10-04.
- [OpenTracks audio-source license](https://opentracks.com/help/articles/license/)
  and [site terms](https://opentracks.com/help/articles/terms/): checked 2026-10-04;
  commercial game background use and editing are permitted.
- Source SHA-256: `02FAC4B3FAECAB606E55A6AD5A02815A5105F0935CF54E0D21D0870B73566A3A`.
- Bundled asset: `toy-drum.mp3`, SHA-256
  `95E257C3F90B3F05BB2E75404324273F3B94307210562E56234A70AFB90E71A3`.
- Edit: opening 36 seconds, stereo 96 kbit/s MP3 at 44.1kHz; -20 LUFS / -2dB
  true peak target; 50ms fade-in and one-second fade-out. FEVER plays at 1.18x.
- Delivery: inline encoded audio in a lazy JS module. No public standalone MP3,
  listening player, source download button or secondary creator-tool soundtrack.
- Original download stays in ignored local `output/music-sources/toy-drum/`.
  Courtesy credit appears in the game information/how-to sheets. Runtime song
  follows BGM ON/OFF, pause, result and exit. Percussion is original Web Audio.

Exact image and music provenance: [TOY DRUM manifest](../../../docs/toy-drum-assets.json).

## DON’T LAUGH (EXP-055)

Uses the existing commercially licensed **おもちゃの一日** by いまたく from
[OpenTracks](https://opentracks.com/bgm/detail/7044), originally downloaded for
TOY DRUM. The [creator conditions](https://opentracks.com/creator/detail/273)
follow the [site license](https://opentracks.com/help/articles/license/), checked
2026-10-04, which permits commercial game background use and editing. The same
inline lazy music module is reused; no extra standalone source is distributed.
CREATOR exports are silent and do not supply the track to secondary users.
Hashes and acquisition provenance: [manifest](../../../docs/dont-laugh-assets.json).

## BODY WINGS (EXP-046)

BODY WINGS uses the opening 30 seconds of the already downloaded **8-bit Stage1**
by もっぴーさうんど through the shared MusicBed. Source: [OpenTracks track 1982](https://opentracks.com/bgm/detail/1982).
The [creator profile](https://opentracks.com/creator/detail/55) specifies the site
license, checked again for this implementation. The
[audio-source license](https://opentracks.com/help/articles/license/) permits
commercial game BGM. Exact asset hash and source provenance remain in
`docs/opentracks-music.json`; no duplicate source download was needed.
BGM starts in the timed round and stops during pause, result and exit.
BEST FLIGHT is a silent visual replay: the OpenTracks track is not offered for
download, listening, or as a secondary music asset inside a creator tool.

## FINGER GUN

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

## EXP-060 HOOK! (2026-10-06)

Reuses **ぷかぷか / ゆうり**, [OpenTracks track 11821](https://opentracks.com/bgm/detail/11821)
and the existing `handy-pals.mp3` asset listed above. The
[source license](https://opentracks.com/help/articles/license/),
[site terms](https://opentracks.com/help/articles/terms/) and
[creator conditions](https://opentracks.com/creator/detail/204#terms-of-use)
were checked again on 2026-10-06. Commercial game background use and editing
are permitted. Original acquisition and hashes remain unchanged.
The shared music owner pauses on missing hands and manual pause, stops on
results/exit and plays at rate 1.16 during FEVER. Audio stays inline in the lazy
game music module; no separate download/listening feature is exposed.
Catch souvenirs are still PNG files with no audio. See the
[HOOK asset manifest](../../../docs/hook-assets.json).

## EXP-054 AIR SLASH (2026-10-04)

- Track: [イケイケな気分](https://opentracks.com/bgm/detail/11555) / ハヤシユウ.
- [Creator conditions](https://opentracks.com/creator/detail/59): follows the site license; checked 2026-10-04.
- [License](https://opentracks.com/help/articles/license/) and [site terms](https://opentracks.com/help/articles/terms/) checked 2026-10-04. Commercial game background use and editing are permitted under these terms.
- Asset: `air-slash.mp3`, first 20s, 96 kbit/s stereo, 44.1kHz; normalized to −20 LUFS, −2dB true peak target, 50ms fade-in and 2s fade-out.
- Source acquisition: official download form CSRF POST, track=1. Source retained only in ignored `output/air-slash/`.
- Runtime: inline audio data in the lazy music module; no standalone music download or listening feature. CREATOR exports are silent.
- Exact hashes, generation prompts and shared CC0 SFX sources: [AIR SLASH asset manifest](../../../docs/air-slash-assets.json).

## EXP-004 BLINK HORROR v0.2

Reuses **不穏ROOM / MAKOOTO**, [OpenTracks track 9957](https://opentracks.com/bgm/detail/9957).
The [site license](https://opentracks.com/help/articles/license/) and
[creator conditions](https://opentracks.com/creator/detail/258) were checked
again on 2026-10-04: commercial game background use is permitted under the
site-conforming conditions. Source and bundle hashes and existing audio edits
remain unchanged. BLINK uses a quiet 0.07 volume during RUN and mutes BGM
inside the locker and during the passing event; pauses, results and exit stop
music. Encoded audio is delivered through the existing lazy JS module, with
no standalone music download or listening feature. Courtesy credit is reachable
from the game's information/how-to sheet. Exact generated images, prompts,
shared Kenney CC0 SE and audio provenance: [manifest](../../../docs/blink-horror-assets.json).
