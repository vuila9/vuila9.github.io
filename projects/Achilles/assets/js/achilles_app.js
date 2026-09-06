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

	// Set by bindTouchControls; drops every held key. Anything that can strand
	// a press — hiding the controls mid-hold, the app going to the background —
	// calls this rather than waiting for a pointerup that may never arrive.
	var releaseAllKeys = function () {};

	// Set by bindTripleTapToggle (when the hint exists) to actually start its
	// 15s countdown. Called once the gate is dismissed, below — starting it
	// at bindTripleTapToggle()'s own call time (page load) would burn most of
	// the 15s while the player is still staring at "Tap to Start", so the
	// hint would appear post-boot with barely any of it left.
	var armHintTimer = function () {};

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
	frame.addEventListener(
		"pointerdown",
		function (e) {
			// Not for the on-screen buttons. Their handler focuses the player
			// directly, and ensurePlayerFocused deliberately blurs first — a
			// focus cycle on every single button press is churn, and Ruffle
			// ignores key events whenever it believes it isn't focused, so a
			// keyup landing in that window would be dropped and stick the key.
			if (e.target.closest && e.target.closest("[data-key]")) return;
			ensurePlayerFocused();
		},
		true
	);

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
						// The hint (if this page has one) only becomes visible now,
						// so its 15s countdown starts here too.
						armHintTimer();
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
	var HINT_TIMEOUT_MS = 10000;

	function bindTripleTapToggle() {
		var taps = [];
		// Only webapp.html carries this element (see its markup and the CSS
		// block above #achilles-tap-hint) — the embedded project-page frame
		// has none, and keeps the old whole-frame gesture below.
		var hint = document.getElementById("achilles-tap-hint");

		function dismissHint() {
			if (hint) hint.classList.add("achilles-tap-hint-hidden");
		}

		// A one-time nudge — no reason for it to sit over the title screen
		// forever once the player's had a chance to see it.
		if (hint) {
			armHintTimer = function () {
				setTimeout(dismissHint, HINT_TIMEOUT_MS);
			};
		}

		// Webapp only: a tap must land inside the hinted corner to count
		// toward the toggle, so mashing the fullscreen game surface can
		// never spawn the controls by accident. Hit-tested against the hint
		// element's own rect rather than a separate constant, so the tap
		// zone always matches what the player was shown — including while
		// it's faded out via opacity, since that never changes layout.
		function inZone(e) {
			if (!hint) return true;
			var r = hint.getBoundingClientRect();
			return (
				e.clientX >= r.left &&
				e.clientX <= r.right &&
				e.clientY >= r.top &&
				e.clientY <= r.bottom
			);
		}

		frame.addEventListener(
			"pointerdown",
			function (e) {
				// A tap on a d-pad/attack button is play input, not a gesture.
				if (e.target.closest && e.target.closest("[data-key]")) return;
				if (!inZone(e)) return;

				// Webapp only (hint exists): this corner is reserved for the
				// toggle gesture, never gameplay. The hint is pointer-events:
				// none purely so it doesn't visually block the tap, but that
				// also means the tap falls straight through to Ruffle's canvas
				// underneath unless we stop it here, in the capture phase,
				// before it reaches Ruffle's own listeners. Left alone, a
				// rapid triple-tap forwarded into the SWF can trip whatever
				// puts the game's stage into text-entry mode, which makes
				// Ruffle focus its hidden virtual-keyboard <input> and pop the
				// iOS on-screen keyboard.
				if (hint) e.stopPropagation();

				var now = e.timeStamp || Date.now();
				taps.push(now);
				// Keep only the taps still inside the window, so a slow series of
				// ordinary menu taps never accumulates into a toggle.
				taps = taps.filter(function (t) {
					return now - t <= TAP_WINDOW_MS;
				});
				if (taps.length < TAPS_TO_TOGGLE) return;

				taps = [];
				dismissHint();
				var showing = frame.classList.toggle("achilles-controls-on");
				// Hiding mid-press would stop the buttons ever seeing the pointerup.
				if (!showing) releaseAllKeys();
			},
			true
		);
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
			// Ruffle discards key events while it believes it isn't focused, and
			// a discarded keyup is exactly how a key gets stuck down. Focusing
			// before every event is cheap and is a no-op when already focused.
			if (document.activeElement !== targetEl) targetEl.focus();
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

		function releaseEverything() {
			var stranded = false;
			Object.keys(pointerAction).forEach(function (id) {
				delete pointerAction[id];
				stranded = true;
			});
			if (stranded) refresh();
		}
		releaseAllKeys = releaseEverything;

		controls.addEventListener("pointerup", release);
		controls.addEventListener("pointercancel", release);

		// ---- Backstops against a stranded key -------------------------------
		// A held key is only released when its pointerup arrives, so any lost
		// pointerup leaves the game with the key still down — walking or
		// blocking on its own until something else disturbs it. Rapid taps are
		// where events actually go missing, so don't depend on a single path.

		// 1. The same events at the window, in case the button that had implicit
		//    capture stops delivering them (hidden, detached, capture lost).
		window.addEventListener("pointerup", release, true);
		window.addEventListener("pointercancel", release, true);
		window.addEventListener("lostpointercapture", release, true);

		// 2. The authoritative one: TouchEvent.touches is the live list of
		//    fingers on the glass. No fingers means nothing can be held, no
		//    matter which pointer events went missing.
		function reconcileTouches(e) {
			if (e.touches && e.touches.length === 0) releaseEverything();
		}
		window.addEventListener("touchend", reconcileTouches, true);
		window.addEventListener("touchcancel", reconcileTouches, true);

		// 3. Leaving the page mid-press: a pointerup never comes, and the game
		//    would resume with the key still down.
		window.addEventListener("blur", releaseEverything);
		window.addEventListener("pagehide", releaseEverything);
		document.addEventListener("visibilitychange", function () {
			if (document.hidden) releaseEverything();
		});

		// Lets a stuck state be diagnosed from the console: if this reports a
		// key while nothing is being touched, the strand is here; if it reports
		// nothing while the game still walks or blocks, the key state stuck on
		// Ruffle's side instead.
		window.__achillesHeld = function () {
			return { keysDown: Object.keys(isDown), pointers: pointerAction };
		};

		// Long-pressing a button is just "hold this direction", but the OS reads
		// it as a gesture on content: Android raises the context menu, iOS the
		// magnifier loupe and selection callout. Either one cancels the pointer
		// and strands the held key mid-move.
		controls.addEventListener("contextmenu", function (e) {
			e.preventDefault();
		});

		// The CSS (-webkit-touch-callout / user-select) is the main defence on
		// iOS, but cancelling touchstart on the buttons stops the long-press
		// gesture from ever starting. Scoped to the buttons and non-passive, so
		// preventDefault actually applies: cancelling this anywhere else in the
		// frame would swallow the taps Ruffle needs for the game's own menus.
		// Pointer events are unaffected by this — only the native gesture is.
		controls.addEventListener(
			"touchstart",
			function (e) {
				if (e.target.closest && e.target.closest("[data-key]")) e.preventDefault();
			},
			{ passive: false }
		);
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
