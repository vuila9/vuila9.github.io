# Changelog

All notable changes to the Bejeweled 2 web app are documented here.
Format follows this [Keep a Changelog](https://keepachangelog.com/en/1.0.0/) and satisfying these rules BEFORE ADDING CHANGES TO THE FILE:
- Each following day, increase x of version #.x.0 by 1, x always starts at 0.
- Each consecutive update, increase x of version #.#.x by 1
- Each major update, increase x of version x.0.0 by 1 (only handled by dev)

---

## [0.0.15] - 2026-06-30
### Added
- Diagonal gloss sweep: a soft white sheen band drifts across the board from top-left to bottom-right every 6–14 seconds as a cosmetic idle effect.

## [0.0.14] - 2026-06-30
### Changed
- FPS counter moved to top-left of the HUD, above the Best score, which shifted down to make room.
- Level and current score are now centered in the HUD; Best score anchored top-left.

## [0.0.13] - 2026-06-30
### Added
- Settings panel: gear button (top-right of canvas) opens an OPTIONS overlay with Sound, FPS Counter, and Debug Mode toggles, a Reset Best Score button, and a RESUME button. Works on both the project page and the standalone webapp.
- Debug Mode toggle: when enabled, a selected gem can be swapped with any gem on the board, bypassing the adjacency check.
- `DROP_MS` constant for tuning gem fall duration independently of other animations.
- Animation speed multiplier (`gameSpeed`) applied to swap, clear, power-form, and fall tweens.

## [0.0.12] - 2026-06-30
### Changed
- Cross/star gem now spawns at the intersection cell of T- and L-shaped matches instead of being triggered by a 5-in-a-row. The star arms also render in a second pass so they overlay neighboring gems correctly.

## [0.0.11] - 2026-06-30
### Changed
- Star (cross gem) arm color now matches the gem it sits on: arms fade from white at the core to the gem's palette color at the tips.

## [0.0.10] - 2026-06-30
### Changed
- Star (cross gem) arms are longer, brighter, and denser: arm reach increased ~65%, arm width widened, gradient replaced flat alpha for a proper tapered shine, and the core glow radius and brightness increased.

## [0.0.9] - 2026-06-30
### Fixed
- Removed idle spin animation on gems; spinning now only plays on the currently selected gem.

## [0.0.8] - 2026-06-30
### Improved
- Drag-to-swap feel and reliability on mobile (improved pointer tracking and commit logic).

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