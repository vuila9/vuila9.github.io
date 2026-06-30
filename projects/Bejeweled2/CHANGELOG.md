# Changelog

All notable changes to the Bejeweled 2 web app are documented here.
Format follows this [Keep a Changelog](https://keepachangelog.com/en/1.0.0/) and satisfying these rules BEFORE ADDING CHANGES TO THE FILE:
- Each following day, increase x of version #.x.0 by 1, x always starts at 0.
- Each consecutive update, increase x of version #.#.x by 1
- Each major update, increase x of version x.0.0 by 1 (only handled by dev)

---

## [0.0.7] - 2026-06-30
### Changed
- Smoother idle animation: consecutive gem frames are now cross-faded (blended in an offscreen buffer to keep full opacity), turning the 10-frame flipbook into continuous motion instead of a hard frame-to-frame snap.

## [0.0.6] - 2026-06-30
### Added
- Loading screen: a cosmic-themed splash with the game title and a progress bar that tracks real asset-decode progress, shown until all gem frames and the background have loaded.

## [0.0.5] - 2026-06-30
### Added
- FPS counter overlay (bottom-left, colour-coded), toggled with the **F** key, for diagnosing rendering vs. animation smoothness.

## [0.0.4] - 2026-06-30
### Added
- Animated gems: each gem now plays its original idle rotation/shimmer animation (10 frames per colour extracted from the APK atlas), with a per-cell phase offset so the board shimmers instead of pulsing in unison.

## [0.0.3] - 2026-06-30
### Added
- Follow-the-finger drag: a gem now slides under the cursor/finger while dragging, with the neighbour sliding the opposite way as a live preview. Releasing before the halfway point eases both gems back into place.

## [0.0.2] - 2026-06-30
### Changed
- Drag-to-swap now triggers the instant a gem is dragged past the halfway point toward a neighbour, instead of waiting for the mouse/finger to be released.

## [0.0.1] - 2026-06-30
### Added
- Level progression (Bejeweled 2 Classic style): a progress meter fills as gems are cleared; filling it advances the level, awards a completion bonus, shows a "Level Up!" celebration, and raises the next target.

## [0.0.0] - 2026-06-30
### Added
- Initial playable release — a faithful match-3 built on the original gem sprites and background extracted from the Bejeweled 2 Android APK.
- 8×8 board with swap, match-3 detection, cascading clears, gravity + refill, and combo scoring.
- Best-score persistence (localStorage) and automatic reshuffle when no legal moves remain.
- Tap-to-select and drag-to-swipe input, responsive canvas scaling, and fullscreen support.
- Installable PWA with offline play (service worker) and a standalone web-app shell.