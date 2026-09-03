// Achilles — Ruffle bootstrap + touch input layer.
// Shared, unmodified, by both Achilles.html (in-page) and webapp.html
// (standalone PWA): both declare the same #achilles-frame / #achilles-gate /
// touch-control ids, and this script null-checks the bits that only exist on
// one of the two pages (fullscreen button, "open as app" link).
//
// What this file does NOT do: implement any game logic. Ruffle (vendor/ruffle)
// runs the actual SWF; this just (1) boots the player behind a tap-to-start
// gate so iOS unlocks audio on a real gesture, and (2) turns on-screen touch
// buttons into synthetic keydown/keyup events with the exact key codes the
// game's AS2 already polls via Key.isDown() — see assets/scripts/frame_3/
// DoAction.as in this folder for the source of truth on those codes.
(function () {
	"use strict";

	var frame = document.getElementById("achilles-frame");
	if (!frame) return;

	var gate = document.getElementById("achilles-gate");
	var gateLabel = document.getElementById("achilles-gate-label");
	var player = null;

	// ---- Ruffle bootstrap ----------------------------------------------
	function loadRuffleScript() {
		return new Promise(function (resolve, reject) {
			if (window.RufflePlayer) {
				resolve();
				return;
			}
			var s = document.createElement("script");
			s.src = "vendor/ruffle/ruffle.js";
			s.onload = function () {
				resolve();
			};
			s.onerror = reject;
			document.head.appendChild(s);
		});
	}

	function boot() {
		return loadRuffleScript().then(function () {
			var ruffle = window.RufflePlayer.newest();
			player = ruffle.createPlayer();
			player.id = "achilles-player";
			player.tabIndex = 0;
			frame.appendChild(player);
			player.load({
				url: "achilles.swf",
				autoplay: "on",
				// Our own gate below is the audio-unlock gesture, so Ruffle
				// doesn't need to show its own duplicate "click to unmute" UI.
				unmuteOverlay: "hidden",
				splashScreen: false,
				contextMenu: "off",
				letterbox: "on"
			});
			player.focus();
			bindTouchControls(player);
			return player;
		});
	}

	// ---- Tap-to-start gate (also the iOS audio-unlock gesture) ---------
	if (gate) {
		gate.addEventListener(
			"click",
			function onGate() {
				gate.removeEventListener("click", onGate);
				if (gateLabel) gateLabel.textContent = "Loading…";
				boot()
					.then(function () {
						gate.classList.add("achilles-gate-hidden");
					})
					.catch(function () {
						if (gateLabel) {
							gateLabel.textContent =
								"Couldn’t load Ruffle. Check your connection and reload.";
						}
					});
			},
			{ once: true }
		);
	} else {
		boot();
	}

	// ---- Touch controls: synthetic keydown/keyup ------------------------
	// Physical key codes the game already checks in CheckKeys() (frame_3):
	// Left=37 Right=39 Jump(Up)=38/87 Duck(Down)=40/83 Swipe=100/84('T')
	// Bash=101/89('Y'). We only need to send one accepted code per action.
	var KEYS = {
		left: { keyCode: 37, code: "ArrowLeft", key: "ArrowLeft" },
		right: { keyCode: 39, code: "ArrowRight", key: "ArrowRight" },
		jump: { keyCode: 38, code: "ArrowUp", key: "ArrowUp" },
		duck: { keyCode: 40, code: "ArrowDown", key: "ArrowDown" },
		swipe: { keyCode: 84, code: "KeyT", key: "t" },
		bash: { keyCode: 89, code: "KeyY", key: "y" }
	};

	function bindTouchControls(targetEl) {
		var buttons = frame.querySelectorAll("[data-key]");
		buttons.forEach(function (el) {
			var spec = KEYS[el.getAttribute("data-key")];
			if (!spec) return;
			bindHoldButton(el, targetEl, spec);
		});
	}

	function bindHoldButton(el, targetEl, spec) {
		// Tracks active pointer ids so two fingers briefly overlapping the same
		// button (or a stray extra pointerdown) can't drop the held key early —
		// keyup only fires once every active pointer has released.
		var active = new Set();

		function fire(type) {
			var ev = new KeyboardEvent(type, {
				keyCode: spec.keyCode,
				which: spec.keyCode,
				code: spec.code,
				key: spec.key,
				bubbles: true,
				cancelable: true
			});
			// Dispatch on the player element itself: if Ruffle's listener lives
			// on the player (it sets tabIndex on it, suggesting focus-scoped
			// input), this reaches it directly; if the listener is actually on
			// document/window instead, the bubbling event reaches that too.
			targetEl.dispatchEvent(ev);
		}

		function down(e) {
			e.preventDefault();
			targetEl.focus();
			try {
				el.setPointerCapture(e.pointerId);
			} catch (err) {
				/* ignore */
			}
			if (active.size === 0) fire("keydown");
			active.add(e.pointerId);
		}

		function up(e) {
			if (!active.has(e.pointerId)) return;
			active.delete(e.pointerId);
			if (active.size === 0) fire("keyup");
		}

		el.addEventListener("pointerdown", down);
		el.addEventListener("pointerup", up);
		el.addEventListener("pointercancel", up);
		el.addEventListener("lostpointercapture", up);
	}

	// ---- Fullscreen toggle (project-page only; webapp.html has no button) --
	var fsBtn = document.getElementById("achilles-fullscreen");
	if (fsBtn) {
		var req = frame.requestFullscreen || frame.webkitRequestFullscreen;
		var exit = document.exitFullscreen || document.webkitExitFullscreen;

		function exitFakeFullscreen() {
			frame.classList.remove("achilles-fake-fullscreen");
		}

		window.addEventListener("keydown", function (e) {
			if (e.code !== "Escape") return;
			if (document.fullscreenElement && exit) exit.call(document);
			else if (frame.classList.contains("achilles-fake-fullscreen")) exitFakeFullscreen();
		});

		fsBtn.addEventListener("click", function () {
			if (!req) {
				// No element Fullscreen API (iOS Safari) — CSS-only fallback.
				if (frame.classList.contains("achilles-fake-fullscreen")) exitFakeFullscreen();
				else frame.classList.add("achilles-fake-fullscreen");
				return;
			}
			if (document.fullscreenElement) exit.call(document);
			else req.call(frame);
		});
	}
})();
