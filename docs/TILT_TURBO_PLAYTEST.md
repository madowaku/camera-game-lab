# EXP-053 TILT TURBO — human playtest gate

Status: **Pending human observation and physical-device validation.** Synthetic
landmarks, blank-frame model inference and browser automation do not pass this gate.

Open `#tilt-turbo` on an HTTPS host or localhost. Use the front camera with the
phone resting comfortably. Run five people, or ten rounds by one person for a
first comfort/response study. Use modest tilts; 25° already gives full steering.
Results show face-loss episodes and maximum tilt. A/D, arrows and screen halves
are camera-free development inputs and do not count toward camera acceptance.

Give no spoken steering instructions before their first play. Observe whether
the initial 650ms neutral calibration plus 1.35s live preview communicates
“my head is the wheel.” The 900ms 3–2–1 follows automatically. Model loading and
permission time are separate from this interaction.

| Round | Person/device | First-use understood within 3s | Face/car direction feels right | Neck comfortable | Face losses | Mistook recognition for own error | Spontaneous retry | Score/HIT/NEAR/max tilt |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | | | | | | | | |
| 2 | | | | | | | | |
| 3 | | | | | | | | |
| 4 | | | | | | | | |
| 5 | | | | | | | | |
| 6 | | | | | | | | |
| 7 | | | | | | | | |
| 8 | | | | | | | | |
| 9 | | | | | | | | |
| 10 | | | | | | | | |

Acceptance:

- A: at least 80% of first-time players understand steering without explanation.
  Repeated rounds by one person cannot establish first-time comprehension.
- B: fewer than one face-loss episode per 20-second round on average.
- C: at least three of five people independently choose to retry.
- D: a viewer can infer the controls from an ORIGINAL CREATOR clip alone.

Check phone roll compensation, portrait front-camera mirroring, ±5° jitter,
gentle 10–20° turns, 25° saturation, quick final bends, loss/recovery,
tab background/resume, camera denial, retry, and scene exit. Check iOS Safari
and Android Chrome, ORIGINAL/EFFECT/HIDE, and supported silent clip saving.
A sustained loss must show FACE HERE and ease the car centrally without stopping
the race; returning should immediately restore steering with the same baseline.

Record first successful movement latency, subjective steering lag and fatigue.
Track whether the final five seconds create a visible sequence of reactions.
Document whether the curvature and bonk recovery feel forgiving enough before
tuning the dead zone, smoothing or course. Store no participant camera images
without their own explicit choice to save a clip.
