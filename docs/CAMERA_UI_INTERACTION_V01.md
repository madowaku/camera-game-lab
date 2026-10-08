# Camera UI Interaction Layer v0.1

The canonical implementation and validation record is [UI_UX_ACCESSIBILITY_V01.md](UI_UX_ACCESSIBILITY_V01.md).

PR #8 now uses the shell-owned `src/cameraUi/controller.js` and `dom.js` for FEED, launch and results. The previous FEED-only controllers have been removed. Touch remains available, camera navigation starts OFF, ordinary menu dwell is 650ms, and MARU retry is 700ms.
