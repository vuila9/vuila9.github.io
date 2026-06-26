// Flappy Bird — web revival of the original 2014 game.
// Art and sound effects are the originals, extracted from the v1.3 Android APK
// texture atlas (see flappy_assets.js, which defines the global ASSETS object).
// Game logic is an original re-implementation in vanilla JS on a 2D canvas.
//
// Public surface: this script self-initialises against the #flappy-canvas element
// and a #flappy-fullscreen button if present. Physics run on a fixed 60Hz timestep
// so speed is identical on 60/120/144Hz displays.

(function () {
  "use strict";

  // ---- logical resolution: classic Flappy Bird playfield ----
  const GW = 288, GH = 512;           // game world (original bg size)
  const FLOOR_Y = 400;                // top of ground band

  const cvs = document.getElementById("flappy-canvas");
  if (!cvs) return;                   // nothing to do if the canvas is absent
  const ctx = cvs.getContext("2d");
  ctx.imageSmoothingEnabled = false;

  // ---- load images ----
  const IMG = {};
  let toLoad = 0, loaded = 0, ready = false;
  for (const k in ASSETS.sprites) {
    toLoad++;
    const im = new Image();
    im.onload = () => { if (++loaded >= toLoad) ready = true; };
    im.src = ASSETS.sprites[k];
    IMG[k] = im;
  }

  // ---- sounds ----
  const SFX = { wing: "sfx_wing", point: "sfx_point", hit: "sfx_hit", die: "sfx_die", swoosh: "sfx_swooshing" };
  let audioOK = false;
  function play(name) {
    if (!audioOK) return;
    try { const a = new Audio(ASSETS.sounds[SFX[name]]); a.volume = 0.5; a.play().catch(() => {}); } catch (e) {}
  }

  // ---- canvas sizing: fit inside the canvas's parent box, keep aspect ratio ----
  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 3);
    // Size against the stage (the frame now shrink-wraps the canvas, so we must
    // measure the outer container, not the frame, to avoid a feedback loop).
    const stage = cvs.parentElement.parentElement || cvs.parentElement;
    const fs = document.fullscreenElement || cvs.parentElement.classList.contains("flappy-fake-fullscreen");
    const availW = fs ? window.innerWidth : (stage.getBoundingClientRect().width || GW);
    const availH = fs ? window.innerHeight : 600;   // target play height on desktop
    let scale = availH / GH;
    if (GW * scale > availW) scale = availW / GW;
    cvs.style.height = (GH * scale) + "px";
    cvs.style.width = (GW * scale) + "px";
    cvs.width = GW * dpr;
    cvs.height = GH * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.imageSmoothingEnabled = false;
  }
  window.addEventListener("resize", resize);
  document.addEventListener("fullscreenchange", resize);

  // ---- game state ----
  const STATE = { READY: 0, PLAY: 1, DEAD: 2 };
  let state = STATE.READY;
  let bird = { x: 80, y: 240, vy: 0, rot: 0, frame: 0 };
  const GRAV = 0.30, FLAP = -5.6, MAXV = 10;
  let pipes = [], frames = 0, score = 0, best = +(localStorage.getItem("fb_best") || 0);
  const GAP = 110, PIPE_W = 52, PIPE_INTERVAL = 90, SPEED = 1.6;
  let groundX = 0, dayNight = "day";
  let birdColor = 0;                  // 0,1,2 bird colour sets
  let deadTimer = 0, flashAlpha = 0;
  let medalIdx = -1, scoreReveal = 0;

  function reset() {
    bird = { x: 80, y: 240, vy: 0, rot: 0, frame: 0 };
    pipes = []; frames = 0; score = 0; deadTimer = 0; flashAlpha = 0; scoreReveal = 0;
    dayNight = Math.random() < 0.5 ? "day" : "night";
    birdColor = Math.floor(Math.random() * 3);
    state = STATE.READY;
  }
  reset();

  function flap() {
    if (!audioOK) audioOK = true;
    if (state === STATE.READY) { state = STATE.PLAY; bird.vy = FLAP; play("wing"); }
    else if (state === STATE.PLAY) { bird.vy = FLAP; bird.rot = -25; play("wing"); }
    else if (state === STATE.DEAD && deadTimer > 30) { play("swoosh"); reset(); }
  }

  // Only react to taps/keys when the game has focus, so page scrolling still works.
  function onTap(e) { e.preventDefault(); flap(); }
  cvs.addEventListener("touchstart", onTap, { passive: false });
  cvs.addEventListener("mousedown", onTap);
  window.addEventListener("keydown", e => { if (e.code === "Space") { e.preventDefault(); flap(); } });

  function spawnPipe() {
    const minTop = 40, maxTop = FLOOR_Y - GAP - 60;
    const topH = Math.floor(minTop + Math.random() * (maxTop - minTop));
    pipes.push({ x: GW + 10, topH, passed: false });
  }

  function hit() {
    if (state !== STATE.PLAY) return;
    state = STATE.DEAD; deadTimer = 0; flashAlpha = 1; play("hit");
    setTimeout(() => play("die"), 250);
    if (score > best) { best = score; localStorage.setItem("fb_best", best); }
    if (score >= 40) medalIdx = 3;
    else if (score >= 30) medalIdx = 2;
    else if (score >= 20) medalIdx = 1;
    else if (score >= 10) medalIdx = 0;
    else medalIdx = -1;
  }

  function update() {
    frames++;
    groundX = (groundX - SPEED) % 24;
    if (state === STATE.READY) {
      bird.y = 240 + Math.sin(frames / 10) * 6;
      bird.frame = Math.floor(frames / 6) % 3;
      return;
    }
    if (state === STATE.PLAY) {
      bird.vy = Math.min(bird.vy + GRAV, MAXV); bird.y += bird.vy;
      bird.rot = Math.min(bird.rot + 3, 90);
      if (bird.vy < 0) bird.rot = -25;
      bird.frame = Math.floor(frames / 4) % 3;
      if (frames % PIPE_INTERVAL === 0) spawnPipe();
      for (const p of pipes) {
        p.x -= SPEED;
        if (!p.passed && p.x + PIPE_W < bird.x) { p.passed = true; score++; play("point"); }
      }
      pipes = pipes.filter(p => p.x > -PIPE_W - 5);
      // collision
      const bx = bird.x - 15, by = bird.y - 12, bw = 26, bh = 22;
      if (bird.y + 12 >= FLOOR_Y) { bird.y = FLOOR_Y - 12; hit(); }
      if (bird.y - 12 < 0) bird.y = 12;
      for (const p of pipes) {
        if (bx + bw > p.x && bx < p.x + PIPE_W) {
          if (by < p.topH || by + bh > p.topH + GAP) { hit(); break; }
        }
      }
    } else if (state === STATE.DEAD) {
      deadTimer++;
      if (flashAlpha > 0) flashAlpha -= 0.08;
      if (bird.y + 12 < FLOOR_Y) {
        bird.vy = Math.min(bird.vy + GRAV, MAXV); bird.y += bird.vy;
        bird.rot = Math.min(bird.rot + 8, 90);
      } else bird.y = FLOOR_Y - 12;
      if (deadTimer > 30 && scoreReveal < 1) scoreReveal = Math.min(scoreReveal + 0.08, 1);
    }
  }

  function drawSprite(name, x, y, w, h) {
    const im = IMG[name]; if (!im) return;
    ctx.drawImage(im, x, y, w || im.width, h || im.height);
  }
  function drawCentered(name, cx, cy, scale) {
    const im = IMG[name]; if (!im) return;
    const w = im.width * (scale || 1), h = im.height * (scale || 1);
    ctx.drawImage(im, cx - w / 2, cy - h / 2, w, h);
  }

  // type "big" = large in-game score font (font_048..057 = ASCII '0'..'9');
  // type "score" = small panel digits (number_score_00..09)
  function drawNumber(num, cx, y, type) {
    const s = String(num);
    if (type === "big") {
      const glyphs = s.split("").map(d => IMG["font_0" + (48 + +d)]);
      let tw = 0; glyphs.forEach(g => tw += g.width + 2); tw -= 2;
      let x = cx - tw / 2;
      glyphs.forEach(g => { ctx.drawImage(g, x, y); x += g.width + 2; });
    } else {
      const glyphs = s.split("").map(d => IMG["number_score_0" + d]);
      let tw = 0; glyphs.forEach(g => tw += g.width + 1); tw -= 1;
      let x = cx - tw / 2;
      glyphs.forEach(g => { ctx.drawImage(g, x, y); x += g.width + 1; });
    }
  }

  function render() {
    // background
    drawSprite(dayNight === "day" ? "bg_day" : "bg_night", 0, 0, GW, GH);
    // pipes — green set only; each sprite is a complete pipe, drawn whole so the
    // cap always meets the gap edge and the shaft fills the rest (no slicing).
    for (const p of pipes) {
      const downIm = IMG["pipe_down"], upIm = IMG["pipe_up"];
      const PH = downIm.height;        // 320, tall enough to cover any gap
      ctx.drawImage(downIm, p.x, p.topH - PH, PIPE_W, PH);          // top pipe
      ctx.drawImage(upIm, p.x, p.topH + GAP, PIPE_W, PH);          // bottom pipe
    }
    // ground (tiled)
    const land = IMG["land"];
    if (land) for (let x = Math.floor(groundX); x < GW; x += land.width) ctx.drawImage(land, x, FLOOR_Y);
    // bird
    ctx.save();
    ctx.translate(bird.x, bird.y); ctx.rotate(bird.rot * Math.PI / 180);
    drawCentered("bird" + birdColor + "_" + bird.frame, 0, 0, 1);
    ctx.restore();

    if (state === STATE.READY) {
      drawCentered("text_ready", GW / 2, 150, 1);
      drawCentered("tutorial", GW / 2, 250, 1);
    }
    if (state === STATE.PLAY) {
      drawNumber(score, GW / 2, 40, "big");
    }
    if (state === STATE.DEAD) {
      drawCentered("text_game_over", GW / 2, 120, 1);
      if (deadTimer > 20) {
        const px = GW / 2, py = 200;
        drawCentered("score_panel", px, py, 1);
        const sx = px + 72;
        drawNumber(score, sx, py - 27, "score");
        drawNumber(best, sx, py + 16, "score");
        if (medalIdx >= 0) drawCentered("medals_" + medalIdx, px - 66, py + 2, 1);
        drawCentered("button_play", GW / 2, 300, 1);
      }
    }
    // hit flash
    if (flashAlpha > 0) { ctx.fillStyle = "rgba(255,255,255," + flashAlpha + ")"; ctx.fillRect(0, 0, GW, GH); }
  }

  // ---- fixed-timestep loop: simulate at a constant 60Hz regardless of the
  // display refresh rate (60/120/144Hz all behave identically). ----
  const STEP = 1000 / 60;
  let lastT = performance.now(), acc = 0;
  function loop(now) {
    if (ready) {
      let dt = now - lastT; lastT = now;
      if (dt > 250) dt = 250;          // clamp after a tab-switch / stall
      acc += dt;
      let steps = 0;
      while (acc >= STEP && steps < 5) { update(); acc -= STEP; steps++; }
      render();
    } else {
      lastT = now;
      ctx.fillStyle = "#4ec0ca"; ctx.fillRect(0, 0, GW, GH);
    }
    requestAnimationFrame(loop);
  }
  resize();
  requestAnimationFrame(loop);

  // ---- fullscreen toggle (optional button) ----
  // iOS Safari has no Fullscreen API for arbitrary elements (requestFullscreen
  // is undefined on a <div>, even prefixed), so we fall back to a CSS-only
  // "fake fullscreen" that fixed-positions the frame over the viewport.
  const fsBtn = document.getElementById("flappy-fullscreen");
  if (fsBtn) {
    const wrap = cvs.parentElement;
    const req = wrap.requestFullscreen || wrap.webkitRequestFullscreen;
    const exit = document.exitFullscreen || document.webkitExitFullscreen;

    function exitFakeFullscreen() {
      wrap.classList.remove("flappy-fake-fullscreen");
      resize();
    }
    window.addEventListener("orientationchange", function () {
      if (wrap.classList.contains("flappy-fake-fullscreen")) resize();
    });

    fsBtn.addEventListener("click", function () {
      if (!req) {
        // No real Fullscreen API (iOS Safari) — toggle the CSS fallback.
        if (wrap.classList.contains("flappy-fake-fullscreen")) {
          exitFakeFullscreen();
        } else {
          wrap.classList.add("flappy-fake-fullscreen");
          resize();
        }
        return;
      }
      if (!document.fullscreenElement) {
        req.call(wrap);
      } else if (exit) {
        exit.call(document);
      }
    });
  }
})();
