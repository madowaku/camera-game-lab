# OUTCAM LAB / EXP-021 WATERMELON GUIDE — v0.2

2026-10-02. Continues the MVP at `faa1276`. Route: `/#watermelon`.

## Implemented

- Three-second setup countdown, then a 30-second / three-attempt round.
- Downward swings score at the point where the hand crosses the melon's height, rather than at the beginning of the movement. The crossing position is interpolated between frames.
- A 140 ms motion window supports small per-frame movement at high frame rates. Slow positioning, upward movement, stale frames, tracking loss and target changes do not create hits.
- Horizontal distance uses the current stage aspect ratio. The melon is centered on the scoring position and no longer bobs away from it.
- Explicit camera-free tap demo. Camera rounds cannot be scored by tapping the operator's screen or pressing Space.
- Three individual result rows, including unattempted targets after timeout. Offset is percent of screen height, **not centimeters or world-space distance**.
- Immediate tracking status updates. Cropped hands no longer snap to the visible stage edge.
- Camera startup cancellation releases acquired tracks and cannot reactivate a screen after navigation away.
- Countdown and round timer pause while the document is hidden. A late input cannot score after the round expires.
- Japanese and English instructions explain screen-fixed targets and stationary camera use.

## Verification

- `npm test`: 48 passed, including five new swing/aspect regression tests.
- `npm run build`: passed (Vite + PWA generation).
- Temporary Happy DOM / Vite SSR integration check: countdown; three pointer hits / 300 points; three result rows; English localization; retry reset; timeout; camera-mode tap isolation; live hand status; canceled stream cleanup; late camera-start completion after leaving. Passed.
- Browser rendering was not verified: the environment's Chromium download returned an invalid archive. DOM checks do not verify layout or camera inference.
- No Android or two-person physical playtest has been performed. Detection thresholds remain provisional.
- No Cloudflare deployment was performed in this change.

## Two-person phone check — pending

Keep eyes open, use an empty hand, and keep the camera stationary. This prototype has no floor anchoring or depth sensing. Keep one hand visible and start above the melon before swinging down. The other hand should remain out of view.

1. Open `/#watermelon`, enable the rear camera, and find a position where the hand marker follows reliably. Confirm the actual camera selected; rear camera is preferred, not guaranteed on every device.
2. Start and check that the countdown gives enough preparation time. The operator guides by voice; the player does not look at the phone.
3. Try a centered swing, a clearly sideways miss, and slow hand positioning. Confirm one fast crossing consumes one attempt and slow positioning does not.
4. Hide/reintroduce the hand; verify no accidental strike. Repeat after switching browser tabs.
5. Complete five rounds, switching operator/player. Record device, orientation, tracking dropouts, false strikes, missed swings and whether the conversation is fun.
6. Check portrait and landscape framing. Targets follow the screen when the camera moves; they are not attached to the room.
7. Check retry, timeout, camera denial, exit during camera permission, and the separate camera-free demo.

Do not mark this real-device gate as passed using synthetic inputs.
