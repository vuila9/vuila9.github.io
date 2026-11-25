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
  // The world grows in fullscreen to match the screen aspect (no letterbox/
  // pillarbox): GH grows on tall/portrait screens (phones), GW grows on wide/
  // landscape screens (16:9 monitors). The ground band keeps a constant height
  // anchored to the bottom; the sky fills the rest.
  const BASE_GW = 288;                // original world width
  const BASE_GH = 512;                // original world height
  const FLOOR_BAND = 112;             // ground-band height (BASE_GH - 400)
  let GW = BASE_GW;                   // world width — grows on landscape screens
  let GH = BASE_GH;                   // world height — grows on portrait screens
  let FLOOR_Y = GH - FLOOR_BAND;      // top of ground band — recomputed in resize()
  let HUD_TOP = 0;                    // world-unit inset keeping HUD clear of the status bar

  const cvs = document.getElementById("flappy-canvas");
  if (!cvs) return;                   // nothing to do if the canvas is absent
  const ctx = cvs.getContext("2d");
  ctx.imageSmoothingEnabled = false;

  // Probe for env(safe-area-inset-top). iOS 26+ blurs the status-bar strip of
  // standalone web apps (a system effect pages can't switch off), so the score
  // and FPS readout are pushed below it instead of being drawn underneath.
  const safeProbe = document.createElement("div");
  safeProbe.className = "flappy-safe-probe";
  document.body.appendChild(safeProbe);

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
      if (key === "button_play") IMG.button_board = makeBoardButton(c);
      if (++loaded >= toLoad) ready = true;
    };
    im.src = ASSETS.sprites[k];
  }

  // ---- user settings (persisted in localStorage) ----
  // Shown in the Options panel to confirm a deploy is live. Bump this together
  // with CACHE in sw.js so the number always matches the service-worker version.
  const APP_VERSION = "0.5";

  const settings = {
    muted: localStorage.getItem("fb_muted") === "1",
    showFps: localStorage.getItem("fb_showfps") === "1",
    shake: localStorage.getItem("fb_shake") === "1",   // iOS webapp: shake to pause
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
    // In fullscreen/app mode measure the frame itself (fixed at 100dvw/100dvh)
    // rather than window.inner* — on iOS standalone the latter can fall short of
    // the home-indicator area, leaving a black bar along the bottom.
    const frameRect = cvs.parentElement.getBoundingClientRect();
    const availW = fs ? frameRect.width : (stage.getBoundingClientRect().width || GW);
    const availH = fs ? frameRect.height : 600;   // target play height on desktop
    // Grow the world to the screen aspect when filling the screen, so there are
    // no bands: a taller-than-base screen grows the height (portrait phones), a
    // wider-than-base screen grows the width (16:9 monitors in fullscreen).
    GW = BASE_GW;
    GH = BASE_GH;
    if (fs) {
      const aspect = availW / availH;
      if (aspect > BASE_GW / BASE_GH) GW = Math.round(BASE_GH * aspect);  // widen
      else GH = Math.round(BASE_GW / aspect);                            // heighten
    }
    FLOOR_Y = GH - FLOOR_BAND;
    // A viewport reshape (fullscreen toggle / phone rotation) changes the world
    // size, leaving the active pipes and bird at coordinates that no longer fit.
    // Mid-play, clear the field, recentre the bird, and auto-pause for a clean
    // resume (score is kept). Guarded by prevGW so it never fires on first sizing.
    if (prevGW !== 0 && (GW !== prevGW || GH !== prevGH) && state === STATE.PLAY) {
      pipes.length = 0;
      bird.y = bird.py = ay(240);
      bird.vy = 0; bird.rot = bird.prot = 0;
      requestPause();
    }
    prevGW = GW; prevGH = GH;
    let scale = availH / GH;
    if (GW * scale > availW) scale = availW / GW;
    // Status-bar inset in world units — only matters when the canvas reaches the
    // top edge of the screen (fullscreen / standalone app).
    const safeTop = parseFloat(getComputedStyle(safeProbe).paddingTop) || 0;
    HUD_TOP = fs ? safeTop / scale : 0;
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

  // ---- online leaderboard (Cloudflare Worker: github.com/vuila9/Flappy-Bird-Leaderboard) ----
  // An empty LB_API turns the leaderboard off: no requests, no podium button.
  // On a localhost page it talks to the Worker running under `wrangler dev`.
  const LB_LOCAL = /^(localhost|127\.0\.0\.1)$/.test(location.hostname);
  const LB_API = LB_LOCAL ? "http://localhost:8787"
    : "https://flappy-leaderboard.khoa-nguynxun.workers.dev";
  let runTokenP = null;   // Promise<string|null>: the current run's token from POST /start
  // The last finished run, kept until the next starts:
  // { score, tokenP, submitted, submitting, rank, at, status }
  let pendingRun = null;
  let lbOnRunUpdate = () => {};   // set by the leaderboard panel to redraw itself
  let openHallOfFame = () => {};  // set by the leaderboard panel; the podium button calls it

  function lbPost(path, body) {
    return fetch(LB_API + path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body || {}),
    }).then((r) => r.json().then((data) => ({ ok: r.ok, status: r.status, data })));
  }

  // Player session. A player is a name plus a number ("Name #N"); names may repeat. The
  // first submit registers one and the Worker returns a signed player token for it
  // (fb_player). While the token is live, runs that beat the session's best (fb_lb_best)
  // are submitted automatically as that player (name in fb_name). Every /start renews
  // the token; after 30 days without a run it expires and the browser registers again
  // (the same name is fine; it gets a new number and entry).
  const savedPlayer = () => localStorage.getItem("fb_player") || "";
  function playerInfo() {          // the token's payload, { n: name key, tag, exp }, or null
    try {
      const body = savedPlayer().split(".")[0].replace(/-/g, "+").replace(/_/g, "/");
      const p = JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(body), (c) => c.charCodeAt(0))));
      if (!p || typeof p.n !== "string") return null;
      if (!Number.isInteger(p.tag)) p.tag = 0;   // tokens from before numbers mean #0
      return p;
    } catch { return null; }
  }
  const sessionTag = () => { const p = playerInfo(); return p ? p.tag : null; };
  // A player number as shown: always three digits (0 -> "000", 7 -> "007").
  const tagDigits = (t) => String(t).padStart(3, "0");
  function sessionLive() {
    const p = playerInfo();
    return !!p && !(typeof p.exp === "number" && p.exp <= Date.now());
  }
  function endSession() {
    ["fb_player", "fb_name", "fb_lb_best"].forEach((k) => localStorage.removeItem(k));
    sessionExpired = true;
  }
  let sessionExpired = false;      // shows "SESSION EXPIRED" when picking a new name
  if (savedPlayer() && !sessionLive()) endSession();
  // The session's name as typed; falls back to the token's (lowercase) key.
  function sessionName() {
    const p = playerInfo(), s = localStorage.getItem("fb_name") || "";
    return p && s.toLowerCase() !== p.n ? p.n : s;
  }
  const sessionBest = () => +(localStorage.getItem("fb_lb_best") || 0);

  // Server errors after which a run can't be submitted any more.
  const FINAL_ERRORS = ["ALREADY SUBMITTED", "SCORE REJECTED", "RUN EXPIRED", "INVALID RUN"];
  // Submit `run` as `name` (and, for a new player, the number they chose: `tag`, or ""
  // for the lowest free one), with the session token while it's live, and record the
  // outcome on the run. Used for automatic submits and the panel's SUBMIT button.
  async function sendRun(run, name, tag) {
    const live = sessionLive();
    const before = live ? playerInfo() : null;
    run.submitting = true; run.status = "";
    lbOnRunUpdate();
    const token = await run.tokenP;
    const body = { token, name, score: run.score };
    if (live) body.player = savedPlayer();
    else if (tag !== undefined && tag !== "") body.tag = tag;
    const r = token ? await lbPost("/submit", body).catch(() => null) : null;
    run.submitting = false;
    if (!token) {                  // /start failed: the server never saw this run
      run.submitted = true; run.status = "THIS RUN WASN'T REGISTERED (OFFLINE?)";
    } else if (r && r.ok) {
      localStorage.setItem("fb_player", r.data.player);
      localStorage.setItem("fb_name", r.data.name);
      localStorage.setItem("fb_lb_best", String(r.data.best));
      sessionExpired = false;
      run.submitted = true; run.rank = r.data.rank; run.at = Date.now();
      // A session the server no longer counted as live came back as a new player.
      const moved = before && (before.n !== r.data.name.toLowerCase() || before.tag !== r.data.tag);
      run.status = moved || !live ? "SAVED AS " + r.data.name + " #" + tagDigits(r.data.tag) : "SAVED!";
    } else {
      const err = (r && r.data && r.data.error) || "OFFLINE, TRY AGAIN";
      // The server no longer counts this session as live: pick a name again.
      if (live && err === "NAME LOCKED") endSession();
      else run.status = err;
      if (FINAL_ERRORS.includes(err)) run.submitted = true;
    }
    lbOnRunUpdate();
  }

  // Keyboard shortcuts must not fire while the player types their name.
  function isTyping(e) {
    const t = e.target;
    return !!t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable);
  }

  // Map an original-layout y (designed for the 512-tall world) into the current
  // world: the playfield is pinned to the bottom and the extra height becomes sky
  // on top. This keeps the bird, pipe-gap band, and UI identical to the original
  // 0.56-aspect game no matter how tall the screen is.
  function ay(y) { return y + (GH - BASE_GH); }

  function reset() {
    bird = { x: 80, y: ay(240), vy: 0, rot: 0, frame: 0, py: ay(240), prot: 0 };
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
    ensureShake();   // re-attach shake-to-pause if it was enabled in a prior session
    if (state === STATE.READY) {
      state = STATE.PLAY; bird.vy = FLAP; play("wing");
      // A new run starts: drop the last run's unsubmitted score and ask the server
      // for this run's token (it times the run with its own clock). Never blocks play.
      // A live session goes along and comes back renewed.
      pendingRun = null;
      runTokenP = LB_API
        ? lbPost("/start", sessionLive() ? { player: savedPlayer() } : {})
            .then((r) => {
              if (r.ok && r.data.player) localStorage.setItem("fb_player", r.data.player);
              return r.ok ? r.data.token : null;
            })
            .catch(() => null)
        : null;
    }
    else if (state === STATE.PLAY) { bird.vy = FLAP; bird.rot = -25; play("wing"); }
  }

  function tryRestart() {
    if (state === STATE.DEAD && deadTimer > 30) { play("swoosh"); reset(); }
  }

  // Hit-test a pointer event against the game-over buttons: "play", "board" or null.
  function gameOverButtonAt(e) {
    const im = IMG["button_play"]; if (!im) return null;
    const rect = cvs.getBoundingClientRect();
    const pt = (e.touches && e.touches[0]) ? e.touches[0] : e;
    const wx = (pt.clientX - rect.left) / rect.width * GW;
    const wy = (pt.clientY - rect.top) / rect.height * GH;
    const b = gameOverButtons(), pad = 6;   // small pad for easier tapping
    const hit = (cx) => cx != null
      && wx >= cx - im.width / 2 - pad && wx <= cx + im.width / 2 + pad
      && wy >= b.y - im.height / 2 - pad && wy <= b.y + im.height / 2 + pad;
    return hit(b.play) ? "play" : hit(b.board) ? "board" : null;
  }

  // Only react to taps/keys when the game has focus, so page scrolling still works.
  // On game over, only the buttons react: Play restarts, the podium opens the
  // Hall of Fame (once the buttons have appeared). Taps elsewhere do nothing.
  function onTap(e) {
    e.preventDefault();
    if (state === STATE.DEAD) {
      const btn = gameOverButtonAt(e);
      if (btn === "play") tryRestart();
      else if (btn === "board" && deadTimer > 20) openHallOfFame();
      return;
    }
    flap();
  }
  cvs.addEventListener("touchstart", onTap, { passive: false });
  cvs.addEventListener("mousedown", onTap);
  window.addEventListener("keydown", e => {
    if (e.code !== "Space" || isTyping(e)) return;
    e.preventDefault();
    if (paused) return;   // a panel is open: don't flap or restart behind it
    if (state === STATE.DEAD) tryRestart(); else flap();
  });

  function spawnPipe() {
    // Fixed vertical variability (the original's 40..230 band, ~190px), anchored a
    // constant distance above the ground via ay(). A taller screen adds sky on top
    // but never widens the gap-placement range, so difficulty matches the original.
    const minTop = ay(40), maxTop = ay(230);
    const topH = Math.floor(minTop + Math.random() * (maxTop - minTop));
    pipes.push({ x: GW + 10, topH, passed: false, px: GW + 10 });
  }

  function hit() {
    if (state !== STATE.PLAY) return;
    state = STATE.DEAD; deadTimer = 0; flashAlpha = 1; play("hit");
    setTimeout(() => play("die"), 250);
    if (score > best) { best = score; localStorage.setItem("fb_best", best); }
    // Submittable from the game-over and READY screens until the next run starts.
    pendingRun = (score > 0 && runTokenP)
      ? { score, tokenP: runTokenP, submitted: false, submitting: false, rank: null, at: Date.now(), status: "" }
      : null;
    runTokenP = null;
    // With a live session there's no form: a new best goes up on its own, anything
    // else has nothing to send.
    if (pendingRun && sessionLive()) {
      if (score > sessionBest()) sendRun(pendingRun, sessionName());
      else pendingRun.submitted = true;
    }
    // Medal reflects THIS run's score. Sprite indices aren't in tier order:
    // medals_0=platinum, _1=gold, _2=silver, _3=bronze (original art), and
    // _4..9 = sapphire/diamond/emerald/ruby/obsidian/radiant (generated).
    // Sapphire and above (medalIdx >= 4) get the sparkle effect.
    if (score >= 100) medalIdx = 9;       // radiant
    else if (score >= 90) medalIdx = 8;   // obsidian
    else if (score >= 80) medalIdx = 7;   // ruby
    else if (score >= 70) medalIdx = 6;   // emerald
    else if (score >= 60) medalIdx = 5;   // diamond
    else if (score >= 50) medalIdx = 4;   // sapphire
    else if (score >= 40) medalIdx = 0;   // platinum
    else if (score >= 30) medalIdx = 1;   // gold
    else if (score >= 20) medalIdx = 2;   // silver
    else if (score >= 10) medalIdx = 3;   // bronze
    else medalIdx = -1;                   // no medal under 10
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
      bird.y = ay(240) + Math.sin(frames / 10) * 6;
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

  // The Hall of Fame button for the game-over screen, built once from the Play
  // button so the frame, outline and shading match exactly: the green triangle is
  // painted over with the face colours and a podium (places 3-1-2) drawn in its
  // place, in the same 2px "art pixels" as the sprite.
  function makeBoardButton(play) {
    const c = document.createElement("canvas");
    c.width = play.width; c.height = play.height;
    const g = c.getContext("2d");
    g.drawImage(play, 0, 0);
    // Bounding box of the triangle (the sprite's only green pixels).
    const d = g.getImageData(0, 0, c.width, c.height).data;
    let x0 = c.width, x1 = -1, y0 = c.height, y1 = -1;
    for (let y = 0; y < c.height; y++) for (let x = 0; x < c.width; x++) {
      const k = (y * c.width + x) * 4;
      if (d[k + 3] && d[k + 1] > 120 && d[k] < 60 && d[k + 2] < 120) {
        if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
      }
    }
    // The face is #fafafa above y = 30 and #ededed below it.
    if (x1 >= 0) {
      const SPLIT = 30;
      g.fillStyle = "#fafafa"; g.fillRect(x0, y0, x1 - x0 + 1, Math.max(0, SPLIT - y0));
      g.fillStyle = "#ededed"; g.fillRect(x0, SPLIT, x1 - x0 + 1, Math.max(0, y1 - SPLIT + 1));
    }
    // Podium: one flat coral silhouette, no outlines (so no lines between the steps),
    // 3rd place on the left, 1st in the middle, 2nd on the right, centred vertically
    // on the face. Sizes are in 2px art pixels.
    const P = 2, FILL = "#f7714f", INK = "#fff3ec";
    const DIGITS = {   // 3x5 pixel glyphs
      1: [".#.", "##.", ".#.", ".#.", ".#."],
      2: ["##.", "..#", ".#.", "#..", "###"],
      3: ["##.", "..#", ".#.", "..#", "##."],
    };
    // The face runs from y = 10 to the tan line at 50-51. Ending the 30px podium at 46
    // leaves 6px above it (10-15) and 6px below it (46-51, tan line included).
    const base = 46;
    const SIDE_W = 9 * P, MID_W = 12 * P, SIDE_H = 9 * P, MID_H = 15 * P;
    const left = Math.round(c.width / 2 - (2 * SIDE_W + MID_W) / 2);
    const blocks = [
      { place: 3, x: left, w: SIDE_W, h: SIDE_H, digitTop: 2 },
      { place: 1, x: left + SIDE_W, w: MID_W, h: MID_H, digitTop: 3 },
      { place: 2, x: left + SIDE_W + MID_W, w: SIDE_W, h: SIDE_H, digitTop: 2 },
    ];
    g.fillStyle = FILL;
    for (const b of blocks) g.fillRect(b.x, base - b.h, b.w, b.h);
    g.fillStyle = INK;
    for (const b of blocks) {
      const gx = b.x + Math.round((b.w - 3 * P) / 2), gy = base - b.h + b.digitTop * P;
      DIGITS[b.place].forEach((row, j) => {
        for (let i = 0; i < 3; i++) if (row[i] === "#") g.fillRect(gx + i * P, gy + j * P, P, P);
      });
    }
    return c;
  }

  // The ground as one pre-tiled strip, at least GW + 24 wide (the scroll offset runs
  // from 0 to -24), rebuilt only when the world width changes. Drawing the 336px land
  // tile several times side by side at fractional x left hairline joins between the
  // copies on wide screens, where the GPU-softened edges let the green background
  // show through as thin vertical lines. One strip has no joins in view.
  let groundCache = null;
  function groundStrip(land) {
    const w = Math.ceil((GW + 24) / land.width) * land.width;
    if (!groundCache || groundCache.width !== w) {
      groundCache = document.createElement("canvas");
      groundCache.width = w;
      groundCache.height = land.height;
      const g = groundCache.getContext("2d");
      for (let x = 0; x < w; x += land.width) g.drawImage(land, x, 0);   // whole pixels: exact fit
    }
    return groundCache;
  }

  // Game-over buttons: Play, and with a leaderboard the Hall of Fame button beside it.
  // Returns their centres; both are the Play sprite's size.
  const OVER_BTN_GAP = 16;
  function gameOverButtons() {
    const w = IMG["button_play"] ? IMG["button_play"].width : 0;
    const off = LB_API ? (w + OVER_BTN_GAP) / 2 : 0;
    return { y: ay(300), play: GW / 2 - off, board: LB_API ? GW / 2 + off : null };
  }
  // A score waiting for a submit by hand: the Hall of Fame button bobs to say so.
  const boardPending = () => !!pendingRun && !pendingRun.submitted && !pendingRun.submitting;

  // Twinkling 4-point sparkles for high-tier medals (sapphire+). t = frame count.
  function drawSparkle(cx, cy, r) {
    ctx.beginPath();
    ctx.moveTo(cx, cy - r);
    ctx.quadraticCurveTo(cx + r * 0.16, cy - r * 0.16, cx + r, cy);
    ctx.quadraticCurveTo(cx + r * 0.16, cy + r * 0.16, cx, cy + r);
    ctx.quadraticCurveTo(cx - r * 0.16, cy + r * 0.16, cx - r, cy);
    ctx.quadraticCurveTo(cx - r * 0.16, cy - r * 0.16, cx, cy - r);
    ctx.fill();
  }
  const SPARKLES = [[-20, -15, 0], [18, -13, 1.7], [13, 16, 3.1], [-15, 15, 4.5], [3, -22, 2.3], [21, 3, 5.2]];
  function drawSparkles(cx, cy, t) {
    ctx.save();
    ctx.fillStyle = "#fff";
    for (let i = 0; i < SPARKLES.length; i++) {
      const s = SPARKLES[i];
      const tw = (Math.sin(t * 0.12 + s[2]) + 1) / 2;   // 0..1 twinkle
      if (tw <= 0.12) continue;
      ctx.globalAlpha = tw;
      drawSparkle(cx + s[0], cy + s[1], 2 + tw * 4);
    }
    ctx.restore();
  }

  // Glossy diagonal shine that periodically sweeps across high-tier medals
  // (emerald+). Clipped to the medal disc; additive so it reads as a gleam.
  function drawMedalShine(cx, cy, t) {
    const period = 150, dur = 45, tt = t % period;   // sweep ~0.75s every ~2.5s
    if (tt >= dur) return;
    const p = tt / dur, r = 20, w = 0.18;
    const cl = (v) => Math.min(1, Math.max(0, v));
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.clip();
    const g = ctx.createLinearGradient(cx - r, cy - r, cx + r, cy + r);  // diagonal
    g.addColorStop(0, "rgba(255,255,255,0)");
    if (p - w > 0) g.addColorStop(cl(p - w), "rgba(255,255,255,0)");
    g.addColorStop(cl(p), "rgba(255,255,255,0.6)");
    if (p + w < 1) g.addColorStop(cl(p + w), "rgba(255,255,255,0)");
    g.addColorStop(1, "rgba(255,255,255,0)");
    ctx.globalCompositeOperation = "lighter";
    ctx.fillStyle = g;
    ctx.fillRect(cx - r, cy - r, 2 * r, 2 * r);
    ctx.restore();
  }

  // Tier name shown under the medal. Indexed by medalIdx (see hit()).
  const MEDAL_NAMES = ["PLATINUM", "GOLD", "SILVER", "BRONZE", "SAPPHIRE",
    "DIAMOND", "EMERALD", "RUBY", "OBSIDIAN", "RADIANT"];
  function drawMedalLabel(idx, cx, cy) {
    const name = MEDAL_NAMES[idx]; if (!name) return;
    ctx.save();
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = "800 12px 'Trebuchet MS', Verdana, Geneva, sans-serif";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#543847";   // dark-brown outline (matches the score digits)
    ctx.fillStyle = "#fff";
    ctx.lineWidth = 3;
    ctx.strokeText(name, cx, cy);
    ctx.fillText(name, cx, cy);
    ctx.restore();
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
      const PH = downIm.height;        // native sprite height
      // Draw each pipe sprite at native size (cap undistorted), then extend the
      // shaft to the screen edge with a stretched end-slice — needed because GH
      // (and thus the distance to the ground/top) grows beyond PH in app mode.
      // Top pipe: cap meets the gap at p.topH, shaft runs up to the top edge.
      const topY = p.topH - PH;
      ctx.drawImage(downIm, px, topY, PIPE_W, PH);
      if (topY > 0) ctx.drawImage(downIm, 0, 0, downIm.width, 2, px, 0, PIPE_W, topY);
      // Bottom pipe: cap meets the gap at p.topH + GAP, shaft runs down to ground.
      const botY = p.topH + GAP, botEnd = botY + PH;
      ctx.drawImage(upIm, px, botY, PIPE_W, PH);
      if (botEnd < FLOOR_Y) ctx.drawImage(upIm, 0, upIm.height - 2, upIm.width, 2, px, botEnd, PIPE_W, FLOOR_Y - botEnd);
    }
    // ground — interpolate the continuous scroll, wrap at the 24px stripe period, and
    // draw it as one solid strip (see groundStrip()) so no tile joins are on screen
    const land = IMG["land"];
    if (land) {
      const ig = groundPrev + (groundX - groundPrev) * alpha;
      ctx.drawImage(groundStrip(land), ig % 24, FLOOR_Y);
    }
    // bird
    const by = bird.py + (bird.y - bird.py) * alpha;
    const brot = bird.prot + (bird.rot - bird.prot) * alpha;
    ctx.save();
    ctx.translate(bird.x, by); ctx.rotate(brot * Math.PI / 180);
    drawCentered("bird" + birdColor + "_" + bird.frame, 0, 0, 1);
    ctx.restore();

    if (state === STATE.READY) {
      drawCentered("text_ready", GW / 2, ay(150), 1);
      drawCentered("tutorial", GW / 2, ay(250), 1);
    }
    if (state === STATE.PLAY) {
      drawNumber(score, GW / 2, 40 + HUD_TOP, "big");
    }
    if (state === STATE.DEAD) {
      drawCentered("text_game_over", GW / 2, ay(120), 1);
      if (deadTimer > 20) {
        const px = GW / 2, py = ay(200);
        drawCentered("score_panel", px, py, 1);
        const sx = px + 72;
        drawNumber(score, sx, py - 27, "score");
        drawNumber(best, sx, py + 16, "score");
        if (medalIdx >= 0) {
          drawCentered("medals_" + medalIdx, px - 66, py + 2, 1);
          if (medalIdx >= 6) drawMedalShine(px - 66, py + 2, frames);   // emerald+
          if (medalIdx >= 4) drawSparkles(px - 66, py + 2, frames);
          drawMedalLabel(medalIdx, px - 66, py + 37);
        }
        const btn = gameOverButtons();
        drawCentered("button_play", btn.play, btn.y, 1);
        if (btn.board != null) {
          // Bob gently while the last run's score is waiting to be submitted.
          const bob = boardPending() ? Math.round(Math.abs(Math.sin(frames / 9)) * -4) : 0;
          drawCentered("button_board", btn.board, btn.y + bob, 1);
        }
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
  let ensureShake = () => {};         // (re)acquires shake-to-pause on a user gesture
  let requestPause = () => {};        // pauses the game (assigned by the settings UI)
  let prevGW = 0, prevGH = 0;         // last world size, to detect viewport reshapes
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
        drawNumber(fpsValue, 26, 28 + HUD_TOP, "score");
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

    // Esc leaves fullscreen — the toggle button sits outside the fullscreened
    // frame so it's unreachable while active. (Real fullscreen also exits on Esc
    // natively; this additionally covers the iOS CSS fake-fullscreen.)
    window.addEventListener("keydown", function (e) {
      if (e.code !== "Escape" || isTyping(e)) return;
      if (document.fullscreenElement && exit) exit.call(document);
      else if (wrap.classList.contains("flappy-fake-fullscreen")) exitFakeFullscreen();
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

    // Shake-to-pause is iOS-only (DeviceMotionEvent.requestPermission is the iOS
    // signal) and webapp-only (body.flappy-app), so its toggle only appears there.
    const SHAKE_AVAILABLE = typeof DeviceMotionEvent !== "undefined"
      && typeof DeviceMotionEvent.requestPermission === "function"
      && document.body.classList.contains("flappy-app");
    const row = (label, key) =>
      '<label class="flappy-setting-row">'
        + '<span class="flappy-setting-label">' + label + '</span>'
        + '<input type="checkbox" class="flappy-toggle" data-key="' + key + '">'
        + '<span class="flappy-switch" aria-hidden="true"></span>'
      + '</label>';
    // Toggle rows shared by the Options and Paused panels.
    const TOGGLE_ROWS = row("SOUND", "sound") + row("SHOW FPS", "fps")
      + (SHAKE_AVAILABLE ? row("SHAKE TO PAUSE", "shake") : "");

    const overlay = document.createElement("div");
    overlay.className = "flappy-settings-overlay";
    overlay.innerHTML =
      '<div class="flappy-settings-panel" role="dialog" aria-label="Settings">'
        + '<div class="flappy-settings-title">OPTIONS</div>'
        + TOGGLE_ROWS
        + '<button type="button" class="flappy-settings-close">CLOSE</button>'
        + '<div class="flappy-version">v' + APP_VERSION + '</div>'
      + '</div>';

    const pauseOverlay = document.createElement("div");
    pauseOverlay.className = "flappy-settings-overlay";
    pauseOverlay.innerHTML =
      '<div class="flappy-settings-panel" role="dialog" aria-label="Paused">'
        + '<div class="flappy-settings-title">PAUSED</div>'
        + TOGGLE_ROWS
        + '<button type="button" class="flappy-settings-close flappy-resume">RESUME</button>'
      + '</div>';

    frame.appendChild(gear);
    frame.appendChild(pauseBtn);
    frame.appendChild(overlay);
    frame.appendChild(pauseOverlay);

    const closeBtn = overlay.querySelector(".flappy-settings-close");
    const resumeBtn = pauseOverlay.querySelector(".flappy-resume");
    // Both panels carry the same toggles; keep every copy in sync with `settings`.
    const soundInputs = frame.querySelectorAll('.flappy-toggle[data-key="sound"]');
    const fpsInputs = frame.querySelectorAll('.flappy-toggle[data-key="fps"]');
    const shakeInputs = frame.querySelectorAll('.flappy-toggle[data-key="shake"]');

    function syncInputs() {
      soundInputs.forEach((i) => { i.checked = !settings.muted; });
      fpsInputs.forEach((i) => { i.checked = settings.showFps; });
      shakeInputs.forEach((i) => { i.checked = settings.shake; });
    }
    function openSettings() { syncInputs(); overlay.classList.add("open"); paused = true; }
    function closeSettings() { overlay.classList.remove("open"); paused = false; }

    gear.addEventListener("click", openSettings);
    closeBtn.addEventListener("click", closeSettings);
    overlay.addEventListener("click", (e) => { if (e.target === overlay) closeSettings(); });
    soundInputs.forEach((i) => i.addEventListener("change", () => {
      settings.muted = !i.checked;
      localStorage.setItem("fb_muted", settings.muted ? "1" : "0");
      syncInputs();
    }));
    fpsInputs.forEach((i) => i.addEventListener("change", () => {
      settings.showFps = i.checked;
      localStorage.setItem("fb_showfps", settings.showFps ? "1" : "0");
      syncInputs();
    }));

    // Shake-to-pause (iOS webapp only). A deliberate shake during play pauses the
    // game; motion access is requested on the toggle tap (a required user gesture).
    let shakeAttached = false, lax = null, lay = null, laz = null, lastShakeT = 0;
    const SHAKE_THRESHOLD = 25;        // sum of |Δaccel| (m/s²) for a deliberate shake
    function onMotion(e) {
      if (!settings.shake) return;
      const a = e.accelerationIncludingGravity;
      if (!a || a.x == null) return;
      if (lax !== null) {
        const delta = Math.abs(a.x - lax) + Math.abs(a.y - lay) + Math.abs(a.z - laz);
        if (delta > SHAKE_THRESHOLD && Date.now() - lastShakeT > 1000) {
          lastShakeT = Date.now();
          pauseGame();                 // self-guards: only pauses during active play
        }
      }
      lax = a.x; lay = a.y; laz = a.z;
    }
    function enableShake() {
      return DeviceMotionEvent.requestPermission().then((res) => {
        if (res !== "granted") return false;
        if (!shakeAttached) { window.addEventListener("devicemotion", onMotion); shakeAttached = true; }
        return true;
      }).catch(() => false);
    }
    if (SHAKE_AVAILABLE) {
      shakeInputs.forEach((i) => i.addEventListener("change", () => {
        if (i.checked) {
          enableShake().then((ok) => {     // ok=false if the user denies access
            settings.shake = ok;
            localStorage.setItem("fb_shake", ok ? "1" : "0");
            syncInputs();
          });
        } else {
          settings.shake = false;
          localStorage.setItem("fb_shake", "0");
          syncInputs();
        }
      }));
      // Re-attach on the first flap if shake was left enabled in a prior session
      // (motion access can only be (re)requested from a user gesture).
      ensureShake = function () { if (settings.shake && !shakeAttached) enableShake(); };
    }

    // Pause (in-game) → hard freeze + PAUSED panel. Resume → 3-2-1 countdown then play.
    function pauseGame() {
      if (state !== STATE.PLAY || paused || countdown > 0) return;
      syncInputs();
      paused = true;
      pauseOverlay.classList.add("open");
    }
    function resumeGame() {
      if (!pauseOverlay.classList.contains("open")) return;
      pauseOverlay.classList.remove("open");
      paused = false;
      countdown = 3000;
    }
    pauseBtn.addEventListener("click", pauseGame);
    resumeBtn.addEventListener("click", resumeGame);
    requestPause = pauseGame;   // let resize() auto-pause on a viewport reshape
    // P key toggles pause / resume during play.
    window.addEventListener("keydown", (e) => {
      if (e.code !== "KeyP" || isTyping(e)) return;
      e.preventDefault();
      if (pauseOverlay.classList.contains("open")) resumeGame();
      else pauseGame();
    });

    // ---- online leaderboard: Hall of Fame panel, opened from the game-over screen's
    // podium button (drawn on the canvas, see drawGameOverButtons()).
    // Only static strings go through innerHTML; everything from the server is set
    // with textContent, so a name can never inject HTML into the page.
    if (LB_API) {
      const CLOSE_SVG = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"'
        + ' stroke="currentColor" stroke-width="4" stroke-linecap="round"/></svg>';
      const lbOverlay = document.createElement("div");
      lbOverlay.className = "flappy-settings-overlay";
      lbOverlay.innerHTML =
        '<div class="flappy-lb-panel" role="dialog" aria-label="Hall of Fame">'
          + '<button type="button" class="flappy-lb-x" aria-label="Close">' + CLOSE_SVG + '</button>'
          + '<div class="flappy-lb-title">Hall of Fame</div>'
          + '<div class="flappy-lb-row flappy-lb-head" aria-hidden="true">'
            + '<span>PLACE</span><span>NAME</span><span>DATE</span><span>SCORE</span></div>'
          + '<div class="flappy-lb-body">'
            + '<ol class="flappy-lb-list"></ol>'
            + '<div class="flappy-lb-note"></div>'
          + '</div>'
          + '<div class="flappy-lb-row flappy-lb-you" hidden></div>'
          + '<form class="flappy-lb-form" hidden>'
            + '<input class="flappy-lb-name" maxlength="10" autocomplete="nickname"'
            +   ' autocapitalize="characters" spellcheck="false" placeholder="YOUR NAME"'
            +   ' aria-label="Your name">'
            + '<span class="flappy-lb-hash" aria-hidden="true">#</span>'
            + '<input class="flappy-lb-num" maxlength="3" inputmode="numeric"'
            +   ' autocomplete="off" placeholder="AUTO"'
            +   ' aria-label="Your number, 0 to 999 (optional)">'
            + '<button type="submit" class="flappy-lb-submit">SUBMIT</button>'
          + '</form>'
          + '<div class="flappy-lb-status" aria-live="polite"></div>'
        + '</div>';
      frame.appendChild(lbOverlay);

      const list = lbOverlay.querySelector(".flappy-lb-list");
      const note = lbOverlay.querySelector(".flappy-lb-note");
      const youRow = lbOverlay.querySelector(".flappy-lb-you");
      const form = lbOverlay.querySelector(".flappy-lb-form");
      const nameInput = lbOverlay.querySelector(".flappy-lb-name");
      const numInput = lbOverlay.querySelector(".flappy-lb-num");
      const submitBtn = lbOverlay.querySelector(".flappy-lb-submit");
      const lbStatus = lbOverlay.querySelector(".flappy-lb-status");

      // Hold and drag to scroll the list with a mouse, the way a finger scrolls it on a
      // phone; a flick keeps gliding briefly. Touch and pens are left to the browser's
      // own scrolling (touch-action: pan-y in the CSS), which already has momentum.
      const lbBody = list.parentElement;
      let drag = null, glide = 0;
      lbBody.addEventListener("pointerdown", (e) => {
        if (e.pointerType !== "mouse" || e.button !== 0) return;
        // Leave a press on the scrollbar itself to the browser.
        if (e.clientX - lbBody.getBoundingClientRect().left >= lbBody.clientLeft + lbBody.clientWidth) return;
        cancelAnimationFrame(glide);
        drag = { id: e.pointerId, y: e.clientY, top: lbBody.scrollTop, lastY: e.clientY, lastT: e.timeStamp, v: 0, moved: false };
      });
      lbBody.addEventListener("pointermove", (e) => {
        if (!drag || e.pointerId !== drag.id) return;
        const dy = e.clientY - drag.y;
        if (!drag.moved) {
          if (Math.abs(dy) < 4) return;          // still a click, not a drag
          drag.moved = true;
          try { lbBody.setPointerCapture(e.pointerId); } catch {}   // keep dragging outside the list
          lbBody.classList.add("flappy-lb-dragging");
        }
        lbBody.scrollTop = drag.top - dy;
        const dt = e.timeStamp - drag.lastT;
        if (dt > 0) drag.v = (drag.lastY - e.clientY) / dt;        // px per ms, in scroll direction
        drag.lastY = e.clientY; drag.lastT = e.timeStamp;
      });
      function endDrag(e) {
        if (!drag || e.pointerId !== drag.id) return;
        const { moved, lastT } = drag;
        let v = drag.v;
        drag = null;
        lbBody.classList.remove("flappy-lb-dragging");
        if (!moved || e.timeStamp - lastT > 80) return;            // held still before letting go
        let t = performance.now();
        const step = (now) => {
          const dt = now - t; t = now;
          lbBody.scrollTop += v * dt;
          v *= Math.pow(0.95, dt / 16);                            // ease out over ~half a second
          if (Math.abs(v) > 0.02) glide = requestAnimationFrame(step);
        };
        glide = requestAnimationFrame(step);
      }
      lbBody.addEventListener("pointerup", endDrag);
      lbBody.addEventListener("pointercancel", endDrag);
      lbBody.addEventListener("wheel", () => cancelAnimationFrame(glide), { passive: true });

      // Same rules as the Worker: names already registered may be up to 12 characters
      // (they predate the limit), new ones up to 10. The Worker also checks a blocklist.
      const NAME_RE = /^[\p{L}\p{N} _.\-]{1,12}$/u;
      const NEW_NAME_RE = /^[\p{L}\p{N} _.\-]{1,10}$/u;
      // Places 1-3 wear the game's own medal art (see MEDAL_NAMES: 1=gold, 2=silver, 3=bronze).
      const PLACE_MEDALS = { 1: "medals_1", 2: "medals_2", 3: "medals_3" };

      const savedName = () => localStorage.getItem("fb_name") || "";

      // The result screen's twinkling sparkles (SPARKLES, drawSparkles()) on a medal
      // in the list: same spots, scaled from the 44px sprite to the 24px coin, and the
      // same twinkle (alpha = (sin(0.12 * frame + phase) + 1) / 2, ~0.87 s per cycle),
      // done as a CSS animation offset by each sparkle's phase.
      const COIN_PX = 24, COIN_SCALE = COIN_PX / 44;
      function addSparkles(coin) {
        for (const [dx, dy, phase] of SPARKLES) {
          const s = document.createElement("span");
          s.className = "flappy-lb-sparkle";
          s.style.left = (COIN_PX / 2 + dx * COIN_SCALE).toFixed(1) + "px";
          s.style.top = (COIN_PX / 2 + dy * COIN_SCALE).toFixed(1) + "px";
          s.style.animationDelay = (-(phase + Math.PI / 2) / 7.2).toFixed(3) + "s";
          coin.appendChild(s);
        }
      }
      // "now", "5m ago", "2h ago", "3d ago", "4mo ago", "1y ago"
      function ago(ms) {
        const s = (Date.now() - ms) / 1000;
        if (!(s >= 60)) return "now";
        const m = s / 60; if (m < 60) return Math.floor(m) + "m ago";
        const h = m / 60; if (h < 24) return Math.floor(h) + "h ago";
        const d = h / 24; if (d < 30) return Math.floor(d) + "d ago";
        if (d < 365) return Math.floor(d / 30) + "mo ago";
        return Math.floor(d / 365) + "y ago";
      }
      // Fill one row's four cells: place (medal or number), name, date, score.
      function fillRow(row, r) {
        const place = document.createElement("span");
        place.className = "flappy-lb-place";
        if (PLACE_MEDALS[r.rank] && ASSETS.sprites[PLACE_MEDALS[r.rank]]) {
          const img = document.createElement("img");
          img.src = ASSETS.sprites[PLACE_MEDALS[r.rank]];
          img.alt = String(r.rank);
          // Effects follow the result screen's medal tiers: 1st gets the top tier
          // (gloss sweep + sparkles, like emerald and up), 2nd the middle tier
          // (sparkles, like sapphire and diamond), 3rd the plain medal.
          const coin = document.createElement("span");
          coin.className = "flappy-lb-coin" + (r.rank === 1 ? " flappy-lb-coin-shine" : "");
          coin.appendChild(img);
          if (r.rank <= 2) addSparkles(coin);
          place.appendChild(coin);
        } else {
          place.textContent = r.rank == null ? "-" : String(r.rank);
          if (r.rank >= 1000) place.classList.add("flappy-lb-place-long");
        }
        // "Name #N": the name shortens with "..." if needed, the number always shows.
        const name = document.createElement("span"); name.className = "flappy-lb-who";
        const nameText = document.createElement("span"); nameText.className = "flappy-lb-who-name";
        nameText.textContent = r.name;
        name.appendChild(nameText);
        if (Number.isInteger(r.tag)) {
          const tag = document.createElement("span"); tag.className = "flappy-lb-tag";
          tag.textContent = "#" + tagDigits(r.tag);
          name.appendChild(tag);
        }
        const when = document.createElement("span"); when.className = "flappy-lb-when"; when.textContent = r.at ? ago(r.at) : "";
        const score = document.createElement("span"); score.className = "flappy-lb-score"; score.textContent = String(r.score);
        row.replaceChildren(place, name, when, score);
        row.classList.toggle("flappy-lb-podium", r.rank >= 1 && r.rank <= 3);
      }
      function renderTop(rows) {
        // Your own row is the one with your session's name and number.
        const me = sessionLive() ? playerInfo() : null;
        list.replaceChildren(...rows.map((r, i) => {
          const li = document.createElement("li");
          li.className = "flappy-lb-row";
          fillRow(li, { rank: i + 1, name: r.name, tag: r.tag, score: r.score, at: r.at });
          if (me && String(r.name).toLowerCase() === me.n && r.tag === me.tag) li.classList.add("flappy-lb-me");
          return li;
        }));
      }
      let loadSeq = 0;
      function loadTop(fresh) {
        const seq = ++loadSeq;           // ignore replies that arrive out of order
        if (!list.children.length) note.textContent = "LOADING...";
        // After a submit, skip the browser's 15 s cache so the new score shows. "reload"
        // also refreshes the cached copy, so reopening the panel right after doesn't fall
        // back to the list from before the submit ("no-store" left that copy in place).
        fetch(LB_API + "/top?limit=100", { cache: fresh ? "reload" : "default" })
          .then((r) => r.json())
          .then((d) => {
            if (seq !== loadSeq) return;
            const rows = Array.isArray(d.scores) ? d.scores : [];
            renderTop(rows);
            note.textContent = rows.length ? "" : "NO SCORES YET";
          })
          .catch(() => { if (seq === loadSeq) note.textContent = "OFFLINE"; });
      }

      // Pinned yellow row. A signed-in player sees their best on the board, with its
      // current rank and date, whatever the last run was. A player who hasn't joined yet
      // sees the run they just played as "YOU", with the rank it would get.
      let youSeq = 0;
      function loadYou() {
        const seq = ++youSeq;
        const name = savedName();
        const tag = sessionTag();
        const known = sessionLive() && NAME_RE.test(name);
        const show = (r) => {
          if (seq !== youSeq) return;
          youRow.hidden = !r;
          if (r) fillRow(youRow, r);
        };
        const run = pendingRun;
        // The last run, as "YOU" with its projected rank (only for a player not on the board).
        const showRun = () => {
          if (!run) return show(null);
          const base = { name: "YOU", score: run.score, at: run.at };
          if (run.rank) return show({ ...base, rank: run.rank });
          show({ ...base, rank: null });
          fetch(LB_API + "/rank?score=" + run.score).then((r) => r.json())
            .then((d) => { if (d && d.rank) show({ ...base, rank: d.rank }); })
            .catch(() => {});
        };
        if (!known) return showRun();
        // Until the server answers, show the best this device knows, without a rank.
        if (youRow.hidden) show({ name, tag, score: sessionBest() || (run ? run.score : 0), rank: null });
        fetch(LB_API + "/rank?name=" + encodeURIComponent(name) + "&tag=" + tag, { cache: "no-store" })
          .then((r) => r.json())
          .then((d) => {
            if (d && d.rank) show({ rank: d.rank, name: d.name, tag: d.tag, score: d.score, at: d.at });
            else show(null);   // not on the board (e.g. its scores were hidden)
          })
          .catch(() => {});
      }

      function lbIsOpen() { return lbOverlay.classList.contains("open"); }
      // The form shows only while the last run still needs a submit by hand: a new
      // player picking a name, or a session whose automatic submit failed (retry).
      // During a submit by hand it stays where it is with SUBMIT disabled, so a refused
      // name doesn't make the panel shrink and grow back in a blink; an automatic
      // submit never shows it.
      let formRun = null;              // the run the name box was last filled for
      function renderForm() {
        const run = pendingRun;
        const busy = !!run && run.submitting;
        const canSubmit = !!run && !run.submitted && !busy;
        form.hidden = !(canSubmit || (busy && run.byHand));
        submitBtn.disabled = busy;
        if (canSubmit) {
          const live = sessionLive();
          // A new player's boxes start empty for each run, then keep what they type
          // across retries (TAG TAKEN etc.) of that run. A session shows its own name
          // and number, read-only.
          if (live) { nameInput.value = sessionName(); numInput.value = tagDigits(sessionTag()); }
          else if (run !== formRun || nameInput.readOnly) { nameInput.value = ""; numInput.value = ""; }
          formRun = run;
          for (const el of [nameInput, numInput]) {
            el.readOnly = live;
            el.classList.toggle("flappy-lb-name-locked", live);
          }
        }
        lbStatus.textContent = run && run.submitting ? "SAVING..."
          : run && run.status ? run.status
          : !canSubmit || sessionLive() ? ""
          : sessionExpired ? "SESSION EXPIRED: PICK A NAME AGAIN"
          : "NUMBER OPTIONAL. CAN'T BE CHANGED LATER";
      }
      function openLb() {
        paused = true;
        lbOverlay.classList.add("open");
        renderForm();
        list.parentElement.scrollTop = 0;
        // Skip the browser's 15 s cache when the last run was just saved.
        loadTop(!!(pendingRun && pendingRun.rank));
        loadYou();
      }
      // A submit started, finished or failed: redraw if the panel is showing.
      lbOnRunUpdate = () => {
        if (!lbIsOpen()) return;
        renderForm();
        if (pendingRun && pendingRun.rank) { loadTop(true); loadYou(); }
      };
      function closeLb() {
        if (document.activeElement === nameInput || document.activeElement === numInput) {
          document.activeElement.blur();   // drop the iOS keyboard
        }
        lbOverlay.classList.remove("open");
        paused = false;
      }
      openHallOfFame = openLb;
      lbOverlay.querySelector(".flappy-lb-x").addEventListener("click", closeLb);
      lbOverlay.addEventListener("click", (e) => { if (e.target === lbOverlay) closeLb(); });
      window.addEventListener("keydown", (e) => {
        if (e.code === "Escape" && lbIsOpen()) { e.preventDefault(); closeLb(); }
      });

      form.addEventListener("submit", (e) => {
        e.preventDefault();
        const run = pendingRun;
        if (!run || run.submitted || run.submitting) return;
        const live = sessionLive();
        const name = live ? sessionName() : nameInput.value.normalize("NFKC").trim().replace(/\s+/g, " ");
        const tag = live ? "" : numInput.value.trim();
        if (!live && !NEW_NAME_RE.test(name)) {
          lbStatus.textContent = "LETTERS, NUMBERS, SPACE . _ - (MAX 10)";
          return;
        }
        if (!live && tag !== "" && !/^\d{1,3}$/.test(tag)) {
          lbStatus.textContent = "NUMBER: 0 TO 999, OR LEAVE IT BLANK";
          return;
        }
        if (document.activeElement === nameInput || document.activeElement === numInput) {
          document.activeElement.blur();   // drop the iOS keyboard
        }
        // An empty number means "the lowest free one". What sendRun saves (fb_name,
        // fb_player) is only ever what the server accepted. byHand keeps the form on
        // screen while it saves (see renderForm()).
        run.byHand = true;
        sendRun(run, name, tag === "" ? "" : Number(tag));
      });
    }

    // Gear on menu/game-over, pause during play, none while a panel is open or the
    // countdown is running. Guarded so the DOM is touched only on change.
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
