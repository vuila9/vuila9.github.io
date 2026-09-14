// Talk2Me — fullscreen toggle for the embedded chat iframe.
// The iframe itself just fills #chat-frame at 100% (see effects.css), so unlike
// a canvas game there's no internal resize step needed — only the frame's own
// box needs to grow, same fullscreen/fake-fullscreen pattern as Flappy Bird.
(function () {
  const frame = document.getElementById("chat-frame");
  const fsBtn = document.getElementById("chat-fullscreen");
  if (!frame || !fsBtn) return;

  const req = frame.requestFullscreen || frame.webkitRequestFullscreen;
  const exit = document.exitFullscreen || document.webkitExitFullscreen;

  function exitFakeFullscreen() {
    frame.classList.remove("chat-fake-fullscreen");
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
      }
      return;
    }
    if (!document.fullscreenElement) {
      req.call(frame);
    } else if (exit) {
      exit.call(document);
    }
  });

  // --- Keep the frame pinned when the on-screen keyboard opens -----------
  // On mobile, tapping the message box inside the (cross-origin) iframe
  // makes the browser scroll the *outer* portfolio page to try to reveal
  // the focused input. But #chat-frame's height is fixed (min(700px,80vh)),
  // so once the keyboard eats a chunk of the viewport it no longer fits,
  // and the page ends up half-scrolled with the chat box cut off/squished.
  // The visualViewport API tells us exactly how much visible space is left,
  // so instead we resize/pin the frame to that space ourselves — matching
  // how a real standalone page (not fighting an ancestor's scroll) behaves.
  if (window.visualViewport) {
    var vv = window.visualViewport;
    var pinned = false;
    var naturalWidth = "";

    function isMobile() {
      return window.matchMedia("(max-width: 736px)").matches;
    }

    function isFullscreen() {
      return (
        document.fullscreenElement === frame ||
        frame.classList.contains("chat-fake-fullscreen")
      );
    }

    function resetFrame() {
      if (!pinned) return;
      frame.style.position = "";
      frame.style.left = "";
      frame.style.top = "";
      frame.style.transform = "";
      frame.style.width = "";
      frame.style.height = "";
      frame.style.zIndex = "";
      document.body.style.overflow = "";
      pinned = false;
    }

    function onViewportChange() {
      var keyboardOpen = window.innerHeight - vv.height > 100;

      if (!isMobile() || !keyboardOpen) {
        resetFrame();
        return;
      }

      if (isFullscreen()) {
        // Already spans the page — just clip it to the space the keyboard
        // hasn't covered, since 100vh/inset:0 alone won't shrink for it.
        frame.style.top = vv.offsetTop + "px";
        frame.style.height = vv.height + "px";
        return;
      }

      if (!pinned) {
        naturalWidth = frame.getBoundingClientRect().width + "px";
        pinned = true;
      }
      frame.style.position = "fixed";
      frame.style.left = "50%";
      frame.style.top = vv.offsetTop + "px";
      frame.style.transform = "translateX(-50%)";
      frame.style.width = naturalWidth;
      frame.style.height = vv.height + "px";
      frame.style.zIndex = "1000";
      // Stop the ancestor page from also scrolling underneath the pinned box.
      document.body.style.overflow = "hidden";
    }

    vv.addEventListener("resize", onViewportChange);
    vv.addEventListener("scroll", onViewportChange);
  }
})();
