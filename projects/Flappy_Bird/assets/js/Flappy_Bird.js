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
  // Each sprite is rasterised into an offscreen canvas once it loads. iOS Safari
  // evicts decoded data-URI images under memory pressure and re-decodes them on
  // the next drawImage — a classic source of *random* frame hitches. A
  // canvas-backed source stays resident in memory and draws without re-decoding.
  const IMG = {};
  let toLoad = 0, loaded = 0, ready = false;
  for (const k in ASSETS.sprites) {
    toLoad++;
    const key = k;
    const im = new Image();
    im.onload = () => {
      const c = document.createElement("canvas");
      c.width = im.naturalWidth;
      c.height = im.naturalHeight;
      c.getContext("2d").drawImage(im, 0, 0);
      IMG[key] = c;
      if (++loaded >= toLoad) ready = true;
    };
    im.src = ASSETS.sprites[k];
  }

  // ---- user settings (persisted in localStorage) ----
  const settings = {
    muted: localStorage.getItem("fb_muted") === "1",
    showFps: localStorage.getItem("fb_showfps") === "1",
  };

  // ---- sounds (Web Audio) ----
  // HTMLAudioElement.play() causes main-thread hitches on iOS. Web Audio decodes
  // each effect once into a buffer and fires it through a lightweight source node,
  // which never janks the render loop and lets sounds overlap freely. The context
  // is created/resumed on the first tap (browsers require a user gesture).
  const SFX = { wing: "sfx_wing", point: "sfx_point", hit: "sfx_hit", die: "sfx_die", swoosh: "sfx_swooshing" };
  let audioCtx = null;
  const BUFFERS = {};
  function initAudio() {
    if (audioCtx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    audioCtx = new AC();
    for (const name in SFX) {
      fetch(ASSETS.sounds[SFX[name]])
        .then((r) => r.arrayBuffer())
        .then((buf) => audioCtx.decodeAudioData(buf))
        .then((decoded) => { BUFFERS[name] = decoded; })
        .catch(() => {});
    }
  }
  function play(name) {
    if (settings.muted || !audioCtx) return;
    const b = BUFFERS[name];
    if (!b) return;
    const src = audioCtx.createBufferSource();
    src.buffer = b;
    const g = audioCtx.createGain();
    g.gain.value = 0.5;
    src.connect(g);
    g.connect(audioCtx.destination);
    src.start(0);
  }

  // ---- canvas sizing: fit inside the canvas's parent box, keep aspect ratio ----
  function resize() {
    // Backing-store supersampling factor. The full-screen background is blitted
    // every frame, so fill rate is the main cost — and on a phone devicePixelRatio
    // is often 3, making the canvas ~9x larger than a 1x render and stuttering
    // badly. This is pixel art and stays crisp under CSS upscaling
    // (image-rendering: pixelated), so on touch devices we render at 1x (game
    // resolution) for a huge fill-rate win. Desktop keeps 2x for smooth edges.
    const coarse = !!(window.matchMedia && window.matchMedia("(pointer: coarse)").matches);
    const dpr = coarse ? 1 : Math.min(window.devicePixelRatio || 1, 2);
    // Size against the stage (the frame now shrink-wraps the canvas, so we must
    // measure the outer container, not the frame, to avoid a feedback loop).
    const stage = cvs.parentElement.parentElement || cvs.parentElement;
    // "Fullscreen" sizing applies when: a real fullscreen is active, the CSS
    // fake-fullscreen is toggled, or the page is the standalone web-app
    // (body.flappy-app) where the game owns the whole viewport by default.
    const fs = document.fullscreenElement
      || cvs.parentElement.classList.contains("flappy-fake-fullscreen")
      || document.body.classList.contains("flappy-app");
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
  // Orientation flips don't always emit a timely "resize" on mobile; re-fit after
  // the viewport settles. Harmless on desktop.
  window.addEventListener("orientationchange", () => setTimeout(resize, 100));

  // ---- game state ----
  const STATE = { READY: 0, PLAY: 1, DEAD: 2 };
  let state = STATE.READY;
  // py/prot are the previous-step y/rotation, used to interpolate the render
  // between 60Hz simulation steps so motion is smooth at any refresh rate.
  let bird = { x: 80, y: 240, vy: 0, rot: 0, frame: 0, py: 240, prot: 0 };
  const GRAV = 0.30, FLAP = -5.6, MAXV = 10;
  let pipes = [], frames = 0, score = 0, best = +(localStorage.getItem("fb_best") || 0);
  const GAP = 110, PIPE_W = 52, PIPE_INTERVAL = 90, SPEED = 1.6;
  let groundX = 0, groundPrev = 0, dayNight = "day";
  let birdColor = 0;                  // 0,1,2 bird colour sets
  let deadTimer = 0, flashAlpha = 0;
  let medalIdx = -1, scoreReveal = 0;

  function reset() {
    bird = { x: 80, y: 240, vy: 0, rot: 0, frame: 0, py: 240, prot: 0 };
    groundPrev = groundX;
    pipes = []; frames = 0; score = 0; deadTimer = 0; flashAlpha = 0; scoreReveal = 0;
    dayNight = Math.random() < 0.5 ? "day" : "night";
    birdColor = Math.floor(Math.random() * 3);
    state = STATE.READY;
  }
  reset();

  function flap() {
    initAudio();
    if (audioCtx && audioCtx.state === "suspended") audioCtx.resume();
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
    pipes.push({ x: GW + 10, topH, passed: false, px: GW + 10 });
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
    // Snapshot the previous render state so the loop can interpolate between
    // 60Hz steps (smooth 120fps visuals without changing the simulation).
    bird.py = bird.y; bird.prot = bird.rot;
    groundPrev = groundX;
    for (const p of pipes) p.px = p.x;
    groundX -= SPEED;                 // continuous; wrapped to one tile at draw time
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
      // Pipes are ordered left-to-right and exit on the left first; shift the
      // front one out in place instead of allocating a new array each frame.
      while (pipes.length && pipes[0].x <= -PIPE_W - 5) pipes.shift();
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
  // No per-frame array/closure allocation here (called every frame for the live
  // score and the FPS readout) — iterate the digits directly to avoid GC churn.
  function drawNumber(num, cx, y, type) {
    const s = "" + num;
    const big = type === "big";
    const pad = big ? 2 : 1;
    let tw = -pad;
    for (let i = 0; i < s.length; i++) {
      const g = big ? IMG["font_0" + (48 + +s[i])] : IMG["number_score_0" + s[i]];
      if (g) tw += g.width + pad;
    }
    let x = cx - tw / 2;
    for (let i = 0; i < s.length; i++) {
      const g = big ? IMG["font_0" + (48 + +s[i])] : IMG["number_score_0" + s[i]];
      if (g) { ctx.drawImage(g, x, y); x += g.width + pad; }
    }
  }

  function render(alpha) {
    // background
    drawSprite(dayNight === "day" ? "bg_day" : "bg_night", 0, 0, GW, GH);
    // pipes — green set only; each sprite is a complete pipe, drawn whole so the
    // cap always meets the gap edge and the shaft fills the rest (no slicing).
    for (const p of pipes) {
      const px = p.px + (p.x - p.px) * alpha;        // interpolated position
      const downIm = IMG["pipe_down"], upIm = IMG["pipe_up"];
      const PH = downIm.height;        // 320, tall enough to cover any gap
      ctx.drawImage(downIm, px, p.topH - PH, PIPE_W, PH);          // top pipe
      ctx.drawImage(upIm, px, p.topH + GAP, PIPE_W, PH);          // bottom pipe
    }
    // ground (tiled) — interpolate the continuous scroll, wrap at the 24px period
    const land = IMG["land"];
    if (land) {
      const ig = groundPrev + (groundX - groundPrev) * alpha;
      for (let x = ig % 24; x < GW; x += land.width) ctx.drawImage(land, x, FLOOR_Y);
    }
    // bird
    const by = bird.py + (bird.y - bird.py) * alpha;
    const brot = bird.prot + (bird.rot - bird.prot) * alpha;
    ctx.save();
    ctx.translate(bird.x, by); ctx.rotate(brot * Math.PI / 180);
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
  let paused = false;                 // hard freeze (settings or pause panel open)
  let countdown = 0;                  // ms left on the 3-2-1 resume countdown
  let syncChrome = () => {};          // shows gear (menu) vs pause (in-game) button
  // FPS readout — toggled in settings, drawn top-left.
  let fpsAccum = 0, fpsFrames = 0, fpsValue = 0;
  function loop(now) {
    if (ready) {
      let dt = now - lastT; lastT = now;
      if (dt > 250) dt = 250;          // clamp after a tab-switch / stall
      if (paused) {
        acc = 0;                       // hard freeze; no catch-up on resume
      } else if (countdown > 0) {
        countdown -= dt;               // frozen during the 3-2-1 resume countdown
        if (countdown < 0) countdown = 0;
        acc = 0;
      } else {
        acc += dt;
        let steps = 0;
        while (acc >= STEP && steps < 5) { update(); acc -= STEP; steps++; }
      }
      let alpha = acc / STEP;          // fraction into the next sim step
      if (alpha > 1) alpha = 1;
      render(alpha);
      if (countdown > 0) drawNumber(Math.ceil(countdown / 1000), GW / 2, GH / 2 - 24, "big");
      if (settings.showFps) {
        fpsFrames++; fpsAccum += dt;
        if (fpsAccum >= 500) { fpsValue = Math.round(fpsFrames * 1000 / fpsAccum); fpsFrames = 0; fpsAccum = 0; }
        drawNumber(fpsValue, 16, 8, "score");
      }
      syncChrome();
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

  // ---- settings UI: gear button + Options panel (injected, so it shows on any
  // page that hosts the game). Toggles sound + the FPS readout; opening pauses. ----
  (function buildSettings() {
    const frame = cvs.parentElement;
    if (!frame) return;
    if (getComputedStyle(frame).position === "static") frame.style.position = "relative";

    const GEAR_SVG = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">'
      + '<path d="M19.14 12.94c.04-.31.06-.62.06-.94s-.02-.63-.06-.94l2.03-1.58a.5.5 0 0 0 .12-.64'
      + 'l-1.92-3.32a.5.5 0 0 0-.61-.22l-2.39.96c-.5-.38-1.04-.7-1.62-.94l-.36-2.54a.5.5 0 0 0-.5-.42'
      + 'h-3.84a.5.5 0 0 0-.5.42l-.36 2.54c-.58.24-1.12.56-1.62.94l-2.39-.96a.5.5 0 0 0-.61.22'
      + 'L2.74 8.84a.5.5 0 0 0 .12.64l2.03 1.58c-.04.31-.06.62-.06.94s.02.63.06.94l-2.03 1.58'
      + 'a.5.5 0 0 0-.12.64l1.92 3.32c.14.24.43.34.69.22l2.39-.96c.5.38 1.04.7 1.62.94l.36 2.54'
      + 'c.04.24.25.42.5.42h3.84c.25 0 .46-.18.5-.42l.36-2.54c.58-.24 1.12-.56 1.62-.94l2.39.96'
      + 'c.26.12.55.02.69-.22l1.92-3.32a.5.5 0 0 0-.12-.64l-2.03-1.58zM12 15.6a3.6 3.6 0 1 1 0-7.2'
      + ' 3.6 3.6 0 0 1 0 7.2z"/></svg>';

    const gear = document.createElement("button");
    gear.type = "button";
    gear.className = "flappy-gear";
    gear.setAttribute("aria-label", "Settings");
    gear.innerHTML = GEAR_SVG;

    const PAUSE_SVG = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">'
      + '<rect x="6" y="5" width="4" height="14" rx="1"></rect>'
      + '<rect x="14" y="5" width="4" height="14" rx="1"></rect></svg>';
    const pauseBtn = document.createElement("button");
    pauseBtn.type = "button";
    pauseBtn.className = "flappy-gear flappy-pause";
    pauseBtn.setAttribute("aria-label", "Pause");
    pauseBtn.innerHTML = PAUSE_SVG;
    pauseBtn.style.display = "none";

    const overlay = document.createElement("div");
    overlay.className = "flappy-settings-overlay";
    overlay.innerHTML =
      '<div class="flappy-settings-panel" role="dialog" aria-label="Settings">'
        + '<div class="flappy-settings-title">OPTIONS</div>'
        + '<label class="flappy-setting-row">'
          + '<span class="flappy-setting-label">SOUND</span>'
          + '<input type="checkbox" class="flappy-toggle" data-key="sound">'
          + '<span class="flappy-switch" aria-hidden="true"></span>'
        + '</label>'
        + '<label class="flappy-setting-row">'
          + '<span class="flappy-setting-label">SHOW FPS</span>'
          + '<input type="checkbox" class="flappy-toggle" data-key="fps">'
          + '<span class="flappy-switch" aria-hidden="true"></span>'
        + '</label>'
        + '<button type="button" class="flappy-settings-close">CLOSE</button>'
      + '</div>';

    const pauseOverlay = document.createElement("div");
    pauseOverlay.className = "flappy-settings-overlay";
    pauseOverlay.innerHTML =
      '<div class="flappy-settings-panel" role="dialog" aria-label="Paused">'
        + '<div class="flappy-settings-title">PAUSED</div>'
        + '<button type="button" class="flappy-settings-close flappy-resume">RESUME</button>'
      + '</div>';

    frame.appendChild(gear);
    frame.appendChild(pauseBtn);
    frame.appendChild(overlay);
    frame.appendChild(pauseOverlay);

    const soundInput = overlay.querySelector('[data-key="sound"]');
    const fpsInput = overlay.querySelector('[data-key="fps"]');
    const closeBtn = overlay.querySelector(".flappy-settings-close");
    const resumeBtn = pauseOverlay.querySelector(".flappy-resume");

    function syncInputs() {
      soundInput.checked = !settings.muted;
      fpsInput.checked = settings.showFps;
    }
    function openSettings() { syncInputs(); overlay.classList.add("open"); paused = true; }
    function closeSettings() { overlay.classList.remove("open"); paused = false; }

    gear.addEventListener("click", openSettings);
    closeBtn.addEventListener("click", closeSettings);
    overlay.addEventListener("click", (e) => { if (e.target === overlay) closeSettings(); });
    soundInput.addEventListener("change", () => {
      settings.muted = !soundInput.checked;
      localStorage.setItem("fb_muted", settings.muted ? "1" : "0");
    });
    fpsInput.addEventListener("change", () => {
      settings.showFps = fpsInput.checked;
      localStorage.setItem("fb_showfps", settings.showFps ? "1" : "0");
    });

    // Pause (in-game) → hard freeze + PAUSED panel. Resume → 3-2-1 countdown then play.
    pauseBtn.addEventListener("click", () => {
      if (state !== STATE.PLAY) return;
      paused = true;
      pauseOverlay.classList.add("open");
    });
    resumeBtn.addEventListener("click", () => {
      pauseOverlay.classList.remove("open");
      paused = false;
      countdown = 3000;
    });

    // Gear on menu/game-over, pause during play, neither while a panel is open or
    // the countdown is running. Guarded so the DOM is touched only on change.
    let mode = "";
    syncChrome = function () {
      const next = (paused || countdown > 0) ? "none" : (state === STATE.PLAY ? "pause" : "gear");
      if (next === mode) return;
      mode = next;
      gear.style.display = next === "gear" ? "flex" : "none";
      pauseBtn.style.display = next === "pause" ? "flex" : "none";
    };
    syncChrome();
  })();
})();
