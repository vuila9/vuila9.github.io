// Talk2Me — fullscreen toggle + viewport handshake for the embedded chat.
//
// The iframe itself just fills #chat-frame at 100% (see effects.css), so unlike
// a canvas game there's no internal resize step needed — only the frame's own
// box needs to grow, same fullscreen/fake-fullscreen pattern as Flappy Bird.
//
// Mobile keyboards need the handshake at the bottom of this file, because
// neither side of the iframe can see the whole picture on its own:
//   - This page can't detect focus inside a cross-origin iframe, so it can't
//     tell when the keyboard is about to open (or which element to reveal).
//   - The chat app can't measure the keyboard, because CSS viewport units
//     inside an iframe resolve to the *iframe's* box, not the browser
//     viewport — which is why it self-sizes correctly standalone but not here.
// So each side posts the other what it alone can see. See CHAT_EMBED_API.md
// for the matching listener that belongs in the website4u.vn codebase.
(function () {
  const frame = document.getElementById("chat-frame");
  const iframe = document.getElementById("chat-iframe");
  const fsBtn = document.getElementById("chat-fullscreen");
  const exitBtn = document.getElementById("chat-exit-fullscreen");
  if (!frame || !iframe || !fsBtn || !exitBtn) return;

  const req = frame.requestFullscreen || frame.webkitRequestFullscreen;
  const exit = document.exitFullscreen || document.webkitExitFullscreen;

  function isRealFullscreen() {
    return (document.fullscreenElement || document.webkitFullscreenElement) === frame;
  }

  function isFakeFullscreen() {
    return frame.classList.contains("chat-fake-fullscreen");
  }

  // One class drives the fullscreen-only UI (the exit button) in both modes.
  function syncFullscreenState() {
    frame.classList.toggle("chat-is-fullscreen", isRealFullscreen() || isFakeFullscreen());
    // Fullscreen changes how much room the chat has, so tell it.
    onViewportChange();
  }

  function enterFakeFullscreen() {
    frame.classList.add("chat-fake-fullscreen");
    document.body.classList.add("chat-fullscreen-open");
    syncFullscreenState();
  }

  function exitFakeFullscreen() {
    frame.classList.remove("chat-fake-fullscreen");
    document.body.classList.remove("chat-fullscreen-open");
    syncFullscreenState();
  }

  function enterFullscreen() {
    if (!req) {
      // No element Fullscreen API (iPhone Safari) — use the CSS fallback.
      enterFakeFullscreen();
      return;
    }
    // A browser can expose the API yet still refuse; fall back rather than
    // leaving the button looking broken.
    const result = req.call(frame);
    if (result && typeof result.catch === "function") {
      result.catch(enterFakeFullscreen);
    }
  }

  function exitFullscreen() {
    if (isRealFullscreen() && exit) {
      exit.call(document);
    } else if (isFakeFullscreen()) {
      exitFakeFullscreen();
    }
  }

  // Esc leaves fullscreen — real fullscreen already does this natively; this
  // additionally covers the iOS CSS fake-fullscreen fallback.
  window.addEventListener("keydown", function (e) {
    if (e.code === "Escape") exitFullscreen();
  });

  fsBtn.addEventListener("click", function () {
    if (isRealFullscreen() || isFakeFullscreen()) exitFullscreen();
    else enterFullscreen();
  });

  // Mobile has no Esc key, and the expand button is hidden under the overlay.
  exitBtn.addEventListener("click", exitFullscreen);

  // Real fullscreen can also be left natively (Esc, Android back gesture).
  document.addEventListener("fullscreenchange", syncFullscreenState);
  document.addEventListener("webkitfullscreenchange", syncFullscreenState);

  // --- Viewport handshake with the embedded chat app ---------------------
  const CHAT_ORIGIN = "https://website4u.vn";
  // Below this, a viewport shrink is a toolbar collapsing rather than a
  // keyboard opening, and the frame should be left alone.
  const KEYBOARD_MIN_INSET = 100;

  let heightOverridden = false;

  // Same shifted-page problem as the Stream Simulator project: focusing the
  // chat input opens the on-screen keyboard, which shrinks the visual
  // viewport and the page scrolls to keep the input in view. Some browsers
  // don't restore that scroll position once the keyboard closes again,
  // leaving the page stuck shifted up. The difference here is the input
  // itself lives inside a cross-origin iframe, so this page can't attach a
  // focus/blur listener to it directly — instead it relies on the
  // talk2me:input-focus/-blur handshake messages above, backed by the
  // visualViewport height as a fallback in case a blur message is ever
  // missed (e.g. the tab is backgrounded while the keyboard is still open).
  let scrollYBeforeKeyboard = null;
  let wasKeyboardOpen = false;

  function rememberScrollPosition() {
    if (scrollYBeforeKeyboard === null) {
      scrollYBeforeKeyboard = window.scrollY;
    }
  }

  function restoreScrollPosition() {
    if (scrollYBeforeKeyboard !== null) {
      window.scrollTo({ top: scrollYBeforeKeyboard, behavior: "instant" });
      scrollYBeforeKeyboard = null;
    }
  }

  function isMobile() {
    return window.matchMedia("(max-width: 736px)").matches;
  }

  function postToChat(message) {
    // Cross-origin, so target the origin explicitly rather than "*" — this
    // message describes the visitor's screen and shouldn't go anywhere else.
    if (iframe.contentWindow) {
      iframe.contentWindow.postMessage(message, CHAT_ORIGIN);
    }
  }

  // Report the slice of the chat that's genuinely on screen, so the chat app
  // can keep its input above the keyboard instead of below it.
  function sendViewport() {
    const vv = window.visualViewport;
    if (!vv) return;

    // Measure the iframe itself - it is what the chat app actually lays out in.
    const rect = iframe.getBoundingClientRect();
    const visibleTop = Math.max(rect.top, vv.offsetTop);
    const visibleBottom = Math.min(rect.bottom, vv.offsetTop + vv.height);

    postToChat({
      type: "talk2me:viewport",
      frameHeight: Math.round(rect.height),
      visibleHeight: Math.round(Math.max(0, visibleBottom - visibleTop)),
      keyboardInset: Math.round(Math.max(0, window.innerHeight - vv.height)),
    });
  }

  // Keep the frame inside the space the keyboard hasn't covered. This only
  // ever changes `height` — never `position` — because repositioning an
  // element while an iOS keyboard is open desynchronises hit-testing and
  // taps stop landing on the thing under them.
  function syncFrameHeight() {
    const vv = window.visualViewport;
    if (!vv) return;

    const keyboardOpen =
      isMobile() && window.innerHeight - vv.height > KEYBOARD_MIN_INSET;

    if (keyboardOpen) {
      frame.style.height = Math.round(vv.height) + "px";
      heightOverridden = true;
    } else if (heightOverridden) {
      // Always clear unconditionally — a leftover inline height outlives the
      // keyboard and leaves the frame stuck short.
      frame.style.height = "";
      heightOverridden = false;
    }

    // Fallback restore: catches the keyboard closing even if the child app
    // never posts talk2me:input-blur (tab backgrounded, app reloaded, etc).
    if (keyboardOpen && !wasKeyboardOpen) {
      rememberScrollPosition();
    } else if (!keyboardOpen && wasKeyboardOpen) {
      restoreScrollPosition();
    }
    wasKeyboardOpen = keyboardOpen;
  }

  function onViewportChange() {
    syncFrameHeight();
    sendViewport();
  }

  window.addEventListener("message", function (e) {
    if (e.origin !== CHAT_ORIGIN) return;
    const data = e.data;
    if (!data || typeof data !== "object") return;

    switch (data.type) {
      case "talk2me:ready":
        // The app loads lazily, so it announces itself rather than us
        // guessing when it's ready to be told anything.
        sendViewport();
        break;
      case "talk2me:input-focus":
        // Capture where the page was *before* scrolling it to reveal the
        // frame, so blur can put it back exactly where it was.
        rememberScrollPosition();
        // The one thing this page can't observe for itself. Reveal the frame
        // with a native scroll, which keeps the browser's own idea of where
        // things are intact.
        frame.scrollIntoView({ block: "nearest", behavior: "smooth" });
        onViewportChange();
        break;
      case "talk2me:input-blur":
        restoreScrollPosition();
        onViewportChange();
        break;
    }
  });

  if (window.visualViewport) {
    window.visualViewport.addEventListener("resize", onViewportChange);
    window.visualViewport.addEventListener("scroll", onViewportChange);
  }
  window.addEventListener("orientationchange", onViewportChange);
  iframe.addEventListener("load", sendViewport);
})();
