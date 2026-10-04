# EXP-049 WIPE! v0.1 — implementation contract

Genre: front camera × palm movement × cleaning. Portrait 9:16. SOLO 30 seconds;
DUO 45 seconds. Canonical IDs `solo-wipe` and `duo-wipe`; aliases `#wipe`,
`#wipe-solo`, `#wipe-duo`. Mode can also be chosen at the entrance.

“曇った画面を、自分の手でピカピカにしろ！”

The camera begins covered in fog. Moving a palm drives a large circular sponge;
the mask transitions from fog to thin fog to clear. HUD shows integer CLEAN
area. The display never rounds 99% up. Clearing every mask cell produces 100%,
an immediate complete reveal, brightened camera, sparkles, squeak and PERFECT
WINDOW. At time-up, the result reports the measured CLEAN percentage.

Four dirt visuals share the same movement input: fog needs one pass, drops two,
large foam patches one wide wipe, handprints repeated concentrated scrubs.
Stationary hands do not earn repeated scrubs. Continuous paths are swept;
missing or distant observations never create a wipe across the gap. Every
10%-area milestone sparkles. At >=90%, remaining dirty cells glow, including a
single final cell. Effects include fog particles, droplets and fading sponge trails.

DUO assigns hands by their current mirrored screen side. Each half owns its
mask and percentage; brushes cannot cross the divider. First to 100% wins;
simultaneous completion in the same simulation frame draws. Time-up compares
measured remaining area. Clearing each player's BIG BUBBLE sends one SPLASH
ATTACK: three new droplet patches, at most 4.5% of the opponent's area. If the
opponent is already >=90% clean, only two tiny drops, capped at 0.8%, land.
Each original BIG BUBBLE attacks only once; attacks never spawn more big bubbles.

MediaPipe Hand Landmarker tracks up to two palms, averaging wrist and palm
landmarks 0/5/9/13/17. Projection matches the mirrored, cover-cropped camera.
Tracking IDs survive result ordering changes; positions are smoothed and expire
after 180ms. The brush uses palm span ×1.8, clamped generously by mode. Initial
recognition shows READY for 600ms, then starts automatically. Missing palms
show a hand-return instruction and pause after 350ms. DUO needs one palm in
each screen half and pauses if either is absent. Mouse drag and independent
touch pointers supply the same positions for camera-free practice.

PLAY never records. CREATOR uses the shared recorder, composer and video export
foundation with a WIPE profile. ORIGINAL displays the camera; EFFECT gives it
pop-color grading; HIDE reveals an Imagegen illustrated window and never raw
video. The full recorded reveal is compressed into five seconds, with a one-second
finish and one-second end card. The opaque first frame is retained even in long
DUO rounds. Clips remain in device memory until the player chooses save/share;
exit discards them. BGM is excluded from exported clips.

Audio: licensed OpenTracks background music “お掃除しましょ” by ゆうり
(Yuli Audio Craft), CC0 shared Kenney effects, original readiness/final tones.
JA/EN, separate BGM/SFX controls, pause, tracking recovery, denial-to-practice,
RETRY/NEXT/result share, practice provenance and SOLO source-specific personal
best. Hidden tabs pause; result/exit releases media, recognizer and audio.

Excluded: detergent resources, sponge inventories, durability, management,
complex combos, item selection, finger gestures and precision physics.

Sources and prompts: `docs/wipe-assets.json`, `docs/wipe-image-prompts.txt`.
Human success criteria are tracked separately in `docs/WIPE_PLAYTEST.md`.
