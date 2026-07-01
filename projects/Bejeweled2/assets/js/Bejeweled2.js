// Bejeweled 2 — game logic
//
// A faithful match-3 re-implementation in vanilla JavaScript on an HTML5 canvas,
// using the original gem sprites + background extracted from the APK (BJ_ASSETS in
// bejeweled_assets.js). Same spirit as the Flappy Bird revival: original art, fresh
// frame-rate-independent code.
//
// First version scope: classic 8x8 endless board — select/swap, match-3 detection,
// cascading clears with gravity + refill, combo scoring, best-score persistence,
// and a hyper gem spawned as an escape hatch when no moves remain.
(function () {
	"use strict";

	const canvas = document.getElementById("bj-canvas");
	if (!canvas) return;
	const ctx = canvas.getContext("2d");

	// Shown in the Options panel to confirm a deploy is live. Bump this together
	// with CACHE in sw.js so the number always matches the service-worker version.
	const APP_VERSION = "0.9";

	// ---- Layout (internal logical resolution; CSS scales to fit) ----
	// COLS grows to WIDE_COLS in fullscreen/app mode when the screen is in landscape,
	// so the board fills more of the wide viewport instead of leaving empty side gutters.
	const NORMAL_COLS = 8, WIDE_COLS = 12;
	let COLS = NORMAL_COLS;
	const ROWS = 8, GEM = 64;
	const HUD_H = 88;
	const BOARD_X = 0, BOARD_Y = HUD_H;
	let BOARD_W = COLS * GEM;
	const BOARD_H = ROWS * GEM;
	let CANVAS_W = BOARD_W;              // 512
	let CANVAS_H = HUD_H + BOARD_H;      // 600
	canvas.width = CANVAS_W;
	canvas.height = CANVAS_H;

	const NUM_TYPES = (BJ_ASSETS.gems || []).length || 7;

	// ---- Asset loading ----
	const gemImgs = [];        // gemImgs[t] = static fallback frame
	const gemFrames = [];      // gemFrames[t] = [Image, ...] idle-rotation frames
	let bgImg = null;
	let assetsReady = false;

	let loadTotal = 0, loadDone = 0;   // asset-load progress for the loading screen

	function loadImage(src) {
		return new Promise((resolve) => {
			const img = new Image();
			const done = (result) => { loadDone++; resolve(result); };
			img.onload = () => done(img);
			img.onerror = () => done(null);
			img.src = src;
		});
	}

	async function loadAssets() {
		const staticList = BJ_ASSETS.gems || [];
		const frameLists = BJ_ASSETS.gemFrames || staticList.map((s) => [s]);
		loadTotal = staticList.length + frameLists.reduce((n, l) => n + l.length, 0) +
			(BJ_ASSETS.background ? 1 : 0);
		loadDone = 0;
		const [statics, frames, bg] = await Promise.all([
			Promise.all(staticList.map(loadImage)),
			Promise.all(frameLists.map((list) => Promise.all(list.map(loadImage)))),
			BJ_ASSETS.background ? loadImage(BJ_ASSETS.background) : Promise.resolve(null)
		]);
		for (const g of statics) gemImgs.push(g);
		for (const list of frames) gemFrames.push(list.filter(Boolean));
		bgImg = bg;
		assetsReady = true;
	}

	const SPIN_FPS = 14;       // flipbook speed for the selected gem's spin

	// Gem image for type `t` at cell (r,c). Gems sit still on their front-facing frame
	// except the currently selected one (or a `forceSpin` gem, e.g. a hyper gem), which
	// spins through the rotation flipbook continuously.
	function gemAnimState(t, r, c, forceSpin) {
		const frames = gemFrames[t];
		if (!frames || frames.length === 0) return { a: gemImgs[t], b: null, f: 0 };
		if (frames.length > 1 && (forceSpin || (selected && selected.r === r && selected.c === c))) {
			const i = Math.floor(selPulse * SPIN_FPS) % frames.length;
			return { a: frames[i], b: null, f: 0 };
		}
		return { a: frames[0], b: null, f: 0 };
	}

	// ---- Tiny WebAudio feedback (original SFX are locked in PopCap .jet format;
	//      these are light synthesized blips so the game isn't silent). ----
	let audioCtx = null;
	let muted = false;
	let debugMode = false;
	let hapticsEnabled = true;
	try { hapticsEnabled = localStorage.getItem("bj2_haptics") !== "0"; } catch (e) {}
	let gameSpeed = 1.5;   // animation speed multiplier

	// ---- Game mode ----
	// "endless": classic play, levels/progress meter, no limit.
	// "timed": one minute per level (see TIMED_SECONDS below); running out ends
	// the run (see triggerTimeUp()).
	// Other modes (puzzle, lightning, ...) are still stubbed in the Game Mode
	// panel as disabled "coming soon" entries until they're implemented.
	let gameMode = "endless";
	try { gameMode = localStorage.getItem("bj2_mode") || "endless"; } catch (e) {}
	const DROP_MS = 300; // gem fall duration in ms (lower = faster drop)
	function S(ms) { return ms / gameSpeed; }   // scale a tween duration by speed
	function beep(freq, dur, vol) {
		if (muted) return;
		try {
			if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
			// Mobile browsers (iOS Safari, Chrome Android) create the context suspended
			// until explicitly resumed — without this, scheduled tones are silently
			// dropped and the game reads as randomly/inconsistently silent.
			if (audioCtx.state === "suspended") audioCtx.resume();
			const t = audioCtx.currentTime;
			const osc = audioCtx.createOscillator();
			const gain = audioCtx.createGain();
			osc.type = "sine";
			osc.frequency.setValueAtTime(freq, t);
			gain.gain.setValueAtTime(0.0001, t);
			gain.gain.exponentialRampToValueAtTime(vol, t + 0.01);
			gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
			osc.connect(gain).connect(audioCtx.destination);
			osc.start(t);
			osc.stop(t + dur + 0.02);
		} catch (e) { /* audio not available */ }
	}
	const sndSelect = () => beep(440, 0.08, 0.05);
	const sndSwapBad = () => beep(160, 0.12, 0.06);
	const sndMatch = (cascade) => beep(420 + cascade * 90, 0.12, 0.08);
	const sndLevelUp = () => { beep(660, 0.16, 0.09); setTimeout(() => beep(990, 0.22, 0.09), 130); };
	const sndExplode = () => { beep(140, 0.28, 0.1); setTimeout(() => beep(90, 0.3, 0.09), 40); };

	// Haptic feedback on special-gem detonation. Real Taptic Engine access from a web
	// page isn't exposed on iOS (Safari/WKWebView never implemented the Vibration API,
	// even for home-screen-installed PWAs) — this uses the standard navigator.vibrate(),
	// which works on Android/other browsers that support it and is a silent no-op
	// everywhere else, so it costs nothing to leave wired up for whenever/if iOS adds it.
	function hapticBuzz(level) {
		if (!hapticsEnabled || !navigator.vibrate) return;
		try {
			if (level === 3) navigator.vibrate([25, 30, 45]);   // hyper: triple pulse
			else if (level === 2) navigator.vibrate(30);        // cross
			else navigator.vibrate(18);                          // bomb
		} catch (e) { /* vibration not available */ }
	}

	// ---- Game state ----
	let grid = [];            // grid[r][c] = type index, or -1 when empty
	let score = 0;
	let best = 0;
	// Best score is tracked per mode (Endless scores dwarf Timed ones, so a shared
	// "Best" would be meaningless in Timed) — Endless keeps the original "bj2_best"
	// key so existing players don't lose their saved best on this update.
	function bestKey() { return gameMode === "endless" ? "bj2_best" : "bj2_best_" + gameMode; }
	function loadBest() {
		try { best = parseInt(localStorage.getItem(bestKey()) || "0", 10) || 0; } catch (e) { best = 0; }
	}
	loadBest();

	// Best level reached — shown alongside best score on the Timed mode's Time's Up
	// screen (Timed's levels reset each run, so it's worth tracking separately from
	// the best score).
	let bestLevel = 0;
	function bestLevelKey() { return "bj2_bestlevel_" + gameMode; }
	function loadBestLevel() {
		try { bestLevel = parseInt(localStorage.getItem(bestLevelKey()) || "0", 10) || 0; } catch (e) { bestLevel = 0; }
	}
	function updateBestLevel() {
		if (level > bestLevel) {
			bestLevel = level;
			try { localStorage.setItem(bestLevelKey(), String(bestLevel)); } catch (e) {}
		}
	}
	loadBestLevel();

	// ---- Level / progress (Bejeweled 2 Classic style) ----
	// Clearing gems fills a progress meter; filling it advances the level, awards a
	// bonus, and raises the next target. Endless, but with a sense of progression.
	let level = 1;
	let levelProgress = 0;        // points banked toward the current level
	let levelTarget = computeTarget(1);
	let levelFlash = 0;           // seconds left on the "Level Up!" celebration
	function computeTarget(lv) { return 300 + (lv - 1) * 200; }

	// ---- Timed mode ----
	// One minute per level; clearing the level's progress meter resets the clock
	// back to the full minute for the next level (see levelUp()). Running out
	// freezes the board and shows the Time's Up overlay (see triggerTimeUp()).
	// The clock doesn't actually count down until the player's first match clears
	// (see resolveBoard()/resolveHyperSwap()), so studying the opening board for a
	// move doesn't eat into the minute.
	const TIMED_SECONDS = 60;
	let timeLeft = TIMED_SECONDS;
	let timedOver = false;
	let timedStarted = false;
	function formatTime(totalSeconds) {
		const s = Math.max(0, Math.ceil(totalSeconds));
		return Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0");
	}

	let busy = false;         // true while animating (input blocked)
	let selected = null;      // {r,c} currently selected gem
	let selPulse = 0;         // selection highlight animation phase
	let fps = 60;             // smoothed render frames-per-second
	let showFPS = true;       // toggle with the 'F' key

	// ---- Hint: after 10s with no player input, highlight a legal move ----
	let idleTime = 0;         // seconds since the last player input
	let hint = null;          // {r,c} of the gem to highlight, once found
	const HINT_IDLE_S = 10;

	// Per-gem visual offset/scale for animations (parallel to grid).
	// offset = {dx,dy} in pixels added to the cell's home position.
	let offset = [];          // offset[r][c] = {dx,dy}
	let scale = [];           // scale[r][c] = 0..1 (for clear/spawn pops)
	// power[r][c] tier: 0 = normal, 1 = bomb gem (4-in-a-row, clears 3x3),
	// 2 = cross gem (T/L shape match, clears its whole row + column),
	// 3 = hyper gem (5-in-a-row, clears every gem of that color on the board).
	let power = [];
	const POWER_MIN = 4;   // 4-in-a-row = bomb
	const HYPER_MIN = 5;   // 5-in-a-row = hyper (color bomb)

	// Explosion FX (purely cosmetic; updated each frame, drawn over the gems).
	let blasts = [];          // expanding shockwave rings {x,y,age,dur,color}
	let sparks = [];          // flung particles {x,y,vx,vy,age,dur,color,size}
	let beams = [];           // cross-gem row/column light beams {r,c,age,dur,color}

	// Diagonal gloss sweep — a white sheen band that drifts top-left → bottom-right
	// over the board every so often (cosmetic idle effect).
	let sheenAge = 0;           // 0..1 progress during the sweep
	let sheenActive = false;
	let sheenCooldown = 6 + Math.random() * 6;   // seconds until next sweep

	function make2D(fn) {
		const a = [];
		for (let r = 0; r < ROWS; r++) {
			a[r] = [];
			for (let c = 0; c < COLS; c++) a[r][c] = fn(r, c);
		}
		return a;
	}

	function randType() { return Math.floor(Math.random() * NUM_TYPES); }

	// Build a starting board with no pre-existing matches.
	function initGrid() {
		grid = make2D(() => -1);
		for (let r = 0; r < ROWS; r++) {
			for (let c = 0; c < COLS; c++) {
				let t;
				do { t = randType(); } while (createsMatchAt(r, c, t));
				grid[r][c] = t;
			}
		}
		offset = make2D(() => ({ dx: 0, dy: 0 }));
		scale = make2D(() => 1);
		power = make2D(() => 0);
		blasts = [];
		sparks = [];
		beams = [];
	}

	// Switch the board width (NORMAL_COLS <-> WIDE_COLS) and deal a fresh board at the
	// new size. Score/level/best carry over; the board layout itself resets, since there's
	// no sane way to reflow an existing 8-wide board into a 12-wide one mid-game.
	function setColumns(cols) {
		if (cols === COLS) return;
		COLS = cols;
		BOARD_W = COLS * GEM;
		CANVAS_W = BOARD_W;
		CANVAS_H = HUD_H + BOARD_H;
		canvas.width = CANVAS_W;
		canvas.height = CANVAS_H;
		initGrid();
		resetInputState();
	}

	// Clears selection/drag/hint state — shared by anything that deals the board a
	// fresh hand (resizing the board, or starting a new mode run).
	function resetInputState() {
		selected = null;
		busy = false;
		pointerDown = null;
		dragPreview = null;
		hint = null;
		idleTime = 0;
	}

	// Switches to `mode` and starts a brand-new run of it: score/level/board reset,
	// and (for Timed) the clock resets to a fresh minute. Used both when picking a
	// mode from the Game Mode panel and when retrying after Time's Up.
	function startNewRun(mode) {
		gameMode = mode;
		try { localStorage.setItem("bj2_mode", gameMode); } catch (e) {}
		loadBest();
		loadBestLevel();
		score = 0;
		level = 1;
		levelProgress = 0;
		levelTarget = computeTarget(1);
		levelFlash = 0;
		timeLeft = TIMED_SECONDS;
		timedOver = false;
		timedStarted = false;
		hideTimeUp();
		initGrid();
		resetInputState();
	}

	// Would placing type t at (r,c) complete a run of 3 with already-filled cells?
	function createsMatchAt(r, c, t) {
		if (c >= 2 && grid[r][c - 1] === t && grid[r][c - 2] === t) return true;
		if (r >= 2 && grid[r - 1][c] === t && grid[r - 2][c] === t) return true;
		return false;
	}

	// ---- Match detection ----
	// findRuns() returns every straight run of 3+ as { cells: [[r,c],...], len }.
	// Run length is what tells a plain 3-match from a 4+ (which mints a power gem).
	function findRuns() {
		const runs = [];
		// horizontal
		for (let r = 0; r < ROWS; r++) {
			let run = 1;
			for (let c = 1; c <= COLS; c++) {
				const same = c < COLS && grid[r][c] !== -1 && grid[r][c] === grid[r][c - 1];
				if (same) { run++; }
				else {
					if (run >= 3) {
						const cells = [];
						for (let k = c - run; k < c; k++) cells.push([r, k]);
						runs.push({ cells, len: run });
					}
					run = 1;
				}
			}
		}
		// vertical
		for (let c = 0; c < COLS; c++) {
			let run = 1;
			for (let r = 1; r <= ROWS; r++) {
				const same = r < ROWS && grid[r][c] !== -1 && grid[r][c] === grid[r - 1][c];
				if (same) { run++; }
				else {
					if (run >= 3) {
						const cells = [];
						for (let k = r - run; k < r; k++) cells.push([k, c]);
						runs.push({ cells, len: run });
					}
					run = 1;
				}
			}
		}
		return runs;
	}

	// Cells a detonating power gem at (r,c) destroys, by tier:
	//   level 3 (hyper) → every gem on the board matching its own color;
	//   level 2 (cross) → its entire row + column; otherwise (bomb) → the 3x3 around it.
	function blastCellsFor(r, c, level) {
		const cells = [];
		if (level === 3) {
			const t = grid[r][c];
			for (let rr = 0; rr < ROWS; rr++) {
				for (let cc = 0; cc < COLS; cc++) {
					if (grid[rr][cc] === t) cells.push([rr, cc]);
				}
			}
		} else if (level === 2) {
			for (let cc = 0; cc < COLS; cc++) cells.push([r, cc]);
			for (let rr = 0; rr < ROWS; rr++) cells.push([rr, c]);
		} else {
			for (let dr = -1; dr <= 1; dr++) {
				for (let dc = -1; dc <= 1; dc++) {
					const nr = r + dr, nc = c + dc;
					if (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS) cells.push([nr, nc]);
				}
			}
		}
		return cells;
	}

	// Flat set of "r,c" keys in any match — used by the move/shuffle guards.
	function findMatches() {
		const matched = new Set();
		for (const run of findRuns()) for (const [r, c] of run.cells) matched.add(r + "," + c);
		return matched;
	}

	// ---- Animation helper: tween over `ms`, calling onUpdate(progress 0..1) ----
	function tween(ms, onUpdate, easing) {
		return new Promise((resolve) => {
			// When the tab is hidden the browser pauses rAF, which would stall the
			// animation (and any await on it). Skip straight to the end state.
			if (document.hidden) { onUpdate(1); resolve(); return; }
			const start = performance.now();
			function step(now) {
				let p = Math.min(1, (now - start) / ms);
				onUpdate(easing ? easing(p) : p);
				if (p < 1) requestAnimationFrame(step);
				else resolve();
			}
			requestAnimationFrame(step);
		});
	}
	const easeOutQuad = (p) => 1 - (1 - p) * (1 - p);
	const easeInQuad = (p) => p * p;

	// ---- Swap two adjacent cells (model only) ----
	function swapCells(a, b) {
		const t = grid[a.r][a.c];
		grid[a.r][a.c] = grid[b.r][b.c];
		grid[b.r][b.c] = t;
		const p = power[a.r][a.c];
		power[a.r][a.c] = power[b.r][b.c];
		power[b.r][b.c] = p;
	}

	// Animate a swap (visual offsets slide between the two homes).
	async function animateSwap(a, b) {
		const dx = (b.c - a.c) * GEM, dy = (b.r - a.r) * GEM;
		await tween(S(140), (p) => {
			offset[a.r][a.c] = { dx: dx * p, dy: dy * p };
			offset[b.r][b.c] = { dx: -dx * p, dy: -dy * p };
		}, easeOutQuad);
		offset[a.r][a.c] = { dx: 0, dy: 0 };
		offset[b.r][b.c] = { dx: 0, dy: 0 };
	}

	// Animate clearing a set of matched cells (shrink + fade), then null them out.
	async function animateClear(matched) {
		await tween(S(180), (p) => {
			for (const key of matched) {
				const [r, c] = key.split(",").map(Number);
				scale[r][c] = 1 - p;
			}
		}, easeInQuad);
		for (const key of matched) {
			const [r, c] = key.split(",").map(Number);
			grid[r][c] = -1;
			scale[r][c] = 1;
			power[r][c] = 0;
		}
	}

	// Brief grow-and-settle pop when a cell upgrades into a power gem.
	async function animatePowerForm(cells) {
		await tween(S(180), (p) => {
			const s = 1 + 0.3 * Math.sin(p * Math.PI);
			for (const [r, c] of cells) scale[r][c] = s;
		});
		for (const [r, c] of cells) scale[r][c] = 1;
	}

	// Apply gravity + refill. Returns a list of fall animations to play.
	function collapseAndRefill() {
		const falls = []; // {r,c, fromY} home (r,c) gem falling from pixel fromY offset
		for (let c = 0; c < COLS; c++) {
			// compact existing gems downward
			let write = ROWS - 1;
			for (let r = ROWS - 1; r >= 0; r--) {
				if (grid[r][c] !== -1) {
					if (write !== r) {
						grid[write][c] = grid[r][c];
						power[write][c] = power[r][c];   // a falling power gem keeps its upgrade
						grid[r][c] = -1;
						power[r][c] = 0;
						falls.push({ r: write, c, dist: (write - r) * GEM });
					}
					write--;
				}
			}
			// fill the rest from above with new (never powered) gems
			let spawnIndex = 1;
			for (let r = write; r >= 0; r--) {
				grid[r][c] = randType();
				power[r][c] = 0;
				falls.push({ r, c, dist: (write - r + spawnIndex) * GEM });
				spawnIndex++;
			}
		}
		return falls;
	}

	async function animateFalls(falls) {
		if (!falls.length) return;
		// set initial offsets (gems start above their home)
		for (const f of falls) offset[f.r][f.c] = { dx: 0, dy: -f.dist };
		await tween(DROP_MS, (p) => {
			for (const f of falls) offset[f.r][f.c] = { dx: 0, dy: -f.dist * (1 - p) };
		}, easeOutQuad);
		for (const f of falls) offset[f.r][f.c] = { dx: 0, dy: 0 };
	}

	// Resolve the board: clear → fall → repeat, accumulating cascade score.
	// `movedCells` (the swapped pair, if any) biases which gem in a 4+ run is the
	// one that survives as the new power gem — ideally the one the player moved.
	async function resolveBoard(movedCells) {
		movedCells = movedCells || [];
		let cascade = 0;
		while (true) {
			const runs = findRuns();
			if (runs.length === 0) break;
			cascade++;
			if (gameMode === "timed") timedStarted = true;   // clock starts on the first match

			// Every cell in any run.
			const matched = new Set();
			for (const run of runs) for (const [r, c] of run.cells) matched.add(r + "," + c);

			// Detonations: any power gem caught in a match blows up — a 3x3 (bomb) or
			// its whole row + column (cross). Any power gem inside that blast detonates
			// too (chain reaction).
			const blastCenters = [];   // {r,c,t,level} for the explosion FX
			const blast = new Set();   // every cell the blasts clear
			const detonated = new Set();
			const queue = [];
			for (const key of matched) {
				const [r, c] = key.split(",").map(Number);
				if (power[r][c]) queue.push(key);
			}
			while (queue.length) {
				const key = queue.pop();
				if (detonated.has(key)) continue;
				detonated.add(key);
				const [pr, pc] = key.split(",").map(Number);
				const lvl = power[pr][pc];
				blastCenters.push({ r: pr, c: pc, t: grid[pr][pc], level: lvl });
				for (const [nr, nc] of blastCellsFor(pr, pc, lvl)) {
					const nk = nr + "," + nc;
					blast.add(nk);
					if (power[nr][nc] && !detonated.has(nk)) queue.push(nk);
				}
			}

			// Detect T/L shapes: a horizontal and vertical run of the same gem type that
			// share a cell. The intersection becomes a cross gem (level 2).
			const hRuns = runs.filter(r => r.cells.length >= 2 && r.cells[0][0] === r.cells[1][0]);
			const vRuns = runs.filter(r => r.cells.length >= 2 && r.cells[0][1] === r.cells[1][1]);
			const crossKeeps = new Set();  // "r,c" keys that become cross gems
			for (const hr of hRuns) {
				for (const vr of vRuns) {
					// find shared cell (same gem type is guaranteed since both are matched)
					const inter = hr.cells.find(([r, c]) => vr.cells.some(([vr2, vc]) => vr2 === r && vc === c));
					if (inter) crossKeeps.add(inter[0] + "," + inter[1]);
				}
			}

			// Mint a power gem from each 4+ run (bomb), or any run involved in a T/L shape
			// (cross). Prefer the moved gem as the keep cell; otherwise the run's middle.
			// A cell already doomed by a blast can't survive as a keep candidate.
			const keepSet = new Set();
			const newPowers = [];   // [r, c, level]

			// First pass: cross gems from T/L intersections
			for (const key of crossKeeps) {
				if (blast.has(key)) continue;
				if (keepSet.has(key)) continue;
				keepSet.add(key);
				const [r, c] = key.split(",").map(Number);
				newPowers.push([r, c, 2]);
			}

			// Second pass: bomb/hyper gems from 4+ straight runs (skip runs already producing a cross)
			for (const run of runs) {
				if (run.len < POWER_MIN) continue;
				// if this run contributed to a cross, skip it (cross takes priority)
				const contributesToCross = run.cells.some(([r, c]) => crossKeeps.has(r + "," + c));
				if (contributesToCross) continue;
				const cands = run.cells.filter(([r, c]) => !blast.has(r + "," + c));
				if (cands.length === 0) continue;
				let keep = cands.find(([r, c]) => movedCells.some((m) => m.r === r && m.c === c));
				if (!keep) keep = cands[Math.floor(cands.length / 2)];
				const kk = keep[0] + "," + keep[1];
				if (keepSet.has(kk)) continue;
				keepSet.add(kk);
				const lvl = run.len >= HYPER_MIN ? 3 : 1;
				newPowers.push([keep[0], keep[1], lvl]);
			}

			// Final clear = matches + blasts, minus the cells kept as power gems.
			const clearSet = new Set();
			for (const key of matched) if (!keepSet.has(key)) clearSet.add(key);
			for (const key of blast) if (!keepSet.has(key)) clearSet.add(key);

			// scoring: 10 per cleared gem, multiplied by the cascade depth
			const gained = clearSet.size * 10 * cascade;
			score += gained;
			levelProgress += gained;
			updateBest();
			if (levelProgress >= levelTarget) levelUp();

			if (blastCenters.length) {
				sndExplode();
				hapticBuzz(Math.max(...blastCenters.map((b) => b.level)));
				for (const b of blastCenters) {
					if (b.level === 3) spawnHyperBlast(b.r, b.c, b.t);
					else if (b.level === 2) spawnCrossBlast(b.r, b.c, b.t);
					else spawnExplosion(b.r, b.c, b.t);
				}
			} else {
				sndMatch(cascade);
			}

			for (const [r, c, level] of newPowers) power[r][c] = level;   // upgrade survivors
			await animateClear(clearSet);
			if (newPowers.length) await animatePowerForm(newPowers);
			const falls = collapseAndRefill();
			await animateFalls(falls);
		}
		// guarantee the board always has a legal move
		if (!hasAnyMove()) await spawnHyperGem();
	}

	// A hyper gem swapped directly with a normal gem detonates immediately, clearing
	// every gem of the color it was swapped into — this is the classic "color bomb"
	// activation (distinct from the cascade-triggered detonation power gems get when
	// caught inside someone else's match). No 3-in-a-row is required to trigger it.
	async function resolveHyperSwap(otherCell, targetColor) {
		if (gameMode === "timed") timedStarted = true;   // clock starts on the first match
		// Base clear: every gem of the swapped-into color, plus the hyper gem itself
		// (now sitting wherever the swap placed it).
		const matched = new Set();
		for (let r = 0; r < ROWS; r++) {
			for (let c = 0; c < COLS; c++) {
				if (grid[r][c] === targetColor || power[r][c] === 3) matched.add(r + "," + c);
			}
		}

		// Any bomb/cross gem caught in that clear detonates too — the same
		// chain-reaction rule a normal match applies (see resolveBoard).
		const blastCenters = [];   // {r,c,t,level} for the explosion FX
		const blast = new Set();
		const detonated = new Set();
		const queue = [];
		for (const key of matched) {
			const [r, c] = key.split(",").map(Number);
			if (power[r][c] === 1 || power[r][c] === 2) queue.push(key);
		}
		while (queue.length) {
			const key = queue.pop();
			if (detonated.has(key)) continue;
			detonated.add(key);
			const [pr, pc] = key.split(",").map(Number);
			const lvl = power[pr][pc];
			blastCenters.push({ r: pr, c: pc, t: grid[pr][pc], level: lvl });
			for (const [nr, nc] of blastCellsFor(pr, pc, lvl)) {
				const nk = nr + "," + nc;
				blast.add(nk);
				if ((power[nr][nc] === 1 || power[nr][nc] === 2) && !detonated.has(nk)) queue.push(nk);
			}
		}

		const clearSet = new Set(matched);
		for (const key of blast) clearSet.add(key);

		spawnHyperBlast(otherCell.r, otherCell.c, targetColor);
		for (const b of blastCenters) {
			if (b.level === 2) spawnCrossBlast(b.r, b.c, b.t);
			else spawnExplosion(b.r, b.c, b.t);
		}
		sndExplode();
		hapticBuzz(3);   // hyper-gem activation is always the strongest tier

		const gained = clearSet.size * 10;
		score += gained;
		levelProgress += gained;
		updateBest();
		if (levelProgress >= levelTarget) levelUp();

		for (const key of clearSet) {
			const [r, c] = key.split(",").map(Number);
			power[r][c] = 0;
		}
		await animateClear(clearSet);
		const falls = collapseAndRefill();
		await animateFalls(falls);
		await resolveBoard([]);   // let any resulting cascades play out
	}

	function updateBest() {
		if (score > best) {
			best = score;
			try { localStorage.setItem(bestKey(), String(best)); } catch (e) {}
		}
	}

	// Advance one or more levels (a big cascade can overflow several targets at once).
	function levelUp() {
		while (levelProgress >= levelTarget) {
			levelProgress -= levelTarget;
			level++;
			levelTarget = computeTarget(level);
			score += level * 250;     // level-completion bonus
			updateBest();
			updateBestLevel();
			levelFlash = 1.6;
			sndLevelUp();
			if (gameMode === "timed") timeLeft = TIMED_SECONDS;   // fresh minute for the new level
		}
	}

	// ---- Timed mode: Time's Up overlay ----
	function showTimeUp() {
		const overlay = document.getElementById("bj-timeup-overlay");
		if (!overlay) return;
		const lvlEl = document.getElementById("bj-timeup-level");
		const scoreEl = document.getElementById("bj-timeup-score");
		const bestLvlEl = document.getElementById("bj-timeup-best-level");
		if (lvlEl) lvlEl.textContent = String(level);
		if (scoreEl) scoreEl.textContent = String(score);
		if (bestLvlEl) bestLvlEl.textContent = String(bestLevel);
		overlay.classList.add("open");
	}
	function hideTimeUp() {
		const overlay = document.getElementById("bj-timeup-overlay");
		if (overlay) overlay.classList.remove("open");
	}
	// The clock hit zero: freeze the board (further swaps are blocked via the
	// `timedOver` check in onPointerDown) and show the Time's Up overlay.
	function triggerTimeUp() {
		if (timedOver) return;
		timedOver = true;
		updateBest();
		updateBestLevel();
		showTimeUp();
	}

	// Finds a gem with a legal move, returning the cell to highlight as a hint — the
	// gem that actually needs to move, not just either half of the swap — or null if
	// no legal move exists.
	function findHintMove() {
		const test = (a, b) => {
			// A hyper gem always has a legal move: swapping it with any neighbour
			// detonates it immediately, no 3-in-a-row required. It's the piece to move.
			if (power[a.r][a.c] === 3) return a;
			if (power[b.r][b.c] === 3) return b;
			swapCells(a, b);
			const matched = findMatches();
			swapCells(a, b);
			if (matched.size === 0) return null;
			// Whichever post-swap position landed inside the match was filled by the
			// OTHER original gem — that's the one to highlight, since it's the piece
			// the player needs to move, not the one that just gets swapped out of the way.
			return matched.has(a.r + "," + a.c) ? b : a;
		};
		for (let r = 0; r < ROWS; r++) {
			for (let c = 0; c < COLS; c++) {
				if (c < COLS - 1) {
					const hit = test({ r, c }, { r, c: c + 1 });
					if (hit) return hit;
				}
				if (r < ROWS - 1) {
					const hit = test({ r, c }, { r: r + 1, c });
					if (hit) return hit;
				}
			}
		}
		return null;
	}

	// Is there at least one swap that produces a match?
	function hasAnyMove() {
		return findHintMove() !== null;
	}

	// No legal move remains: instead of scrambling the whole board, drop a hyper gem
	// on a random cell as an escape hatch. The player detonates it themselves (swap it
	// into any neighbor) to clear a chunk of the board, which naturally opens up new
	// moves — a seamless, player-driven "reshuffle" instead of a jarring board reset.
	async function spawnHyperGem() {
		const r = Math.floor(Math.random() * ROWS);
		const c = Math.floor(Math.random() * COLS);
		power[r][c] = 3;
		await animatePowerForm([[r, c]]);
	}

	// Resolve a swap whose opening slide has already played (offsets back to 0,
	// model not yet swapped): commit it, or bounce it back if it makes no match.
	async function afterSlide(a, b) {
		// A hyper gem always commits on swap, regardless of whether a match forms —
		// swapping it onto a gem detonates it against that gem's color.
		const aHyper = power[a.r][a.c] === 3, bHyper = power[b.r][b.c] === 3;
		if (aHyper || bHyper) {
			const otherCell = aHyper ? b : a;
			const targetColor = grid[otherCell.r][otherCell.c];
			swapCells(a, b);
			await resolveHyperSwap(otherCell, targetColor);
			return;
		}
		swapCells(a, b);
		if (findMatches().size > 0) {
			// `b` now holds the gem the player dragged — prefer it as the power-gem keep.
			await resolveBoard([b, a]);
		} else {
			sndSwapBad();
			await animateSwap(a, b);   // bounce back
			swapCells(a, b);
		}
	}

	// ---- Tap-tap swap: play the full slide from rest, then resolve. ----
	async function trySwap(a, b) {
		if (busy) return;
		busy = true;
		selected = null;
		await animateSwap(a, b);
		await afterSlide(a, b);
		busy = false;
	}

	// Commit a live drag: finish the slide from wherever the gem currently sits
	// (the player dragged it partway), then resolve. `a` is the dragged gem, `b`
	// the neighbour it's being pushed into.
	async function commitDrag(a, b) {
		busy = true;
		selected = null;
		const horiz = a.r === b.r;
		const full = horiz ? (b.c - a.c) * GEM : (b.r - a.r) * GEM;
		const cur0 = horiz ? offset[a.r][a.c].dx : offset[a.r][a.c].dy;
		// Scale the finishing slide by how far it actually has left to travel — since
		// release now decides the commit (rather than mid-drag auto-commit), the gem
		// is usually already sitting at (or near) the full offset by the time this
		// runs, and a flat 90ms here would just be dead air before the match/clear
		// animation starts.
		const dur = Math.round(90 * Math.min(1, Math.abs(full - cur0) / GEM));
		await tween(dur, (p) => {
			const cur = cur0 + (full - cur0) * p;
			offset[a.r][a.c] = horiz ? { dx: cur, dy: 0 } : { dx: 0, dy: cur };
			offset[b.r][b.c] = horiz ? { dx: -cur, dy: 0 } : { dx: 0, dy: -cur };
		}, easeOutQuad);
		offset[a.r][a.c] = { dx: 0, dy: 0 };
		offset[b.r][b.c] = { dx: 0, dy: 0 };
		await afterSlide(a, b);
		busy = false;
	}

	function adjacent(a, b) {
		return (Math.abs(a.r - b.r) + Math.abs(a.c - b.c)) === 1;
	}

	// ---- Input (pointer: covers mouse + touch) ----
	// Two ways to play, both fire as early as possible:
	//   • Drag: press a gem and move toward a neighbour — the swap fires the instant
	//     you cross a small threshold, without waiting for release.
	//   • Tap-tap: tap a gem, then tap an adjacent gem.
	let pointerDown = null;          // {r,c,x,y} armed drag origin (internal coords)
	let dragPreview = null;          // {a, b} cells currently shown mid-drag
	const COMMIT_FRACTION = 0.5;     // drag this far toward a neighbour to commit

	function pointFromEvent(e) {
		const rect = canvas.getBoundingClientRect();
		const sx = CANVAS_W / rect.width, sy = CANVAS_H / rect.height;
		return { x: (e.clientX - rect.left) * sx, y: (e.clientY - rect.top) * sy };
	}

	function cellFromEvent(e) {
		const p = pointFromEvent(e);
		if (p.y < BOARD_Y) return null;
		const c = Math.floor((p.x - BOARD_X) / GEM);
		const r = Math.floor((p.y - BOARD_Y) / GEM);
		if (r < 0 || r >= ROWS || c < 0 || c >= COLS) return null;
		return { r, c, x: p.x, y: p.y };
	}

	function onPointerDown(e) {
		if (timedOver) return;
		idleTime = 0;
		hint = null;
		if (busy || !assetsReady) return;
		const cell = cellFromEvent(e);
		if (!cell) return;
		// tap-tap: a gem is already selected and this one is adjacent → swap now
		// (in debug mode any gem on the board is a valid swap target)
		if (selected && (debugMode || adjacent(selected, cell))) {
			const a = selected;
			selected = null;
			pointerDown = null;
			trySwap(a, cell);
			return;
		}
		// otherwise select this gem and arm a drag from here
		selected = { r: cell.r, c: cell.c };
		pointerDown = cell;
		if (canvas.setPointerCapture) { try { canvas.setPointerCapture(e.pointerId); } catch (err) {} }
		sndSelect();
	}

	// Reset the offsets of the cells currently shown mid-drag back to home.
	function clearDragOffsets() {
		if (!dragPreview) return;
		const { a, b } = dragPreview;
		if (a) offset[a.r][a.c] = { dx: 0, dy: 0 };
		if (b) offset[b.r][b.c] = { dx: 0, dy: 0 };
	}

	function onPointerMove(e) {
		if (busy || !pointerDown || !assetsReady) return;
		const p = pointFromEvent(e);
		const dx = p.x - pointerDown.x, dy = p.y - pointerDown.y;
		// dominant axis decides which neighbour we're heading toward
		const horiz = Math.abs(dx) >= Math.abs(dy);
		const dir = horiz ? (dx > 0 ? 1 : -1) : (dy > 0 ? 1 : -1);
		const tr = pointerDown.r + (horiz ? 0 : dir);
		const tc = pointerDown.c + (horiz ? dir : 0);
		const onBoard = tr >= 0 && tr < ROWS && tc >= 0 && tc < COLS;

		// distance along the active axis, clamped to a single cell (can't go past
		// the edge when there's no neighbour that way)
		let m = horiz ? dx : dy;
		if (!onBoard) m = 0;
		m = Math.max(-GEM, Math.min(GEM, m));

		const a = { r: pointerDown.r, c: pointerDown.c };
		const b = onBoard ? { r: tr, c: tc } : null;

		// the dragged gem follows the pointer; the neighbour slides the other way.
		// Purely visual while held — nothing commits until release (onPointerUp),
		// so the player can drag past the threshold and still pull back to cancel.
		clearDragOffsets();
		offset[a.r][a.c] = horiz ? { dx: m, dy: 0 } : { dx: 0, dy: m };
		if (b) offset[b.r][b.c] = horiz ? { dx: -m, dy: 0 } : { dx: 0, dy: -m };
		dragPreview = { a, b };
	}

	function onPointerUp() {
		pointerDown = null;
		if (dragPreview && !busy) {
			const { a, b } = dragPreview;
			dragPreview = null;
			// Commit if released at least halfway toward the neighbour (same
			// threshold as before), otherwise ease back to the resting position.
			const horiz = b && a.r === b.r;
			const m = b ? (horiz ? offset[a.r][a.c].dx : offset[a.r][a.c].dy) : 0;
			if (b && Math.abs(m) >= GEM * COMMIT_FRACTION) commitDrag(a, b);
			else snapBack(a, b);
		} else {
			dragPreview = null;
		}
	}

	// Ease a half-finished drag back to its resting position.
	async function snapBack(a, b) {
		busy = true;
		const ax = offset[a.r][a.c].dx, ay = offset[a.r][a.c].dy;
		const bx = b ? offset[b.r][b.c].dx : 0, by = b ? offset[b.r][b.c].dy : 0;
		await tween(90, (p) => {
			const k = 1 - p;
			offset[a.r][a.c] = { dx: ax * k, dy: ay * k };
			if (b) offset[b.r][b.c] = { dx: bx * k, dy: by * k };
		}, easeOutQuad);
		offset[a.r][a.c] = { dx: 0, dy: 0 };
		if (b) offset[b.r][b.c] = { dx: 0, dy: 0 };
		busy = false;
	}

	canvas.addEventListener("pointerdown", (e) => { e.preventDefault(); onPointerDown(e); });
	canvas.addEventListener("pointermove", (e) => { e.preventDefault(); onPointerMove(e); });
	canvas.addEventListener("pointerup", (e) => { e.preventDefault(); onPointerUp(); });
	canvas.addEventListener("pointercancel", onPointerUp);
	canvas.style.touchAction = "none";

	// ---- Rendering ----
	function drawBackground() {
		if (bgImg) {
			// cover the whole canvas
			const ar = bgImg.width / bgImg.height, car = CANVAS_W / CANVAS_H;
			let w, h;
			if (ar > car) { h = CANVAS_H; w = h * ar; } else { w = CANVAS_W; h = w / ar; }
			ctx.drawImage(bgImg, (CANVAS_W - w) / 2, (CANVAS_H - h) / 2, w, h);
		} else {
			ctx.fillStyle = "#0a1740";
			ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
		}
		// darken the board area slightly for contrast
		ctx.fillStyle = "rgba(6, 14, 40, 0.35)";
		ctx.fillRect(BOARD_X, BOARD_Y, BOARD_W, BOARD_H);
	}

	// Rounded-rectangle path helper (ctx.roundRect isn't on older iOS Safari).
	function roundRectPath(x, y, w, h, r) {
		r = Math.min(r, w / 2, h / 2);
		ctx.beginPath();
		ctx.moveTo(x + r, y);
		ctx.arcTo(x + w, y, x + w, y + h, r);
		ctx.arcTo(x + w, y + h, x, y + h, r);
		ctx.arcTo(x, y + h, x, y, r);
		ctx.arcTo(x, y, x + w, y, r);
		ctx.closePath();
	}

	function drawHUD() {
		ctx.fillStyle = "rgba(6, 14, 40, 0.55)";
		ctx.fillRect(0, 0, CANVAS_W, HUD_H);

		ctx.textBaseline = "middle";

		// top-left: Best score (shifted down to leave room for FPS counter above)
		ctx.textAlign = "left";
		ctx.fillStyle = "#9ec7ff";
		ctx.font = "bold 16px 'Trebuchet MS', Verdana, sans-serif";
		ctx.fillText("Best: " + best, 16, 36);

		// top-right (Timed mode only): countdown clock, mirrors "Best" on the left.
		// Right-aligned short of the gear/game-mode icon buttons (which float over
		// the canvas's top-right corner) so the two never overlap.
		if (gameMode === "timed") {
			ctx.textAlign = "right";
			ctx.fillStyle = timeLeft <= 10 ? "#ff6b6b" : "#9ec7ff";
			ctx.font = "bold 16px 'Trebuchet MS', Verdana, sans-serif";
			ctx.fillText(formatTime(timeLeft), CANVAS_W - 106, 36);
		}

		// center: LEVEL and Score stacked
		ctx.textAlign = "center";
		ctx.fillStyle = "#ffe9a8";
		ctx.font = "bold 22px 'Trebuchet MS', Verdana, sans-serif";
		ctx.fillText("LEVEL " + level, CANVAS_W / 2, 20);

		ctx.fillStyle = "#ffffff";
		ctx.font = "bold 24px 'Trebuchet MS', Verdana, sans-serif";
		ctx.fillText("Score: " + score, CANVAS_W / 2, 47);

		// progress meter toward the next level
		const bx = 16, by = 66, bw = CANVAS_W - 32, bh = 14;
		const p = levelTarget > 0 ? Math.max(0, Math.min(1, levelProgress / levelTarget)) : 0;
		ctx.fillStyle = "rgba(0, 0, 0, 0.45)";
		roundRectPath(bx, by, bw, bh, 7); ctx.fill();
		if (p > 0) {
			ctx.fillStyle = "#f3c200";
			roundRectPath(bx, by, Math.max(bh, bw * p), bh, 7); ctx.fill();
		}
		ctx.strokeStyle = "rgba(255, 233, 168, 0.6)";
		ctx.lineWidth = 2;
		roundRectPath(bx, by, bw, bh, 7); ctx.stroke();
	}

	// "Level Up!" celebration that fades out over its final moments.
	function drawLevelFlash() {
		if (levelFlash <= 0) return;
		const a = Math.min(1, levelFlash / 0.5);
		ctx.save();
		ctx.globalAlpha = a;
		ctx.textAlign = "center";
		ctx.textBaseline = "middle";
		ctx.shadowColor = "rgba(0, 0, 0, 0.65)";
		ctx.shadowBlur = 10;
		ctx.fillStyle = "#ffe9a8";
		ctx.font = "bold 46px 'Trebuchet MS', Verdana, sans-serif";
		ctx.fillText("LEVEL " + level, CANVAS_W / 2, BOARD_Y + BOARD_H / 2 - 18);
		ctx.fillStyle = "#ffffff";
		ctx.font = "bold 24px 'Trebuchet MS', Verdana, sans-serif";
		ctx.fillText("Level Up!", CANVAS_W / 2, BOARD_Y + BOARD_H / 2 + 26);
		ctx.restore();
	}

	function drawGemAt(r, c) {
		const t = grid[r][c];
		if (t === -1) return;
		const off = offset[r][c] || { dx: 0, dy: 0 };
		const s = scale[r][c] == null ? 1 : scale[r][c];
		const homeX = BOARD_X + c * GEM, homeY = BOARD_Y + r * GEM;
		const dx = homeX + GEM / 2 + off.dx - (GEM * s) / 2;
		const dy = homeY + GEM / 2 + off.dy - (GEM * s) / 2;
		const size = GEM * s;
		const ccx = dx + size / 2, ccy = dy + size / 2;
		const isHyper = power[r][c] === 3;
		// Hyper gems always render as the white gem model, recolored rainbow, regardless
		// of the color type they matched from (that type still drives blast targeting).
		const st = gemAnimState(isHyper ? 0 : t, r, c, isHyper);
		if (!st.a) {
			ctx.fillStyle = isHyper ? `hsl(${(selPulse * 60) % 360},85%,55%)` : GEM_PALETTE[t % 7];
			ctx.fillRect(dx, dy, size, size);
		} else if (isHyper) {
			drawRainbowGem(st.a, dx, dy, size);
		} else {
			ctx.drawImage(st.a, dx, dy, size, size);
		}
		// bomb/hyper halo and cross shine are drawn in a second pass in drawGems() so
		// they overlap neighboring gems instead of sitting underneath them
	}

	// Recolors the white gem sprite into a shifting rainbow while keeping its shading
	// (highlights/shadows) intact — "color" blend takes hue/saturation from the
	// gradient but luminosity from the gem art, then "destination-in" re-clips the
	// result back to the gem's original silhouette (the blend fill covers the full
	// square, including transparent corners).
	const hyperBuf = document.createElement("canvas");
	hyperBuf.width = GEM; hyperBuf.height = GEM;
	const hyperCtx = hyperBuf.getContext("2d");
	function drawRainbowGem(img, dx, dy, size) {
		hyperCtx.clearRect(0, 0, GEM, GEM);
		hyperCtx.globalCompositeOperation = "source-over";
		hyperCtx.drawImage(img, 0, 0, GEM, GEM);
		const hue = (selPulse * 60) % 360;
		const grad = hyperCtx.createLinearGradient(0, 0, GEM, GEM);
		grad.addColorStop(0, `hsl(${hue},90%,55%)`);
		grad.addColorStop(0.5, `hsl(${(hue + 120) % 360},90%,55%)`);
		grad.addColorStop(1, `hsl(${(hue + 240) % 360},90%,55%)`);
		hyperCtx.globalCompositeOperation = "color";
		hyperCtx.fillStyle = grad;
		hyperCtx.fillRect(0, 0, GEM, GEM);
		hyperCtx.globalCompositeOperation = "destination-in";
		hyperCtx.drawImage(img, 0, 0, GEM, GEM);
		hyperCtx.globalCompositeOperation = "source-over";
		ctx.drawImage(hyperBuf, dx, dy, size, size);
	}

	// Gem colours for FX/fallback, and a tiny 3-digit-hex → rgba() helper.
	const GEM_PALETTE = ["#fff", "#e44", "#fd0", "#3c6", "#39f", "#b3f", "#f93"];
	function hexToRgba(h, a) {
		const n = h.slice(1);
		const r = parseInt(n[0] + n[0], 16), g = parseInt(n[1] + n[1], 16), b = parseInt(n[2] + n[2], 16);
		return "rgba(" + r + "," + g + "," + b + "," + a + ")";
	}

	// Pulsing coloured halo behind a bomb gem (level 1) so it reads as "special".
	function drawPowerGlow(cx, cy, t) {
		const col = GEM_PALETTE[((t % 7) + 7) % 7];
		const pulse = 0.55 + 0.45 * Math.abs(Math.sin(selPulse * 3));
		const rad = GEM * 0.78;
		const g = ctx.createRadialGradient(cx, cy, GEM * 0.12, cx, cy, rad);
		g.addColorStop(0, hexToRgba(col, 0));
		g.addColorStop(0.55, hexToRgba(col, 0));
		g.addColorStop(0.78, hexToRgba(col, 0.5 * pulse));
		g.addColorStop(1, hexToRgba(col, 0));
		ctx.save();
		ctx.globalCompositeOperation = "lighter";
		ctx.fillStyle = g;
		ctx.beginPath();
		ctx.arc(cx, cy, rad, 0, Math.PI * 2);
		ctx.fill();
		ctx.restore();
	}

	// Rotating rainbow-ring halo behind a hyper gem (level 3, 5-in-a-row). Built on an
	// offscreen buffer: a conic gradient sweeps the full spectrum around the center,
	// then a radial gradient is punched through it (destination-in) to leave a soft
	// ring rather than a solid disc. The conic gradient's start angle advances every
	// frame so the rainbow visibly spins, independent of gem selection. The ring itself
	// is a one-way sonar ping: it grows outward from the gem, fading out as it reaches
	// its largest size, then resets to the center and expands again.
	const HALO_SIZE = GEM * 2;
	const HALO_CYCLE_S = 1.4;   // seconds for one expand-and-fade ping
	const haloBuf = document.createElement("canvas");
	haloBuf.width = HALO_SIZE; haloBuf.height = HALO_SIZE;
	const haloCtx = haloBuf.getContext("2d");
	function drawHyperGlow(cx, cy) {
		const hc = HALO_SIZE / 2;
		haloCtx.clearRect(0, 0, HALO_SIZE, HALO_SIZE);
		if (haloCtx.createConicGradient) {
			const cg = haloCtx.createConicGradient(selPulse * 1.2, hc, hc);
			for (let i = 0; i <= 6; i++) cg.addColorStop(i / 6, `hsl(${i * 60},95%,60%)`);
			haloCtx.fillStyle = cg;
		} else {
			// Fallback for browsers without conic gradients: a single cycling hue.
			haloCtx.fillStyle = `hsl(${(selPulse * 90) % 360},95%,60%)`;
		}
		haloCtx.fillRect(0, 0, HALO_SIZE, HALO_SIZE);
		const cyclePos = (selPulse % HALO_CYCLE_S) / HALO_CYCLE_S;   // 0..1, repeating
		const rad = GEM * 0.15 + GEM * 0.7 * cyclePos;                 // ping expands outward
		const alpha = 1 - cyclePos;                                     // ...and fades as it grows
		const bandW = GEM * 0.3;
		const mask = haloCtx.createRadialGradient(hc, hc, Math.max(1, rad - bandW), hc, hc, rad);
		mask.addColorStop(0, "rgba(255,255,255,0)");
		mask.addColorStop(0.6, `rgba(255,255,255,${0.75 * alpha})`);
		mask.addColorStop(1, "rgba(255,255,255,0)");
		haloCtx.globalCompositeOperation = "destination-in";
		haloCtx.fillStyle = mask;
		haloCtx.fillRect(0, 0, HALO_SIZE, HALO_SIZE);
		haloCtx.globalCompositeOperation = "source-over";

		ctx.save();
		ctx.globalCompositeOperation = "lighter";
		ctx.drawImage(haloBuf, cx - hc, cy - hc);
		ctx.restore();
	}

	// Translucent sparkle "shine" drawn ON TOP of a cross gem (level 2): two crossing
	// needles whose arms expand and contract back and forth, with a brightness twinkle.
	// Low alpha so the gem clearly shows through. No background aura.
	function drawCrossShine(cx, cy, gemType) {
		const t = selPulse;
		const expand = 0.5 + 0.5 * Math.sin(t * 3);         // arms pulse in and out
		const twinkle = 0.5 + 0.5 * Math.sin(t * 6);        // brightness flicker
		const R = GEM * (0.48 + 0.42 * expand);              // longer arms
		const w = GEM * 0.10;                                 // wider/denser arms
		const gemCol = GEM_PALETTE[((gemType % 7) + 7) % 7]; // gem tint color
		ctx.save();
		ctx.globalCompositeOperation = "lighter";
		ctx.translate(cx, cy);
		const spike = (vx, vy, wx, wy) => {
			// white-to-gem-color taper: bright white core fading into gem hue at tips
			const grad = ctx.createLinearGradient(0, 0, vx, vy);
			grad.addColorStop(0,   hexToRgba("#fff", 0.85 + 0.15 * twinkle));
			grad.addColorStop(0.25, hexToRgba("#fff", 0.6 + 0.2 * twinkle));
			grad.addColorStop(0.6, hexToRgba(gemCol, 0.55 + 0.2 * twinkle));
			grad.addColorStop(1,   hexToRgba(gemCol, 0));
			ctx.fillStyle = grad;
			ctx.beginPath();
			ctx.moveTo(vx, vy);
			ctx.lineTo(wx, wy);
			ctx.lineTo(-vx, -vy);
			ctx.lineTo(-wx, -wy);
			ctx.closePath();
			ctx.fill();
		};
		spike(0, -R, w, 0);   // vertical needle
		spike(-R, 0, 0, w);   // horizontal needle
		ctx.restore();
		ctx.save();
		ctx.globalCompositeOperation = "lighter";
		const core = ctx.createRadialGradient(cx, cy, 0, cx, cy, GEM * 0.32);
		core.addColorStop(0,    hexToRgba("#fff", 0.9 + 0.1 * twinkle));
		core.addColorStop(0.35, hexToRgba(gemCol, 0.45 + 0.35 * twinkle));
		core.addColorStop(1,    hexToRgba(gemCol, 0));
		ctx.fillStyle = core;
		ctx.beginPath();
		ctx.arc(cx, cy, GEM * 0.32, 0, Math.PI * 2);
		ctx.fill();
		ctx.restore();
	}

	// ---- Explosion FX ----
	function spawnExplosion(r, c, t) {
		const col = GEM_PALETTE[((t % 7) + 7) % 7];
		const cx = BOARD_X + c * GEM + GEM / 2, cy = BOARD_Y + r * GEM + GEM / 2;
		blasts.push({ x: cx, y: cy, age: 0, dur: 0.55, color: col });
		const N = 16;
		for (let i = 0; i < N; i++) {
			const ang = (i / N) * Math.PI * 2 + Math.random() * 0.3;
			const sp = 200 + Math.random() * 300;
			sparks.push({
				x: cx, y: cy, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp,
				age: 0, dur: 0.45 + Math.random() * 0.35, color: col, size: 2 + Math.random() * 2.5
			});
		}
	}

	// Cross gem: light beams sweep down the full row and column, plus a center pop.
	function spawnCrossBlast(r, c, t) {
		const col = GEM_PALETTE[((t % 7) + 7) % 7];
		beams.push({ r, c, age: 0, dur: 0.5, color: col });
		const cx = BOARD_X + c * GEM + GEM / 2, cy = BOARD_Y + r * GEM + GEM / 2;
		for (let i = 0; i < 12; i++) {
			const ang = Math.random() * Math.PI * 2;
			const sp = 160 + Math.random() * 220;
			sparks.push({
				x: cx, y: cy, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp,
				age: 0, dur: 0.4 + Math.random() * 0.3, color: col, size: 2 + Math.random() * 2.5
			});
		}
	}

	// Hyper gem (color bomb): a big shockwave from the detonating gem, plus a smaller
	// burst at every other gem on the board sharing its color.
	function spawnHyperBlast(r, c, t) {
		const col = GEM_PALETTE[((t % 7) + 7) % 7];
		const cx = BOARD_X + c * GEM + GEM / 2, cy = BOARD_Y + r * GEM + GEM / 2;
		blasts.push({ x: cx, y: cy, age: 0, dur: 0.7, color: col });
		for (let rr = 0; rr < ROWS; rr++) {
			for (let cc = 0; cc < COLS; cc++) {
				if (grid[rr][cc] !== t) continue;
				const tx = BOARD_X + cc * GEM + GEM / 2, ty = BOARD_Y + rr * GEM + GEM / 2;
				blasts.push({ x: tx, y: ty, age: 0, dur: 0.4 + Math.random() * 0.2, color: col });
				for (let i = 0; i < 6; i++) {
					const ang = Math.random() * Math.PI * 2;
					const sp = 100 + Math.random() * 180;
					sparks.push({
						x: tx, y: ty, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp,
						age: 0, dur: 0.35 + Math.random() * 0.3, color: col, size: 2 + Math.random() * 2
					});
				}
			}
		}
	}

	function updateFX(dt) {
		for (const b of blasts) b.age += dt;
		if (blasts.length) blasts = blasts.filter((b) => b.age < b.dur);
		for (const bm of beams) bm.age += dt;
		if (beams.length) beams = beams.filter((bm) => bm.age < bm.dur);
		for (const s of sparks) {
			s.age += dt;
			s.x += s.vx * dt; s.y += s.vy * dt;
			s.vy += 260 * dt;   // gravity
			s.vx *= 0.98;
		}
		if (sparks.length) sparks = sparks.filter((s) => s.age < s.dur);

		// sheen sweep
		if (sheenActive) {
			sheenAge += dt / 1.4;   // sweep duration ~1.4s
			if (sheenAge >= 1) { sheenActive = false; sheenAge = 0; sheenCooldown = 6 + Math.random() * 8; }
		} else {
			sheenCooldown -= dt;
			if (sheenCooldown <= 0) { sheenActive = true; sheenAge = 0; }
		}
	}

	function drawSheen() {
		if (!sheenActive) return;
		// The band sweeps diagonally: offset goes from -(BOARD_W+BOARD_H) to +(BOARD_W+BOARD_H)
		const diag = BOARD_W + BOARD_H;
		const offset = -diag + sheenAge * diag * 2.4;
		const bandW = diag * 0.22;   // width of the gloss stripe

		ctx.save();
		// clip to the board area only
		ctx.beginPath();
		ctx.rect(BOARD_X, BOARD_Y, BOARD_W, BOARD_H);
		ctx.clip();

		// rotate 45° around board centre to sweep top-left → bottom-right
		const cx = BOARD_X + BOARD_W / 2, cy = BOARD_Y + BOARD_H / 2;
		ctx.translate(cx, cy);
		ctx.rotate(Math.PI / 4);

		// gradient perpendicular to the sweep direction (now horizontal after rotate)
		const grad = ctx.createLinearGradient(offset - bandW, 0, offset + bandW, 0);
		grad.addColorStop(0,    "rgba(255,255,255,0)");
		grad.addColorStop(0.35, "rgba(255,255,255,0.06)");
		grad.addColorStop(0.5,  "rgba(255,255,255,0.18)");
		grad.addColorStop(0.65, "rgba(255,255,255,0.06)");
		grad.addColorStop(1,    "rgba(255,255,255,0)");
		ctx.fillStyle = grad;
		ctx.fillRect(offset - bandW, -diag, bandW * 2, diag * 2);
		ctx.restore();
	}

	function drawFX() {
		ctx.save();
		ctx.globalCompositeOperation = "lighter";
		// Cross-gem beams: full-board row/column bars with a bright white core.
		for (const bm of beams) {
			const p = bm.age / bm.dur, al = 1 - p;
			const cy = BOARD_Y + bm.r * GEM + GEM / 2;
			const cx = BOARD_X + bm.c * GEM + GEM / 2;
			const th = GEM * (0.12 + 0.55 * Math.sin(Math.min(1, p) * Math.PI));
			ctx.fillStyle = hexToRgba(bm.color, 0.5 * al);
			ctx.fillRect(BOARD_X, cy - th / 2, BOARD_W, th);
			ctx.fillRect(cx - th / 2, BOARD_Y, th, BOARD_H);
			const cth = th * 0.35;
			ctx.fillStyle = hexToRgba("#fff", 0.7 * al);
			ctx.fillRect(BOARD_X, cy - cth / 2, BOARD_W, cth);
			ctx.fillRect(cx - cth / 2, BOARD_Y, cth, BOARD_H);
		}
		for (const b of blasts) {
			const p = b.age / b.dur, al = 1 - p;
			const rad = GEM * 0.3 + GEM * 2.6 * p;
			ctx.strokeStyle = hexToRgba(b.color, 0.6 * al);
			ctx.lineWidth = 2 + 6 * al;
			ctx.beginPath();
			ctx.arc(b.x, b.y, rad, 0, Math.PI * 2);
			ctx.stroke();
			if (p < 0.35) {
				const fa = (0.35 - p) / 0.35;
				const g = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, GEM * 1.3);
				g.addColorStop(0, hexToRgba("#fff", 0.8 * fa));
				g.addColorStop(1, hexToRgba(b.color, 0));
				ctx.fillStyle = g;
				ctx.beginPath();
				ctx.arc(b.x, b.y, GEM * 1.3, 0, Math.PI * 2);
				ctx.fill();
			}
		}
		for (const s of sparks) {
			const al = 1 - s.age / s.dur;
			ctx.fillStyle = hexToRgba(s.color, al);
			ctx.beginPath();
			ctx.arc(s.x, s.y, s.size * al + 0.5, 0, Math.PI * 2);
			ctx.fill();
		}
		ctx.restore();
	}

	function drawGems() {
		for (let r = 0; r < ROWS; r++) {
			for (let c = 0; c < COLS; c++) drawGemAt(r, c);
		}
		// keep the gem being dragged above its neighbours
		if (dragPreview && dragPreview.a) drawGemAt(dragPreview.a.r, dragPreview.a.c);
		// second pass: draw bomb/hyper halos and cross shines on top of all gems so
		// they overlap neighbors instead of sitting underneath them
		for (let r = 0; r < ROWS; r++) {
			for (let c = 0; c < COLS; c++) {
				const p = power[r][c];
				if (p === 0 || grid[r][c] === -1) continue;
				const t = grid[r][c];
				const off = offset[r][c] || { dx: 0, dy: 0 };
				const ccx = BOARD_X + c * GEM + GEM / 2 + off.dx;
				const ccy = BOARD_Y + r * GEM + GEM / 2 + off.dy;
				if (p === 1) drawPowerGlow(ccx, ccy, t);
				else if (p === 2) drawCrossShine(ccx, ccy, t);
				else if (p === 3) drawHyperGlow(ccx, ccy);
			}
		}
	}

	function drawSelection() {
		if (!selected || dragPreview) return;
		const x = BOARD_X + selected.c * GEM, y = BOARD_Y + selected.r * GEM;
		const pulse = 2 + Math.sin(selPulse * 6) * 1.5;
		ctx.strokeStyle = "rgba(255, 233, 168, 0.95)";
		ctx.lineWidth = 3;
		ctx.strokeRect(x + pulse, y + pulse, GEM - pulse * 2, GEM - pulse * 2);
	}

	// After HINT_IDLE_S of no input, a soft golden glow + outline pulses on the gem
	// that has a legal move available, to nudge an idle player without being intrusive.
	function drawHint() {
		if (!hint || busy) return;
		const { r, c } = hint;
		const x = BOARD_X + c * GEM, y = BOARD_Y + r * GEM;
		const cx = x + GEM / 2, cy = y + GEM / 2;
		const pulse = 0.5 + 0.5 * Math.sin(selPulse * 3);

		ctx.save();
		ctx.globalCompositeOperation = "lighter";
		const g = ctx.createRadialGradient(cx, cy, GEM * 0.1, cx, cy, GEM * 0.65);
		g.addColorStop(0, `rgba(255, 233, 168, ${0.55 * pulse})`);
		g.addColorStop(1, "rgba(255, 233, 168, 0)");
		ctx.fillStyle = g;
		ctx.beginPath();
		ctx.arc(cx, cy, GEM * 0.65, 0, Math.PI * 2);
		ctx.fill();
		ctx.restore();

		ctx.save();
		ctx.strokeStyle = `rgba(255, 233, 168, ${0.6 + 0.4 * pulse})`;
		ctx.lineWidth = 3;
		const inset = 4;
		roundRectPath(x + inset, y + inset, GEM - inset * 2, GEM - inset * 2, 8);
		ctx.stroke();
		ctx.restore();
	}

	// Cosmic loading screen shown until every asset has decoded. The bar tracks
	// real progress (loadDone / loadTotal) so the wait reads as intentional.
	function drawLoading() {
		const g = ctx.createLinearGradient(0, 0, 0, CANVAS_H);
		g.addColorStop(0, "#0a1a44");
		g.addColorStop(1, "#050a1f");
		ctx.fillStyle = g;
		ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

		const cx = CANVAS_W / 2, cy = CANVAS_H / 2;
		ctx.textAlign = "center";
		ctx.textBaseline = "middle";

		ctx.shadowColor = "rgba(0, 0, 0, 0.6)";
		ctx.shadowBlur = 12;
		ctx.fillStyle = "#ffe9a8";
		ctx.font = "bold 40px 'Trebuchet MS', Verdana, sans-serif";
		ctx.fillText("BEJEWELED 2", cx, cy - 64);
		ctx.shadowBlur = 0;

		const bw = Math.min(360, CANVAS_W - 80), bh = 16;
		const bx = cx - bw / 2, by = cy - 8;
		const p = loadTotal > 0 ? Math.min(1, loadDone / loadTotal) : 1;
		ctx.fillStyle = "rgba(0, 0, 0, 0.4)";
		roundRectPath(bx, by, bw, bh, 8); ctx.fill();
		if (p > 0) {
			ctx.fillStyle = "#f3c200";
			roundRectPath(bx, by, Math.max(bh, bw * p), bh, 8); ctx.fill();
		}
		ctx.strokeStyle = "rgba(255, 233, 168, 0.6)";
		ctx.lineWidth = 2;
		roundRectPath(bx, by, bw, bh, 8); ctx.stroke();

		ctx.fillStyle = "rgba(255, 233, 168, 0.85)";
		ctx.font = "bold 16px 'Trebuchet MS', Verdana, sans-serif";
		ctx.fillText("Loading " + Math.round(p * 100) + "%", cx, by + bh + 26);
	}

	function render() {
		if (!assetsReady) { drawLoading(); return; }
		drawBackground();
		drawHUD();
		drawGems();
		drawSheen();
		drawFX();
		drawHint();
		drawSelection();
		drawLevelFlash();
		drawFPS();
	}

	function drawFPS() {
		if (!showFPS) return;
		ctx.save();
		ctx.textAlign = "left";
		ctx.textBaseline = "top";
		ctx.font = "bold 12px monospace";
		ctx.fillStyle = fps >= 50 ? "#7CFC7C" : fps >= 30 ? "#ffd34d" : "#ff6b6b";
		ctx.fillText(Math.round(fps) + " fps", 8, 4);
		ctx.restore();
	}

	let lastT = performance.now();
	function frame(now) {
		const raw = (now - lastT) / 1000;        // true frame time (for the FPS read)
		const dt = Math.min(0.05, raw);           // clamped for stable game/animation
		lastT = now;
		if (raw > 0) fps = fps * 0.9 + (1 / raw) * 0.1;
		selPulse += dt;
		updateFX(dt);
		if (levelFlash > 0) levelFlash = Math.max(0, levelFlash - dt);
		idleTime += dt;
		if (!busy && !hint && !timedOver && idleTime >= HINT_IDLE_S) hint = findHintMove();
		// Timed mode's clock doesn't start until the first match clears (timedStarted),
		// then keeps running through swap/cascade animations (that's the pressure the
		// mode is built around) but pauses while any menu overlay is open, so opening
		// Settings mid-run doesn't unfairly burn the clock.
		if (gameMode === "timed" && timedStarted && !timedOver && !document.querySelector(".bj-settings-overlay.open")) {
			timeLeft = Math.max(0, timeLeft - dt);
			if (timeLeft <= 0) triggerTimeUp();
		}
		render();
		requestAnimationFrame(frame);
	}

	// ---- Responsive sizing: fit the canvas into its frame / the viewport ----
	const frame_el = document.getElementById("bj-frame");
	function fitCanvas() {
		const fs = document.fullscreenElement === frame_el ||
			(frame_el && frame_el.classList.contains("bj-fake-fullscreen"));
		const isApp = document.body.classList.contains("bj-app");
		let availW, availH;
		if (fs || isApp) {
			availW = window.innerWidth;
			availH = window.innerHeight;
			// Landscape fullscreen/app: widen the board so it fills the screen
			// instead of leaving empty gutters on either side. Prefer the
			// orientation media query over comparing innerWidth/innerHeight —
			// on iOS Safari those can briefly report stale/mismatched values
			// (e.g. mid-toolbar-collapse) and falsely flip the board to WIDE
			// while the device is actually portrait.
			const landscape = window.matchMedia
				? window.matchMedia("(orientation: landscape)").matches
				: availW > availH;
			setColumns(landscape ? WIDE_COLS : NORMAL_COLS);
		} else {
			setColumns(NORMAL_COLS);
			// #bj-frame is inline-flex (shrink-to-fit), so measure a stable block
			// ancestor instead — using the frame itself would be circular (→ 0px).
			// Fall back to the viewport width when the container hasn't laid out yet
			// (e.g. during the template's `is-preload` phase its width is 0).
			const stage = document.getElementById("bj-stage");
			const container = stage || (frame_el && frame_el.parentElement);
			let cw = (container && container.clientWidth) || 0;
			if (cw <= 0) cw = Math.min(CANVAS_W, window.innerWidth - 24);
			availW = Math.min(CANVAS_W, cw);
			availH = window.innerHeight * 0.82;
		}
		if (availW <= 0) availW = CANVAS_W;
		if (availH <= 0) availH = CANVAS_H;
		const ar = CANVAS_W / CANVAS_H;
		let w = availW, h = w / ar;
		if (h > availH) { h = availH; w = h * ar; }
		canvas.style.width = Math.round(w) + "px";
		canvas.style.height = Math.round(h) + "px";
		// Belt-and-suspenders: shrink the overlaid icon buttons in lockstep with the
		// canvas whenever it renders below its logical resolution (e.g. a WIDE_COLS
		// board squeezed into a portrait screen), so the fixed-size buttons can never
		// end up bigger than the HUD strip they're supposed to sit inside of.
		if (frame_el) {
			frame_el.style.setProperty("--bj-ui-scale", Math.min(1, w / CANVAS_W));

			// #bj-frame shrink-wraps the canvas and floats centered inside the
			// full-screen #bj-stage, so it usually already has its own letterbox
			// margin clearing the device notch/Dynamic Island. Only add CSS
			// safe-area padding for whatever clearance that margin *doesn't*
			// already cover, instead of always adding the full device inset
			// (which would double up and push the buttons into the board).
			const root = getComputedStyle(document.documentElement);
			const satPx = parseFloat(root.getPropertyValue("--bj-sat")) || 0;
			const sarPx = parseFloat(root.getPropertyValue("--bj-sar")) || 0;
			const rect = frame_el.getBoundingClientRect();
			const topGap = rect.top;
			const rightGap = window.innerWidth - rect.right;
			frame_el.style.setProperty("--bj-safe-top", Math.max(0, satPx - topGap) + "px");
			frame_el.style.setProperty("--bj-safe-right", Math.max(0, sarPx - rightGap) + "px");
		}
	}
	window.addEventListener("resize", fitCanvas);
	window.addEventListener("orientationchange", fitCanvas);
	window.addEventListener("load", fitCanvas);
	// 'F' toggles the FPS counter.
	document.addEventListener("keydown", (e) => {
		if (e.key === "f" || e.key === "F") showFPS = !showFPS;
	});
	// Re-fit whenever the container's size settles (covers the template's preload
	// fade-in, font loading, orientation changes, etc.).
	if (window.ResizeObserver) {
		const ro = new ResizeObserver(fitCanvas);
		const stage = document.getElementById("bj-stage");
		if (stage) ro.observe(stage);
	}

	// ---- Fullscreen button (project page only; webapp has none) ----
	const fsBtn = document.getElementById("bj-fullscreen");
	if (fsBtn && frame_el) {
		fsBtn.addEventListener("click", () => {
			if (frame_el.requestFullscreen) {
				if (document.fullscreenElement) document.exitFullscreen();
				else frame_el.requestFullscreen().catch(() => toggleFakeFS());
			} else {
				toggleFakeFS();
			}
		});
		document.addEventListener("fullscreenchange", fitCanvas);
		document.addEventListener("keydown", (e) => {
			if (e.key === "Escape" && frame_el.classList.contains("bj-fake-fullscreen")) toggleFakeFS();
		});
	}
	function toggleFakeFS() {
		frame_el.classList.toggle("bj-fake-fullscreen");
		fitCanvas();
	}

	// ---- Settings panel ----
	(function initSettings() {
		const overlay  = document.getElementById("bj-settings-overlay");
		const gearBtn  = document.getElementById("bj-gear");
		const closeBtn = document.getElementById("bj-settings-close");
		const soundChk   = document.getElementById("bj-sound-toggle");
		const hapticChk  = document.getElementById("bj-haptics-toggle");
		const fpsChk   = document.getElementById("bj-fps-toggle");
		const debugChk = document.getElementById("bj-debug-toggle");
		const resetBtn = document.getElementById("bj-reset-best");
		const versionEl = document.getElementById("bj-version");
		if (!overlay || !gearBtn) return;

		if (versionEl) versionEl.textContent = "v" + APP_VERSION;

		function openSettings()  { overlay.classList.add("open"); }
		function closeSettings() { overlay.classList.remove("open"); }

		gearBtn.addEventListener("click", openSettings);
		closeBtn.addEventListener("click", closeSettings);
		overlay.addEventListener("click", (e) => { if (e.target === overlay) closeSettings(); });

		// Sync toggles to current state
		if (soundChk) {
			soundChk.checked = !muted;
			soundChk.addEventListener("change", () => { muted = !soundChk.checked; });
		}
		// Vibration is only meaningful on touch/mobile hardware — desktops have no
		// Taptic/vibration motor, so hide the row there instead of showing a dead option.
		// Also require an actual navigator.vibrate implementation: iOS WebKit (Safari,
		// and every other iOS browser — they're all WebKit under the hood) has never
		// shipped the Vibration API, on any iOS version, in any context including
		// installed Home Screen apps. Without this check the toggle would show up on
		// iPhones and silently do nothing when enabled, which is worse than not
		// offering it at all.
		const isMobileDevice = navigator.maxTouchPoints > 0 || "ontouchstart" in window ||
			(window.matchMedia && window.matchMedia("(pointer: coarse)").matches);
		const hapticsSupported = isMobileDevice && "vibrate" in navigator;
		if (hapticChk) {
			const row = hapticChk.closest(".bj-setting-row");
			if (!hapticsSupported) {
				if (row) row.style.display = "none";
			} else {
				hapticChk.checked = hapticsEnabled;
				hapticChk.addEventListener("change", () => {
					hapticsEnabled = hapticChk.checked;
					try { localStorage.setItem("bj2_haptics", hapticsEnabled ? "1" : "0"); } catch (e) {}
					if (hapticsEnabled) hapticBuzz(1);   // quick confirmation buzz on enable
				});
			}
		}
		if (fpsChk) {
			fpsChk.checked = showFPS;
			fpsChk.addEventListener("change", () => { showFPS = fpsChk.checked; });
		}
		if (debugChk) {
			debugChk.checked = debugMode;
			debugChk.addEventListener("change", () => { debugMode = debugChk.checked; });
		}

		// Reset best score (and best level, for modes that track one) for the
		// currently active mode
		if (resetBtn) {
			resetBtn.addEventListener("click", () => {
				best = 0;
				bestLevel = 0;
				try { localStorage.removeItem(bestKey()); } catch (e) {}
				try { localStorage.removeItem(bestLevelKey()); } catch (e) {}
				resetBtn.textContent = "Reset!";
				setTimeout(() => { resetBtn.textContent = "Reset Best Score"; }, 1200);
			});
		}
	})();

	// ---- Game Mode panel ----
	(function initGameMode() {
		const overlay = document.getElementById("bj-gamemode-overlay");
		const modeBtn = document.getElementById("bj-gamemode");
		const closeBtn = document.getElementById("bj-gamemode-close");
		const modeBtns = Array.from(overlay ? overlay.querySelectorAll(".bj-mode-btn[data-mode]") : []);
		const toast = document.getElementById("bj-mode-toast");
		const toastName = document.getElementById("bj-mode-toast-name");
		const toastDesc = document.getElementById("bj-mode-toast-desc");
		if (!overlay || !modeBtn) return;

		function openGameMode()  { overlay.classList.add("open"); }
		function closeGameMode() { overlay.classList.remove("open"); }

		function syncActiveButton() {
			for (const btn of modeBtns) btn.classList.toggle("active", btn.dataset.mode === gameMode);
		}
		syncActiveButton();

		// Brief popup confirming the picked mode + a one-line description, shown over
		// the board once the panel closes (replaces the always-visible subtext that
		// used to sit under each mode button).
		let toastTimer = null;
		function showModeToast(name, desc) {
			if (!toast) return;
			toastName.textContent = name;
			toastDesc.textContent = desc || "";
			toast.classList.add("show");
			clearTimeout(toastTimer);
			toastTimer = setTimeout(() => toast.classList.remove("show"), 2200);
		}

		for (const btn of modeBtns) {
			btn.addEventListener("click", () => {
				// Picking a mode (even the one already active) starts a brand-new run of
				// it — necessary for Timed, where re-selecting it should reset the clock
				// and level rather than leave a stale run in place.
				startNewRun(btn.dataset.mode);
				syncActiveButton();
				closeGameMode();
				showModeToast(btn.querySelector(".bj-mode-name").textContent, btn.dataset.desc);
			});
		}

		modeBtn.addEventListener("click", openGameMode);
		if (closeBtn) closeBtn.addEventListener("click", closeGameMode);
		overlay.addEventListener("click", (e) => { if (e.target === overlay) closeGameMode(); });
	})();

	// ---- Timed mode: Time's Up panel ----
	(function initTimeUp() {
		const retryBtn = document.getElementById("bj-timeup-retry");
		if (!retryBtn) return;
		retryBtn.addEventListener("click", () => startNewRun("timed"));
	})();

	// ---- Boot ----
	initGrid();
	fitCanvas();
	render();                       // paint an initial frame immediately
	requestAnimationFrame(frame);
	loadAssets().then(() => { fitCanvas(); render(); });
})();
