# EXP-049 WIPE! — device and human playtest

Date: 2026-10-04. Status: implementation and synthetic browser QA complete;
physical-device and human gates below remain untested.

Primary input: screen-space palm position (wrist + landmarks 5/9/13/17 average).
No fingertip contact, pinch, handedness classification or gesture is required.
Input rank follows the lab's position / large-movement category. Reveal and
cleaning radius are deliberately forgiving. A missing palm pauses after 350ms;
returning palms resume automatically without bridging the missing path.

Open `#/game/solo-wipe` or `#/game/duo-wipe` on a camera-capable HTTPS host.
The local `127.0.0.1` URL works on the desktop hosting the server; a phone needs
an HTTPS address. Successful physical-device testing is not yet claimed.

Run five real rounds, including at least two DUO rounds and a CREATOR HIDE round.
Record phone/browser, lighting, distance, dominant hand and player experience.

| Round | Initial hand motion without spoken explanation | Tracking feels forgiving | Last dirt is fun to find | 100% feels satisfying | DUO naturally provokes speech | Device / notes |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Untested | Untested | Untested | Untested | Untested | |
| 2 | Untested | Untested | Untested | Untested | Untested | |
| 3 | Untested | Untested | Untested | Untested | Untested | |
| 4 | Untested | Untested | Untested | Untested | Untested | |
| 5 | Untested | Untested | Untested | Untested | Untested | |

MVP success: four of the five specified qualities pass. Do not equate synthetic
mouse rounds with this gate. In DUO, note unsolicited reactions such as
“そこ残ってる！” and “うわ、汚すな！”.

Also measure the shared input gates: deliberate movement succeeds at least 9/10;
30 seconds of stillness invents at most one scrub; four of five first-time
players discover their first wipe quickly; removing and returning a hand
recovers without a hidden instruction; recovery copy explains the action.

Specific device checks: palms in all four corners; landscape video cropping into
the portrait viewport; low light; wrists partly outside the frame; two hands on
one side; two people crossing the middle; permission denial; background/return;
final 1% visibility; attack at 90% clean; 7-second mobile export/share availability.
