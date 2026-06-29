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
	const gemImgs = [];
	let bgImg = null;
	let assetsReady = false;

	function loadImage(src) {
		return new Promise((resolve) => {
			const img = new Image();
			img.onload = () => resolve(img);
			img.onerror = () => resolve(null);
			img.src = src;
		});
	}

	async function loadAssets() {
		const gemPromises = (BJ_ASSETS.gems || []).map(loadImage);
		const [gems, bg] = await Promise.all([
			Promise.all(gemPromises),
			BJ_ASSETS.background ? loadImage(BJ_ASSETS.background) : Promise.resolve(null)
		]);
		for (const g of gems) gemImgs.push(g);
		bgImg = bg;
		assetsReady = true;
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

	// ---- Player swap attempt ----
	async function trySwap(a, b) {
		if (busy) return;
		busy = true;
		selected = null;
		await animateSwap(a, b);
		swapCells(a, b);
		if (findMatches().size > 0) {
			await resolveBoard();
		} else {
			// illegal move: swap back
			sndSwapBad();
			await animateSwap(a, b);
			swapCells(a, b);
		}
		busy = false;
	}

	function adjacent(a, b) {
		return (Math.abs(a.r - b.r) + Math.abs(a.c - b.c)) === 1;
	}

	// ---- Input (pointer: covers mouse + touch). Tap-select or drag-swipe. ----
	let pointerDown = null; // {r,c,x,y}

	function cellFromEvent(e) {
		const rect = canvas.getBoundingClientRect();
		const sx = CANVAS_W / rect.width, sy = CANVAS_H / rect.height;
		const x = (e.clientX - rect.left) * sx;
		const y = (e.clientY - rect.top) * sy;
		if (y < BOARD_Y) return null;
		const c = Math.floor((x - BOARD_X) / GEM);
		const r = Math.floor((y - BOARD_Y) / GEM);
		if (r < 0 || r >= ROWS || c < 0 || c >= COLS) return null;
		return { r, c, x, y };
	}

	function onPointerDown(e) {
		if (busy || !assetsReady) return;
		const cell = cellFromEvent(e);
		if (!cell) return;
		pointerDown = cell;
		if (selected && adjacent(selected, cell)) {
			trySwap(selected, cell);
		} else {
			selected = { r: cell.r, c: cell.c };
			sndSelect();
		}
	}

	function onPointerUp(e) {
		if (busy || !pointerDown) { pointerDown = null; return; }
		const cell = cellFromEvent(e);
		if (cell) {
			const dr = cell.r - pointerDown.r, dc = cell.c - pointerDown.c;
			// treat a drag onto an adjacent cell as a swipe-swap
			if (Math.abs(dr) + Math.abs(dc) === 1) {
				trySwap({ r: pointerDown.r, c: pointerDown.c }, { r: cell.r, c: cell.c });
			}
		}
		pointerDown = null;
	}

	canvas.addEventListener("pointerdown", (e) => { e.preventDefault(); onPointerDown(e); });
	canvas.addEventListener("pointerup", (e) => { e.preventDefault(); onPointerUp(e); });
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

	function drawGems() {
		for (let r = 0; r < ROWS; r++) {
			for (let c = 0; c < COLS; c++) {
				const t = grid[r][c];
				if (t === -1) continue;
				const img = gemImgs[t];
				const off = offset[r][c] || { dx: 0, dy: 0 };
				const s = scale[r][c] == null ? 1 : scale[r][c];
				const homeX = BOARD_X + c * GEM, homeY = BOARD_Y + r * GEM;
				const cx = homeX + GEM / 2 + off.dx;
				const cy = homeY + GEM / 2 + off.dy;
				const size = GEM * s;
				if (img) {
					ctx.drawImage(img, cx - size / 2, cy - size / 2, size, size);
				} else {
					ctx.fillStyle = ["#fff", "#e44", "#fd0", "#3c6", "#39f", "#b3f", "#f93"][t % 7];
					ctx.fillRect(cx - size / 2, cy - size / 2, size, size);
				}
			}
		}
	}

	function drawSelection() {
		if (!selected) return;
		const x = BOARD_X + selected.c * GEM, y = BOARD_Y + selected.r * GEM;
		const pulse = 2 + Math.sin(selPulse * 6) * 1.5;
		ctx.strokeStyle = "rgba(255, 233, 168, 0.95)";
		ctx.lineWidth = 3;
		ctx.strokeRect(x + pulse, y + pulse, GEM - pulse * 2, GEM - pulse * 2);
	}

	function render() {
		drawBackground();
		drawHUD();
		if (assetsReady) drawGems();
		drawSelection();
		drawLevelFlash();

		if (!assetsReady) {
			ctx.fillStyle = "#ffe9a8";
			ctx.textAlign = "center";
			ctx.textBaseline = "middle";
			ctx.font = "16px 'Trebuchet MS', Verdana, sans-serif";
			ctx.fillText("loading…", CANVAS_W / 2, BOARD_Y + BOARD_H / 2);
		}
	}

	let lastT = performance.now();
	function frame(now) {
		const dt = Math.min(0.05, (now - lastT) / 1000);
		lastT = now;
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
