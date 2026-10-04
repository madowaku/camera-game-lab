# EXP-045 HANDY PALS — human playtest

Status: physical front-camera acceptance and five-person playtests are pending.
Synthetic landmark tests and camera-free browser runs establish software behavior,
not recognition accuracy, the 10-second discovery KPI or whether people find it cute.

Primary input: palm center XY / large motion / two-hand distance (S–A design rank).
An approximate open-palm state is supplemental. No small finger contacts or precision
choreography are needed. Recovery: retain the last character location, wobble for
about 700 ms, search after that and softly follow when the hand returns.

Run the same gestures in a bright room on desktop Chrome and a phone's front camera:

- Show both whole palms, stop, and watch the automatic greeting.
- Move left/right, up/down, quickly, and in a broad circle; open the whole palm.
- Bring palms together for a high-five, closer for a hug, then separate again.
- Cross hands, temporarily hide one, bring it back, then hide both and return.
- Check frame alignment using portrait and landscape webcams and rotation.
- Pause and resume; leave the tab; deny permission and try camera-free play.
- Finish, save the photo, share if desired, retry and change either character.

Record Input Gates A–E from CAMERA_INPUT_RELIABILITY_V01.md: ten deliberate
attempts (target ≥9/10); false activation during 30 seconds of stillness (0–1,
excluding intentional idle animation and the scripted greeting); unexplained
first use by five people (target ≥4/5); simple recovery; readable failure guidance.

| Person / device / light | Reacts to pop | Moves intentionally ≤10s | Tries different moves | Notices high-five | Smiles | Loss unpleasant? | Another round? | Another character? | Wants a video? |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Pending | Pending | Pending | Pending | Pending | Pending | Pending | Pending | Pending |
| 2 | Pending | Pending | Pending | Pending | Pending | Pending | Pending | Pending | Pending |
| 3 | Pending | Pending | Pending | Pending | Pending | Pending | Pending | Pending | Pending |
| 4 | Pending | Pending | Pending | Pending | Pending | Pending | Pending | Pending | Pending |
| 5 | Pending | Pending | Pending | Pending | Pending | Pending | Pending | Pending | Pending |

CREATOR video recording, face effects/hiding and seven-second replay are future
scope from spec section 18. This MVP exports the final still photo only.
