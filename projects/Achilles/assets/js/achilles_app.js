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

	// Ruffle listens for keydown/keyup on `window`, but only acts on them
	// while it believes it has focus — a flag it maintains from focusin /
	// focusout listeners it attaches to the player element during its own
	// async init. That creates a trap:
	//
	//   1. We create the player and call .focus() immediately. That sets
	//      document.activeElement, but Ruffle hasn't attached its listeners
	//      yet, so it never hears the focusin and its flag stays false.
	//   2. Every later .focus() call is a silent no-op, because the element
	//      is ALREADY the active element — no focus change, no focusin event.
	//      Ruffle never finds out, so keys are received and then discarded.
	//
	// The result looks bizarre from the outside: activeElement is correct,
	// document.hasFocus() is true, keydown events genuinely arrive — and the
	// game ignores every one of them. Ruffle also never calls preventDefault
	// on keys it isn't handling, which is why Space fell through to the
	// browser and scrolled the page instead of pausing the game.
	//
	// Alt-tabbing, or clicking outside the game and back, fixes it precisely
	// because those force a real blur -> focus CYCLE, which does emit a
	// focusin that Ruffle is by then listening for. So do that deliberately:
	// blur first when already focused, so .focus() has an actual transition
	// to make instead of being optimised away.
	function ensurePlayerFocused() {
		if (!player) return;
		if (document.activeElement === player) player.blur();
		player.focus();
	}

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
			bindTouchControls(player);

			// Focusing now would be too early — Ruffle attaches the focusin
			// listener that matters partway through its own async init, so a
			// focus set before that point is simply never heard. Ruffle builds
			// its <canvas> during that same init, so wait for the canvas to
			// appear and take it as the signal that its listeners are up,
			// then hand it focus for real. Falls back to firing anyway after
			// ~5s so a rendering-path change upstream can't strand us.
			var waited = 0;
			var poll = setInterval(function () {
				var ready = player.shadowRoot && player.shadowRoot.querySelector("canvas");
				waited += 100;
				if (ready || waited >= 5000) {
					clearInterval(poll);
					ensurePlayerFocused();
				}
			}, 100);

			return player;
		});
	}

	// Safety net: any click in the frame re-asserts focus, so if it's ever lost
	// (clicking the page around the game, a browser UI detour) the next click on
	// the game recovers it. Capture phase, so this still runs even if something
	// inside Ruffle's shadow DOM stops propagation on its own UI handlers.
	frame.addEventListener("pointerdown", ensurePlayerFocused, true);

	bindTripleTapToggle();

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

	// ---- Triple-tap to show/hide the touch controls ----------------------
	// The controls are only wanted once you're in a level: on the loading gate,
	// the title menu, the options screen and the game-over screen they just sit
	// on top of the things you're trying to tap.
	//
	// The game itself is the obvious thing to ask which screen it's on, and it
	// can be made to say so (patching its frame scripts to emit an fscommand,
	// which Ruffle forwards to the page), but that's a lot of machinery — a
	// modified SWF — for a preference the player can just state. So: three taps
	// on the game inside 600ms toggles the controls. Taps on the control buttons
	// themselves don't count, so mashing attack during a fight can't dismiss
	// them mid-level.
	var TAPS_TO_TOGGLE = 3;
	var TAP_WINDOW_MS = 600;

	function bindTripleTapToggle() {
		var taps = [];

		frame.addEventListener("pointerdown", function (e) {
			// A tap on a d-pad/attack button is play input, not a gesture.
			if (e.target.closest && e.target.closest("[data-key]")) return;

			var now = e.timeStamp || Date.now();
			taps.push(now);
			// Keep only the taps still inside the window, so a slow series of
			// ordinary menu taps never accumulates into a toggle.
			taps = taps.filter(function (t) {
				return now - t <= TAP_WINDOW_MS;
			});
			if (taps.length < TAPS_TO_TOGGLE) return;

			taps = [];
			frame.classList.toggle("achilles-controls-on");
		});
	}

	// ---- Touch controls: synthetic keydown/keyup ------------------------
	// Physical key codes the game already checks in CheckKeys() (frame_3):
	// Left=37 Right=39 Jump(Up)=38/87 Duck(Down)=40/83 Swipe=100/84('T')
	// Bash=101/89('Y'). We only need to send one accepted code per action.
	//
	// The names on the left are the button names, which don't all match the
	// SWF's own vocabulary: what the game calls "swipe" is the Attack button,
	// "bash" is Kick, and the down/duck input is Block. The key codes are what
	// matters — those are the game's, unchanged.
	var KEYS = {
		left: { keyCode: 37, code: "ArrowLeft", key: "ArrowLeft" },
		right: { keyCode: 39, code: "ArrowRight", key: "ArrowRight" },
		jump: { keyCode: 38, code: "ArrowUp", key: "ArrowUp" },
		block: { keyCode: 40, code: "ArrowDown", key: "ArrowDown" },
		attack: { keyCode: 84, code: "KeyT", key: "t" },
		kick: { keyCode: 89, code: "KeyY", key: "y" }
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

		// Long-pressing a button is just "hold this direction", but Android
		// answers a long press with the context menu (iOS is covered by
		// -webkit-touch-callout in the CSS), which cancels the pointer and so
		// drops the held key mid-move.
		el.addEventListener("contextmenu", function (e) {
			e.preventDefault();
		});

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
