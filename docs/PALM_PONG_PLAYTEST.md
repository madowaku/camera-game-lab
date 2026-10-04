# EXP-048 PALM PONG — Human Playtest

Status: **not performed**. Synthetic/browser QA does not establish hand detection
accuracy, two-person participation, physical-device support or game feel.
First target: Android A401OP / Chrome, two people, front camera, fixed landscape
phone. Each round lasts 30 active seconds. Do not claim iOS/other-device support
until those devices have been tested.

| Round | Setup | Observe | Result |
| --- | --- | --- | --- |
| 1 | First use, indoors | Without added instructions, 4 returns in the first 10 seconds? | Pending |
| 2 | Same pair retries | Reach 8 rallies; talk to each other and anticipate the ball? | Pending |
| 3 | Intentionally center/edge catches | Understand the different angles; visible contact matches collision? | Pending |
| 4 | Hide one hand; cross slightly | Pause without blame; preserve colors, rally, receiver and remaining time? | Pending |
| 5 | Adjust distance and camera framing | Small chest-to-face-height motions suffice; no large swing needed? | Pending |

For each round record date, browser, device, lighting, distance and framing,
longest rally, total returns, P1/P2 returns, misses, visible-but-missed contacts,
lost-tracking pause duration, observed inference FPS, willingness to retry,
and whether a spectator understands cooperative ping-pong in five seconds.
Do not persist camera frames or landmark history. Game records store only
aggregate counts and settings; observation notes are manual.

Provisional exploratory gates: both players make at least 3 returns in 4/5
rounds; reach 8 rallies by the second round; no extra gesture explanation;
spectator recognizes cooperative ping-pong; at most 2 visible contact failures
across all 5 rounds. These are small-sample checks, not population evidence.

Separate control: leave two hands centered and stationary. Investigate if
10+ rallies persist. The unchanged initial angles already limit a synthetic
static centered-paddle round to 2 consecutive returns; human stillness and
tracking jitter have not been measured. One person's two hands working is
allowed and does not prove two actual players.

Check mirrored camera attachment, portrait rotation, third-hand interference,
short loss, resumed overlapping ball, two-touch independence, audio on/off,
permission rejection/cancellation, retry and sensor release on exit. If the
first catch is difficult, inspect speed → paddle height → guide → input latency
before adding new gesture rules.
