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
})();
