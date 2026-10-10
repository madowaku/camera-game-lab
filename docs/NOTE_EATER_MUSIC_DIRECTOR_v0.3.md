# EXP-016 NOTE EATER: Music Director v0.3

Status: implementation candidate (not yet accepted on A401OP or iOS)
Branch: `feat/note-eater-music-director-v03`
Scope: Make the music worth hearing twice without changing the mouth controls or the no-punishment rule.

## Design change

The old result replay used every eaten pitch in order but discarded the original
playing rhythm and most of the accompanying music. Its fixed two-chord backing
pattern also made repeated rounds sound similar.

The new **YOUR SONG** result player reconstructs a 30-second arrangement from the
actual `melody[].at` (millisecond timestamps) and pitches stored by the game.
Only the replay timestamps receive 22% soft grid alignment (1/16-note grid).
The *live bite* remains immediate and unquantized.

The song is deterministic, so the same input yields the same output; no network,
AI music service, account, or paid asset is needed.

## Arrangements

| Style | Character | Layers |
| --- | --- | --- |
| DREAM | clear, gentle, airy | C6/Am7/Fmaj9/Gsus pads, quiet bass, bell answers |
| POP | playful and rhythmic | chord plucks, syncopated bass, kick/clap/hat, fills |
| FESTIVAL | bold celebration | brassy stabs, driven percussion, bass and clap rolls |

Four sections occupy fourteen bars at 112 BPM (~30 seconds):
INTRO (4 bars), GROOVE (4), CLIMAX (4), FINALE (2).
The last bar lands on C with a distinct resolution. Each style shares the same
player-authored lead pitches and their order. Call-and-response notes are placed
only inside gaps of at least 1.15 seconds, up to nine responses per song.

The live backing also gains a C6–Am7–Fmaj9–Gsus progression and quiet harmony
at low GROOVE instead of waiting for high GROOVE to reveal chords. It still
starts after the tutorial countdown, remains non-scoring and runs at the
original NOTE EATER 110 BPM.

## User-visible behavior

- Result screen has DREAM / POP / FESTIVAL arrangement buttons.
- Selecting a style during playback restarts the song in that style.
- The note sequence canvas places symbols according to original bite times.
- PLAY/STOP works in all three styles. Unmount/visibility-change cancels sound.
- Old receipts missing `at` can still be played with an even fallback timeline.
- The original `NoteEaterAudio.playMelody` remains for regression comparison.

## Evaluation and rollout gates

1. `npm test` and `npm run build` on the branch; browser practice and
   camera QA after CI. Existing input reliability tests must remain green.
2. A401OP Chrome: five actual 30-second play sessions using speakers and,
   separately, headphones. No acoustic crackling or stalled UI.
3. Listen blind to an identical note sequence in the original player and three
   new arrangements. At least two of three listeners should prefer one of the
   new arrangements. Record which style, not just a success mark.
4. Test a sparse session (five bites), a normal session and a busy session
   (30+ bites). Sparse sessions should still sound intentionally arranged;
   busy ones should not clip or drown out player notes.
5. Tap STOP, switch arrangements, hide tab and navigate away while playback is
   active. Future scheduled notes must not leak through.
6. Test Japanese and English, 360×800 and 390×844, low volume, silent
   preference and reduced-motion setting.

These are acceptance targets, **not yet measured results**.

## Follow-up, not in this PR

- Preview source-versus-arranged A/B directly without launching another round.
- Proper instrument samples / more polished percussion if synthesis remains
  harsh on phone speakers.
- Creator Mode export with the generated arrangement mixed into a replay video.
- Shareable downloadable audio (requires export and privacy UX).
