# Changelog

All notable changes to the Bejeweled X web app are documented here.
Format follows this [Keep a Changelog](https://keepachangelog.com/en/1.0.0/) and satisfying these rules BEFORE ADDING CHANGES TO THE FILE:
- Each following day, increase x of version #.x.0 by 1, x always starts at 0.
- Each consecutive update, increase x of version #.#.x by 1
- Each major update, increase x of version x.0.0 by 1 (only handled by dev)

---

## [0.2.2] - 2026-07-02
### Fixed
- Game could freeze permanently after committing a drag-swap that was already at full offset on release (often noticed when detonating a power gem). The finishing slide's duration scaled to 0, and a zero-length tween divided by zero — producing NaN/Infinity draw offsets that crashed the render loop (`createRadialGradient` non-finite error). Zero-length tweens now jump straight to their end state, and tween progress is clamped so an early rAF timestamp can't go negative.

## [0.2.1] - 2026-07-02
### Fixed
- Timer buff now travels with its gem when swapped. Previously the buff was tracked by board cell and `swapCells` didn't exchange it, so swapping a buffed gem silently left the buff behind on the other gem — a match formed at the buff's old cell would wrongly collect it (+10s), while matching the buffed gem at its new position wouldn't.

## [0.2.0] - 2026-07-02
### Changed
- Project renamed from "Bejeweled 2" to "Bejeweled X". Folder, file names, and all paths/references updated accordingly (`projects/Bejeweled2/` → `projects/BejeweledX/`, `Bejeweled2.html` → `BejeweledX.html`, `Bejeweled2.js` → `BejeweledX.js`, `Bejeweled2_icon.svg` → `BejeweledX_icon.svg`); service worker cache bumped to `bejeweledx-v10`. Mentions of the original PopCap game keep the "Bejeweled 2" name. Note: previously installed web apps and bookmarks pointing at the old `Bejeweled2` URL will no longer resolve.

## [0.1.35] - 2026-07-01
### Changed
- In Timed mode, detonating a Timer buff now grants time only once and wipes every other Timer buff currently on the board, instead of banking time for each buff caught in a clear. Multiple buffs can still spawn, but only the first collected one pays out.

## [0.1.34] - 2026-07-01
### Changed
- FPS Counter now defaults to off for new players (was on), matching Debug Mode. The choice is still persisted across sessions once toggled, whether from Settings or the 'F' key.

## [0.1.33] - 2026-07-01
### Added
- A "WELCOME BACK" prompt now appears at boot whenever a saved in-progress run is found, showing its level/score and offering CONTINUE (resume it, already the default) or START OVER (discard it and deal a fresh board). Skipped if the saved run had already ended, since the Time's Up screen covers that case with its own retry button.

### Changed
- Rush mode's level-completion bonus is now 5 seconds (was 15s).
- Rush mode's quick-match time bonus is capped lower: the window is now 4 seconds (was 6s), so a match banks at most ~4s instead of ~6s.

## [0.1.31] - 2026-07-01
### Changed
- A resumed Timed/Rush run always comes back with its clock paused, even if the clock had already started ticking before the reload — same as a brand-new run, it only resumes once the player clears a match on the restored board.

## [0.1.30] - 2026-07-01
### Added
- The current run now resumes after a reload or tab close instead of always dealing a fresh board: board layout, score, level progress, and (for Timed/Rush) the clock are saved after every settled move, on a 1-second interval, and when the tab is hidden, then restored at boot. If the saved board's column count no longer matches the viewport (e.g. fullscreen/orientation changed between sessions), a fresh board is dealt but score/level/clock still carry over.

## [0.1.29] - 2026-07-01
### Fixed
- Rush mode's clock showed Timed's 1:00 on first load (or after a hard refresh) whenever Rush was the last-selected mode, instead of Rush's own starting time — `timeLeft`'s initial value wasn't mode-aware. Also, the Time's Up "Try Again" button always restarted in Timed mode regardless of which mode had actually just ended.

## [0.1.28] - 2026-07-01
### Fixed
- Rush mode's quick-match time bonus now only triggers on the match the player's swap directly produces — automatic chain-reaction matches formed by gems falling into place afterward no longer bank time.

## [0.1.27] - 2026-07-01
### Changed
- Rush mode now starts with a 15-second clock (was 90s) and its "quick match" bonus window is 6 seconds (was 5s).

## [0.1.26] - 2026-07-01
### Changed
- Auto-Play is now available in Rush mode as well as Timed, and its move-picking now prefers whichever legal swap detonates a power gem (bomb/cross/hyper) or collects a Timer buff over a plain 3-match, instead of just playing the first legal move it finds.

## [0.1.25] - 2026-07-01
### Added
- Rush game mode: starts with a 90-second clock (no per-level reset). Every successful match opens a 5-second "quick match" window; landing the next match before it closes banks whatever time was left in it, rewarding fast chaining. Completing a level adds a flat 15 seconds on top.

## [0.1.24] - 2026-07-01
### Fixed
- Timer buff's clock badge is now centered on the gem instead of floating above it.

## [0.1.23] - 2026-07-01
### Added
- Timed mode: each successful match has a 15% chance to bless a random gem with a Timer buff (pulsing cyan glow + clock badge). Clearing it in a later match adds 10 seconds to the clock, with a floating "+10s" popup and a dedicated chime.

## [0.1.22] - 2026-07-01
### Fixed
- `webapp.html` (the standalone PWA app shell) had fallen out of sync with the main project page — it duplicates the settings/game-mode markup separately and was missing the volume slider, Auto-Play toggle, the real mode-select list, the mode-selection toast, and the Time's Up overlay. Re-synced.

## [0.1.21] - 2026-07-01
### Changed
- Bomb, cross, and hyper detonation sounds now layer in filtered white-noise texture and sit on slightly higher pitch floors, so they read as a clean hit on weak/small speakers (most laptop speakers can't reproduce much below ~150-200Hz cleanly) instead of a thin or buzzy tone.

## [0.1.20] - 2026-07-01
### Added
- Volume slider in Settings (0-150%) alongside the mute toggle, persisted across sessions and disabled while muted; overall sound effect loudness increased via a master volume multiplier.

## [0.1.19] - 2026-07-01
### Added
- Distinct detonation sounds for cross gem (deep laser zap with a sub-bass layer) and hyper gem (bass "whomp" + rising sparkle arpeggio); previously both reused the bomb gem's explosion sound.

## [0.1.18] - 2026-07-01
### Added
- Auto-Play toggle (Timed mode only, in Settings) — plays the first legal move the instant one exists, at normal swap speed, to benchmark the highest score achievable with zero decision time.

## [0.1.17] - 2026-07-01
### Changed
- Timed mode's best-level record moved from the Time's Up screen into the HUD, shown directly under Best score (Timed mode only).

## [0.1.16] - 2026-07-01
### Fixed
- Time's Up overlay's stat rows no longer overlap, for the same `line-height: 0` inheritance reason as the mode toast below.

## [0.1.15] - 2026-07-01
### Added
- Timed game mode: one minute per level, resetting on level-up and not starting until the first match clears; a Time's Up overlay with level/score summary and a retry button; best score now tracked per mode instead of one shared value.

## [0.1.14] - 2026-07-01
### Fixed
- Mode-selected toast text no longer overlaps itself — inherited `line-height: 0` from `#bj-frame` (used to remove the canvas's inline gap) was collapsing each line to zero height.

## [0.1.13] - 2026-07-01
### Changed
- Selecting a game mode now shows a brief toast with its description instead of permanent subtext under each mode button.

## [0.1.12] - 2026-07-01
### Fixed
- Game Mode buttons' two-line text (name + description) no longer clips or misaligns — the template's button reset (fixed height/line-height/overflow/white-space, sized for one line of uppercase text) was cutting it off.

## [0.1.11] - 2026-07-01
### Fixed
- Restored intended text colors on RESUME, Reset Best Score, and the gear/game-mode icon buttons, and redesigned the Game Mode panel's buttons (centered text, gradient backgrounds, glowing active state) — the template's global `button { color: #585858 !important }` rule had been silently graying all of them out.

## [0.1.10] - 2026-07-01
### Added
- Game Mode selector: Endless (the existing default) is now explicitly named and selectable from the Game Mode panel; Timed/Puzzle/Lightning listed as disabled "coming soon" entries.

## [0.1.9] - 2026-07-01
### Changed
- Board background now loads from `assets/img/background.jpg` instead of the embedded base64 JPEG in `bejeweled_assets.js`.

## [0.1.8] - 2026-07-01
### Added
- Game Mode button (gamepad icon) next to the Settings gear, on both the project page and the standalone app. Opens a placeholder panel for now; mode options to follow.

## [0.1.7] - 2026-07-01
### Fixed
- Hint now highlights the correct gem: the one that actually needs to move into the matching run, not just whichever half of the swap pair was scanned first. Previously it could point at the gem that gets swapped out of the way instead of the one that completes the match.

## [0.1.6] - 2026-07-01
### Added
- Hint: after 10 seconds with no player input, a gem with a legal move pulses with a soft golden glow and outline. Disappears the moment the player interacts again.

## [0.1.5] - 2026-07-01
### Fixed
- Bomb and hyper gem halos now draw in the same second pass as the cross gem's shine, after all gems are drawn, so they overlap neighboring gems instead of being painted over by them.

## [0.1.4] - 2026-07-01
### Fixed
- Hyper gem detonation now chain-triggers any bomb or cross gem it catches in its color-wide clear (3x3 / row+column blast and matching FX), instead of just erasing them silently like a plain gem.

## [0.1.3] - 2026-07-01
### Fixed
- Hyper gem now activates the classic way: swapping it directly onto any gem detonates it immediately (no 3-in-a-row required) and clears every gem on the board matching the color it was swapped into. Previously it only detonated when caught inside a later match, and swapping it onto a non-matching neighbor just bounced back like a normal illegal move. `hasAnyMove()` also now treats any hyper gem as guaranteeing a legal move, so the board won't wrongly reshuffle while one is in play.

## [0.1.2] - 2026-07-01
### Changed
- Hyper gem halo now behaves like a sonar ping: it expands outward from the gem and fades out at its largest size, then resets to the center and expands again, instead of breathing in and out.

## [0.1.1] - 2026-07-01
### Changed
- Hyper gem: dropped the spinning star overlay; the halo is now a true rotating rainbow ring (conic gradient masked into a ring shape) instead of a single pulsing hue; the gem itself now spins continuously through its rotation flipbook, independent of selection.

## [0.1.0] - 2026-07-01
### Added
- Hyper gem (color bomb): a horizontal or vertical 5-in-a-row now mints a level-3 power gem, rendered as the white gem model recolored with a shifting rainbow (hue-cycled while keeping its original shading), plus a pulsing rainbow halo and rotating sparkle. When caught in a later match it detonates and clears every gem on the board sharing its original color, with a matching board-wide burst FX.

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