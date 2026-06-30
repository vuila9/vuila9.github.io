// Bejeweled 2 — game logic
//
// A faithful match-3 re-implementation in vanilla JavaScript on an HTML5 canvas,
// using the original gem sprites + background extracted from the APK (BJ_ASSETS in
// bejeweled_assets.js). Same spirit as the Flappy Bird revival: original art, fresh
// frame-rate-independent code.
//
// First version scope: classic 8x8 endless board — select/swap, match-3 detection,
// cascading clears with gravity + refill, combo scoring, best-score persistence,
// and automatic reshuffle when no moves remain.
(function () {
	"use strict";

	const canvas = document.getElementById("bj-canvas");
	if (!canvas) return;
	const ctx = canvas.getContext("2d");

	// ---- Layout (internal logical resolution; CSS scales to fit) ----
	const COLS = 8, ROWS = 8, GEM = 64;
	const HUD_H = 88;
	const BOARD_X = 0, BOARD_Y = HUD_H;
	const BOARD_W = COLS * GEM, BOARD_H = ROWS * GEM;
	const CANVAS_W = BOARD_W;            // 512
	const CANVAS_H = HUD_H + BOARD_H;    // 600
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
	// except the currently selected one, which spins through the rotation flipbook.
	function gemAnimState(t, r, c) {
		const frames = gemFrames[t];
		if (!frames || frames.length === 0) return { a: gemImgs[t], b: null, f: 0 };
		if (frames.length > 1 && selected && selected.r === r && selected.c === c) {
			const i = Math.floor(selPulse * SPIN_FPS) % frames.length;
			return { a: frames[i], b: null, f: 0 };
		}
		return { a: frames[0], b: null, f: 0 };
	}

	// ---- Tiny WebAudio feedback (original SFX are locked in PopCap .jet format;
	//      these are light synthesized blips so the game isn't silent). ----
	let audioCtx = null;
	let muted = false;
	function beep(freq, dur, vol) {
		if (muted) return;
		try {
			if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
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

	// ---- Game state ----
	let grid = [];            // grid[r][c] = type index, or -1 when empty
	let score = 0;
	let best = 0;
	try { best = parseInt(localStorage.getItem("bj2_best") || "0", 10) || 0; } catch (e) {}

	// ---- Level / progress (Bejeweled 2 Classic style) ----
	// Clearing gems fills a progress meter; filling it advances the level, awards a
	// bonus, and raises the next target. Endless, but with a sense of progression.
	let level = 1;
	let levelProgress = 0;        // points banked toward the current level
	let levelTarget = computeTarget(1);
	let levelFlash = 0;           // seconds left on the "Level Up!" celebration
	function computeTarget(lv) { return 300 + (lv - 1) * 200; }

	let busy = false;         // true while animating (input blocked)
	let selected = null;      // {r,c} currently selected gem
	let selPulse = 0;         // selection highlight animation phase
	let fps = 60;             // smoothed render frames-per-second
	let showFPS = true;       // toggle with the 'F' key

	// Per-gem visual offset/scale for animations (parallel to grid).
	// offset = {dx,dy} in pixels added to the cell's home position.
	let offset = [];          // offset[r][c] = {dx,dy}
	let scale = [];           // scale[r][c] = 0..1 (for clear/spawn pops)

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
	}

	// Would placing type t at (r,c) complete a run of 3 with already-filled cells?
	function createsMatchAt(r, c, t) {
		if (c >= 2 && grid[r][c - 1] === t && grid[r][c - 2] === t) return true;
		if (r >= 2 && grid[r - 1][c] === t && grid[r - 2][c] === t) return true;
		return false;
	}

	// ---- Match detection: returns a Set of "r,c" keys to clear ----
	function findMatches() {
		const matched = new Set();
		// horizontal
		for (let r = 0; r < ROWS; r++) {
			let run = 1;
			for (let c = 1; c <= COLS; c++) {
				const same = c < COLS && grid[r][c] !== -1 && grid[r][c] === grid[r][c - 1];
				if (same) { run++; }
				else {
					if (run >= 3) for (let k = c - run; k < c; k++) matched.add(r + "," + k);
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
					if (run >= 3) for (let k = r - run; k < r; k++) matched.add(k + "," + c);
					run = 1;
				}
			}
		}
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
	}

	// Animate a swap (visual offsets slide between the two homes).
	async function animateSwap(a, b) {
		const dx = (b.c - a.c) * GEM, dy = (b.r - a.r) * GEM;
		await tween(140, (p) => {
			offset[a.r][a.c] = { dx: dx * p, dy: dy * p };
			offset[b.r][b.c] = { dx: -dx * p, dy: -dy * p };
		}, easeOutQuad);
		offset[a.r][a.c] = { dx: 0, dy: 0 };
		offset[b.r][b.c] = { dx: 0, dy: 0 };
	}

	// Animate clearing a set of matched cells (shrink + fade), then null them out.
	async function animateClear(matched) {
		await tween(180, (p) => {
			for (const key of matched) {
				const [r, c] = key.split(",").map(Number);
				scale[r][c] = 1 - p;
			}
		}, easeInQuad);
		for (const key of matched) {
			const [r, c] = key.split(",").map(Number);
			grid[r][c] = -1;
			scale[r][c] = 1;
		}
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
						grid[r][c] = -1;
						falls.push({ r: write, c, dist: (write - r) * GEM });
					}
					write--;
				}
			}
			// fill the rest from above with new gems
			let spawnIndex = 1;
			for (let r = write; r >= 0; r--) {
				grid[r][c] = randType();
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
		await tween(260, (p) => {
			for (const f of falls) offset[f.r][f.c] = { dx: 0, dy: -f.dist * (1 - p) };
		}, easeOutQuad);
		for (const f of falls) offset[f.r][f.c] = { dx: 0, dy: 0 };
	}

	// Resolve the board: clear → fall → repeat, accumulating cascade score.
	async function resolveBoard() {
		let cascade = 0;
		while (true) {
			const matched = findMatches();
			if (matched.size === 0) break;
			cascade++;
			sndMatch(cascade);
			// scoring: 10 per gem, multiplied by the cascade depth
			const gained = matched.size * 10 * cascade;
			score += gained;
			levelProgress += gained;
			updateBest();
			if (levelProgress >= levelTarget) levelUp();
			await animateClear(matched);
			const falls = collapseAndRefill();
			await animateFalls(falls);
		}
		// guarantee the board always has a legal move
		if (!hasAnyMove()) await reshuffle();
	}

	function updateBest() {
		if (score > best) {
			best = score;
			try { localStorage.setItem("bj2_best", String(best)); } catch (e) {}
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
			levelFlash = 1.6;
			sndLevelUp();
		}
	}

	// Is there at least one swap that produces a match?
	function hasAnyMove() {
		const test = (a, b) => {
			swapCells(a, b);
			const ok = findMatches().size > 0;
			swapCells(a, b);
			return ok;
		};
		for (let r = 0; r < ROWS; r++) {
			for (let c = 0; c < COLS; c++) {
				if (c < COLS - 1 && test({ r, c }, { r, c: c + 1 })) return true;
				if (r < ROWS - 1 && test({ r, c }, { r: r + 1, c })) return true;
			}
		}
		return false;
	}

	// Reshuffle all gems (keep playing) until there's a move and no free matches.
	async function reshuffle() {
		const flat = [];
		for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) flat.push(grid[r][c]);
		// Try to land on a board with a legal move and no free matches. Cap the
		// attempts so a pathological gem distribution can never hang the loop; if we
		// exhaust them, rebuild from fresh random gems (which initGrid keeps clean).
		let tries = 0;
		do {
			for (let i = flat.length - 1; i > 0; i--) {
				const j = Math.floor(Math.random() * (i + 1));
				[flat[i], flat[j]] = [flat[j], flat[i]];
			}
			let k = 0;
			for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) grid[r][c] = flat[k++];
			if (++tries > 200) { initGrid(); break; }
		} while (findMatches().size > 0 || !hasAnyMove());
		// little settle animation
		for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) offset[r][c] = { dx: 0, dy: -GEM };
		await tween(220, (p) => {
			for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) offset[r][c] = { dx: 0, dy: -GEM * (1 - p) };
		}, easeOutQuad);
		for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) offset[r][c] = { dx: 0, dy: 0 };
	}

	// Resolve a swap whose opening slide has already played (offsets back to 0,
	// model not yet swapped): commit it, or bounce it back if it makes no match.
	async function afterSlide(a, b) {
		swapCells(a, b);
		if (findMatches().size > 0) {
			await resolveBoard();
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
		await tween(90, (p) => {
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
		if (busy || !assetsReady) return;
		const cell = cellFromEvent(e);
		if (!cell) return;
		// tap-tap: a gem is already selected and this one is adjacent → swap now
		if (selected && adjacent(selected, cell)) {
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

		// the dragged gem follows the pointer; the neighbour slides the other way
		clearDragOffsets();
		offset[a.r][a.c] = horiz ? { dx: m, dy: 0 } : { dx: 0, dy: m };
		if (b) offset[b.r][b.c] = horiz ? { dx: -m, dy: 0 } : { dx: 0, dy: -m };
		dragPreview = { a, b };

		// commit once dragged at least halfway toward the neighbour
		if (b && Math.abs(m) >= GEM * COMMIT_FRACTION) {
			pointerDown = null;
			dragPreview = null;       // commitDrag now owns these offsets
			commitDrag(a, b);
		}
	}

	function onPointerUp() {
		pointerDown = null;
		if (dragPreview && !busy) {
			const { a, b } = dragPreview;
			dragPreview = null;
			snapBack(a, b);           // released before committing → ease home
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

		// top row: LEVEL (left) and Best (right)
		ctx.textAlign = "left";
		ctx.fillStyle = "#ffe9a8";
		ctx.font = "bold 22px 'Trebuchet MS', Verdana, sans-serif";
		ctx.fillText("LEVEL " + level, 16, 20);

		ctx.textAlign = "right";
		ctx.fillStyle = "#9ec7ff";
		ctx.font = "bold 16px 'Trebuchet MS', Verdana, sans-serif";
		ctx.fillText("Best: " + best, CANVAS_W - 16, 20);

		// score
		ctx.textAlign = "left";
		ctx.fillStyle = "#ffffff";
		ctx.font = "bold 24px 'Trebuchet MS', Verdana, sans-serif";
		ctx.fillText("Score: " + score, 16, 47);

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
		const st = gemAnimState(t, r, c);
		if (!st.a) {
			ctx.fillStyle = ["#fff", "#e44", "#fd0", "#3c6", "#39f", "#b3f", "#f93"][t % 7];
			ctx.fillRect(dx, dy, size, size);
			return;
		}
		ctx.drawImage(st.a, dx, dy, size, size);
	}

	function drawGems() {
		for (let r = 0; r < ROWS; r++) {
			for (let c = 0; c < COLS; c++) drawGemAt(r, c);
		}
		// keep the gem being dragged above its neighbours
		if (dragPreview && dragPreview.a) drawGemAt(dragPreview.a.r, dragPreview.a.c);
	}

	function drawSelection() {
		if (!selected || dragPreview) return;
		const x = BOARD_X + selected.c * GEM, y = BOARD_Y + selected.r * GEM;
		const pulse = 2 + Math.sin(selPulse * 6) * 1.5;
		ctx.strokeStyle = "rgba(255, 233, 168, 0.95)";
		ctx.lineWidth = 3;
		ctx.strokeRect(x + pulse, y + pulse, GEM - pulse * 2, GEM - pulse * 2);
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
		ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
		ctx.fillRect(4, CANVAS_H - 20, 60, 16);
		ctx.fillStyle = fps >= 50 ? "#7CFC7C" : fps >= 30 ? "#ffd34d" : "#ff6b6b";
		ctx.fillText(Math.round(fps) + " fps", 8, CANVAS_H - 18);
		ctx.restore();
	}

	let lastT = performance.now();
	function frame(now) {
		const raw = (now - lastT) / 1000;        // true frame time (for the FPS read)
		const dt = Math.min(0.05, raw);           // clamped for stable game/animation
		lastT = now;
		if (raw > 0) fps = fps * 0.9 + (1 / raw) * 0.1;
		selPulse += dt;
		if (levelFlash > 0) levelFlash = Math.max(0, levelFlash - dt);
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
		} else {
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
	}
	window.addEventListener("resize", fitCanvas);
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

	// ---- Boot ----
	initGrid();
	fitCanvas();
	render();                       // paint an initial frame immediately
	requestAnimationFrame(frame);
	loadAssets().then(() => { fitCanvas(); render(); });
})();
