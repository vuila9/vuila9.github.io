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

	// ---- Landscape on launch (standalone app only) -----------------------
	// Three layers, because no single one covers every platform:
	//   1. manifest.webmanifest's "orientation": "landscape" — installed
	//      Android PWAs honour this and never show portrait at all.
	//   2. this, the Screen Orientation API — Android/Chrome, and only from a
	//      user gesture while installed or fullscreen.
	//   3. a CSS rotation in webapp.html, for when both of the above do nothing.
	// iOS Safari implements neither 1 nor 2, so on iPhone it is always 3.
	//
	// Guarded on #achilles-page, which only exists in webapp.html: the project
	// page is a normal scrolling document and must never grab the orientation.
	function lockLandscape() {
		if (!document.getElementById("achilles-page")) return;
		var orientation = window.screen && window.screen.orientation;
		if (!orientation || !orientation.lock) return;
		try {
			var result = orientation.lock("landscape");
			// Rejects when not installed/fullscreen; the CSS fallback covers it.
			if (result && result.catch) result.catch(function () {});
		} catch (err) {
			/* not supported here — fall through to the CSS rotation */
		}
	}

	// ---- Tap-to-start gate (also the iOS audio-unlock gesture) ---------
	if (gate) {
		gate.addEventListener(
			"click",
			function onGate() {
				gate.removeEventListener("click", onGate);
				if (gateLabel) gateLabel.textContent = "Loading…";
				// Must ride this gesture — orientation.lock() is gesture-gated.
				lockLandscape();
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

	// One tracker for the whole control layer rather than a listener per
	// button, so a finger can slide from one button to another mid-hold and
	// have the input follow it: release left, press right, without lifting.
	//
	// Per-button listeners can't do that. A touch pointer gets IMPLICIT pointer
	// capture on pointerdown — every later event for that finger is delivered
	// to the button it started on, so the button you slide onto never hears a
	// thing and the one you left never hears you go. (The old code made that
	// worse by calling setPointerCapture explicitly.) So the button under a
	// finger is resolved by coordinates via elementFromPoint on every move,
	// not from event.target, which is pinned to the origin button.
	//
	// A key is held while ANY finger is on its button and released only when
	// the last one leaves, so two thumbs sharing a button, or a finger sliding
	// onto a button someone else is already holding, behave sensibly.
	function bindTouchControls(targetEl) {
		var controls = frame.querySelector(".achilles-controls");
		if (!controls) return;

		var pointerAction = {};   // pointerId -> action name, or null when off
		var isDown = {};          // action name -> true while its key is held

		function actionAt(x, y) {
			var el = document.elementFromPoint(x, y);
			var btn = el && el.closest ? el.closest("[data-key]") : null;
			if (!btn || !frame.contains(btn)) return null;
			var name = btn.getAttribute("data-key");
			return KEYS[name] ? name : null;
		}

		function fire(type, name) {
			var spec = KEYS[name];
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

		// Diff what should be held against what is held, and emit only the
		// changes — so a slide between two buttons is exactly one keyup and one
		// keydown, and re-entering a button you're already holding is nothing.
		function refresh() {
			var wanted = {};
			Object.keys(pointerAction).forEach(function (id) {
				if (pointerAction[id]) wanted[pointerAction[id]] = true;
			});
			Object.keys(KEYS).forEach(function (name) {
				var want = !!wanted[name];
				if (want === !!isDown[name]) return;
				if (want) isDown[name] = true;
				else delete isDown[name];
				fire(want ? "keydown" : "keyup", name);
				// :active only ever tracks the button the touch started on, so
				// the held look has to be driven by hand to survive a slide.
				var btn = frame.querySelector('[data-key="' + name + '"]');
				if (btn) btn.classList.toggle("achilles-btn-active", want);
			});
		}

		controls.addEventListener("pointerdown", function (e) {
			var name = actionAt(e.clientX, e.clientY);
			if (!name) return;
			e.preventDefault();
			targetEl.focus();
			pointerAction[e.pointerId] = name;
			refresh();
		});

		controls.addEventListener("pointermove", function (e) {
			if (!(e.pointerId in pointerAction)) return;
			e.preventDefault();
			var name = actionAt(e.clientX, e.clientY);
			if (name === pointerAction[e.pointerId]) return;
			// null is kept, not deleted: the finger is still down, just resting
			// somewhere that isn't a button. Sliding back onto one resumes.
			pointerAction[e.pointerId] = name;
			refresh();
		});

		function release(e) {
			if (!(e.pointerId in pointerAction)) return;
			delete pointerAction[e.pointerId];
			refresh();
		}

		controls.addEventListener("pointerup", release);
		controls.addEventListener("pointercancel", release);

		// Long-pressing a button is just "hold this direction", but Android
		// answers a long press with the context menu (iOS is covered by
		// -webkit-touch-callout in the CSS), which cancels the pointer and so
		// drops the held key mid-move.
		controls.addEventListener("contextmenu", function (e) {
			e.preventDefault();
		});
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
