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
  if (!frame || !iframe || !fsBtn) return;

  const req = frame.requestFullscreen || frame.webkitRequestFullscreen;
  const exit = document.exitFullscreen || document.webkitExitFullscreen;

  function exitFakeFullscreen() {
    frame.classList.remove("chat-fake-fullscreen");
    document.body.classList.remove("chat-fullscreen-open");
  }

  // Esc leaves fullscreen — real fullscreen already does this natively; this
  // additionally covers the iOS CSS fake-fullscreen fallback.
  window.addEventListener("keydown", function (e) {
    if (e.code !== "Escape") return;
    if (document.fullscreenElement && exit) exit.call(document);
    else if (frame.classList.contains("chat-fake-fullscreen")) exitFakeFullscreen();
  });

  fsBtn.addEventListener("click", function () {
    if (!req) {
      // No real Fullscreen API (iOS Safari) — toggle the CSS fallback.
      if (frame.classList.contains("chat-fake-fullscreen")) {
        exitFakeFullscreen();
      } else {
        frame.classList.add("chat-fake-fullscreen");
        document.body.classList.add("chat-fullscreen-open");
      }
      return;
    }
    if (!document.fullscreenElement) {
      req.call(frame);
    } else if (exit) {
      exit.call(document);
    }
  });

  // --- Viewport handshake with the embedded chat app ---------------------
  const CHAT_ORIGIN = "https://website4u.vn";
  // Below this, a viewport shrink is a toolbar collapsing rather than a
  // keyboard opening, and the frame should be left alone.
  const KEYBOARD_MIN_INSET = 100;

  let heightOverridden = false;

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

  // Report the slice of the frame that's genuinely on screen, so the chat app
  // can keep its input above the keyboard instead of below it.
  function sendViewport() {
    const vv = window.visualViewport;
    if (!vv) return;

    const rect = frame.getBoundingClientRect();
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
        // The one thing this page can't observe for itself. Reveal the frame
        // with a native scroll, which keeps the browser's own idea of where
        // things are intact.
        frame.scrollIntoView({ block: "nearest", behavior: "smooth" });
        onViewportChange();
        break;
      case "talk2me:input-blur":
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
