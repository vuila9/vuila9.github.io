// ============================================================================
// Karaoke Mic — live microphone effects processor
// ----------------------------------------------------------------------------
// Everything runs client-side via the Web Audio API: mic -> EQ -> (dry / echo
// / reverb) mix -> speakers. No backing track, no recording, no server —
// this tab only ever processes the user's own voice while they sing along to
// audio playing from somewhere else (phone, another tab, a speaker, etc).
//
// Audio graph:
//   micSource -> inputGain -> bassFilter -> trebleFilter
//                                                  |
//                                                  +--> dryGain -------------------+
//                                                  +--> delayNode <-> feedbackGain |--> masterGain -> duckGain -> limiter -> makeupGain -> [tap] -> analyser
//                                                  |        |                      |                                                  |
//                                                  |        +--> echoWetGain ------+                                                  +--> destination (desktop)
//                                                  +--> convolver --> reverbWetGain+                                                  +--> MediaStreamDestination -> <audio> element (mobile)
//
// inputGain is a manual mic pre-amp (getUserMedia's autoGainControl is left
// off so we control loudness ourselves instead of the browser auto-leveling
// it down). limiter is a DynamicsCompressorNode that catches the summed
// dry+echo+reverb peaks so the extra gain can't turn into harsh clipping.
// Output routing branches on device: desktop connects straight to
// audioCtx.destination (lowest latency); mobile instead renders to a
// MediaStreamAudioDestinationNode played through a hidden <audio playsinline>
// element, because iOS/Android otherwise often route audioCtx.destination
// through the phone's quiet earpiece (voice-call audio session) instead of
// the loud speaker whenever a mic stream is active.
//
// Feedback (Larsen effect) safety net — this app's biggest usability
// obstacle is open-speaker howling: the processed voice (plus its own echo/
// reverb tail) plays out the speaker and re-enters the same mic, and
// without headphones that loop can ring into a squeal. Two layers guard
// against it:
//   1. getUserMedia can request echoCancellation via USE_ECHO_CANCELLATION
//      below (currently off — see that constant for why). When on, the
//      browser's native AEC knows exactly what this tab just rendered to
//      the output device, so it can subtract that known signal back out of
//      the mic input; this is the strongest defense against the
//      self-feedback loop described above, at the cost of some added
//      latency/tone coloration. (Even at full strength it cannot do
//      anything about a *different* device's speaker, e.g. a phone playing
//      the backing track a foot away — no browser API gives this tab a
//      reference for audio it didn't produce. That case is still a "wear
//      headphones" problem, see the banner in the UI.)
//   2. duckGain is a dedicated safety-only gain node (separate from the
//      user's masterGain/volume slider) driven by detectHowl() below: if the
//      analyser sees a narrow frequency spike stay dominant for many
//      consecutive frames — the signature of a runaway resonance rather than
//      a sung note — it fast-ducks duckGain near-silent and eases it back
//      over ~1s. Currently disabled too, via USE_HOWL_DETECTOR (see that
//      constant) — with both layers off there is no automatic feedback
//      protection at all right now, only the manual headphone warning.
// ============================================================================

(function () {
    "use strict";

    // ---- DOM references ---------------------------------------------------
    const els = {
        toggleBtn: document.getElementById("km-toggle-mic"),
        toggleLabel: document.getElementById("km-toggle-label"),
        muteBtn: document.getElementById("km-mute-mic"),
        muteIcon: document.getElementById("km-mute-icon"),
        status: document.getElementById("km-status"),
        canvas: document.getElementById("km-visualizer"),
        warning: document.getElementById("km-headphone-warning"),
        dismissWarning: document.getElementById("km-dismiss-warning"),
        reverb: document.getElementById("km-reverb"),
        reverbVal: document.getElementById("km-reverb-val"),
        echo: document.getElementById("km-echo"),
        echoVal: document.getElementById("km-echo-val"),
        echoTime: document.getElementById("km-echo-time"),
        echoTimeVal: document.getElementById("km-echo-time-val"),
        bass: document.getElementById("km-bass"),
        bassVal: document.getElementById("km-bass-val"),
        treble: document.getElementById("km-treble"),
        trebleVal: document.getElementById("km-treble-val"),
        volume: document.getElementById("km-volume"),
        volumeVal: document.getElementById("km-volume-val"),
        presetButtons: document.querySelectorAll(".km-preset-btn"),
        resetBtn: document.getElementById("km-reset-controls"),
    };

    const canvasCtx = els.canvas.getContext("2d");

    // Shared across the "open as app" row below and the audio-routing
    // workaround in buildGraph() — both need to know phone/tablet vs desktop.
    function isMobileDevice() {
        const ua = navigator.userAgent || navigator.vendor || "";
        if (/Android|iPhone|iPad|iPod|Mobile|Windows Phone/i.test(ua)) return true;
        // Fallback for UAs that don't self-identify (e.g. iPadOS
        // requesting the desktop site): touch input + a narrow-ish
        // viewport reads as a phone/tablet rather than a desktop.
        return window.matchMedia("(pointer: coarse)").matches && window.innerWidth <= 820;
    }

    // ---- "Open as app" row (project page only — these elements don't
    // exist in webapp.html) --------------------------------------------
    // Only worth showing on mobile: that's the only place "Add to Home
    // Screen" installs a standalone app, and it's the only place someone
    // would want to leave the project page for the lean app shell.
    (function hideOpenAppRowOnDesktop() {
        const row = document.querySelector(".km-app-row");
        const hint = document.querySelector(".km-hint");
        if (!row) return; // not on this page (e.g. webapp.html)

        if (!isMobileDevice()) {
            row.style.display = "none";
            if (hint) hint.style.display = "none";
        }
    })();

    // ---- State --------------------------------------------------------------
    let audioCtx = null;
    let micStream = null;
    let micSource = null;
    let inputGain = null;
    let bassFilter = null;
    let trebleFilter = null;
    let dryGain = null;
    let delayNode = null;
    let feedbackGain = null;
    let echoWetGain = null;
    let convolver = null;
    let reverbWetGain = null;
    let masterGain = null;
    let duckGain = null; // safety-only node, driven by detectHowl() — see file header
    let limiter = null;
    let makeupGain = null; // fixed post-limiter loudness recovery — see MAKEUP_GAIN
    let outputDestination = null; // MediaStreamAudioDestinationNode, mobile-only
    let outputEl = null; // hidden <audio> element that plays outputDestination.stream
    let analyser = null;
    let rafId = null;
    let isLive = false;
    let isMuted = false;

    // Max feedback kept well under 1.0 so the delay loop can never run away
    // into an infinite/self-amplifying echo. Kept conservative since this
    // internal loop compounds with any acoustic speaker->mic loop.
    const MAX_FEEDBACK = 0.5;

    // Native browser echo cancellation (AEC) on the mic input — see the
    // "Feedback (Larsen effect) safety net" note in the file header for what
    // this buys you. Currently disabled: AEC's own processing measurably
    // dulled/delayed the voice, and the howl detector below still catches
    // runaway feedback on its own. Flip this back to true (no other changes
    // needed) if open-speaker howling becomes a problem again.
    const USE_ECHO_CANCELLATION = false;

    // Manual mic pre-amp. Phone/laptop mics are usually quiet by default,
    // and disabling getUserMedia's autoGainControl (see enableMic) means
    // nothing else boosts the signal — this is that boost, applied before
    // the effects chain so echo/reverb tails scale with it too. Raised from
    // 1.8: at "100%" output the processed voice was still getting buried
    // under louder external sources (phone speaker playing the song, etc).
    const INPUT_GAIN = 2.4;

    // Fixed makeup gain applied after the limiter (see buildGraph). The
    // limiter/compressor below squashes peaks down at its threshold but
    // doesn't compensate for the *average* level it removes doing so, so the
    // processed signal ends up quieter than the raw peaks would suggest.
    // This restores loudness post-compression instead of just cranking
    // INPUT_GAIN/masterGain further, which would raise feedback risk 1:1
    // with volume; boosting after the limiter keeps peaks capped while still
    // recovering perceived loudness. +4dB ≈ x1.585, chosen to stay under the
    // ~6dB of headroom the limiter's -6dB threshold leaves before 0dBFS.
    const MAKEUP_GAIN = 1.585;

    // ---- Impulse response synthesis for the reverb (no audio file needed) --
    // Generates decaying stereo white noise; a longer/steeper decay reads as
    // a bigger room. Cached per-duration so preset switches don't re-generate.
    const irCache = new Map();
    function getImpulseResponse(seconds, decay) {
        const key = seconds + "_" + decay;
        if (irCache.has(key)) return irCache.get(key);

        const rate = audioCtx.sampleRate;
        const length = Math.floor(rate * seconds);
        const buffer = audioCtx.createBuffer(2, length, rate);
        for (let ch = 0; ch < 2; ch++) {
            const data = buffer.getChannelData(ch);
            for (let i = 0; i < length; i++) {
                data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, decay);
            }
        }
        irCache.set(key, buffer);
        return buffer;
    }

    // ---- Build the audio graph (called once, on first mic enable) ----------
    function buildGraph(stream) {
        // "interactive" asks the browser for the smallest safe output
        // buffer it can give us — the single biggest lever we have over
        // perceived delay, since every node below is already a native
        // Web Audio node (no ScriptProcessor round-trips adding latency).
        audioCtx = new (window.AudioContext || window.webkitAudioContext)({
            latencyHint: "interactive",
        });

        micSource = audioCtx.createMediaStreamSource(stream);

        inputGain = audioCtx.createGain();
        inputGain.gain.value = INPUT_GAIN;

        bassFilter = audioCtx.createBiquadFilter();
        bassFilter.type = "lowshelf";
        bassFilter.frequency.value = 200;

        trebleFilter = audioCtx.createBiquadFilter();
        trebleFilter.type = "highshelf";
        trebleFilter.frequency.value = 3000;

        dryGain = audioCtx.createGain();

        delayNode = audioCtx.createDelay(2.0);
        feedbackGain = audioCtx.createGain();
        echoWetGain = audioCtx.createGain();

        convolver = audioCtx.createConvolver();
        reverbWetGain = audioCtx.createGain();

        masterGain = audioCtx.createGain();

        // Safety-only node for the howl detector — always starts fully open
        // (gain 1) and is only ever touched by triggerDuck()/recoverFromDuck()
        // below, never by the volume slider.
        duckGain = audioCtx.createGain();
        duckGain.gain.value = 1;

        // Catches the summed dry+echo+reverb peaks so the pre-amp/output
        // gain above can be pushed loud without turning into harsh digital
        // clipping — standard voice-bus limiter settings.
        limiter = audioCtx.createDynamicsCompressor();
        limiter.threshold.value = -6;
        limiter.knee.value = 12;
        limiter.ratio.value = 8;
        limiter.attack.value = 0.003;
        limiter.release.value = 0.15;

        // Recovers the loudness the limiter's compression removes — see the
        // MAKEUP_GAIN comment above.
        makeupGain = audioCtx.createGain();
        makeupGain.gain.value = MAKEUP_GAIN;

        analyser = audioCtx.createAnalyser();
        analyser.fftSize = 256;

        // Pre-amp -> EQ chain
        micSource.connect(inputGain);
        inputGain.connect(bassFilter);
        bassFilter.connect(trebleFilter);

        // Dry path
        trebleFilter.connect(dryGain);
        dryGain.connect(masterGain);

        // Echo path (delay with feedback loop)
        trebleFilter.connect(delayNode);
        delayNode.connect(feedbackGain);
        feedbackGain.connect(delayNode); // feedback loop
        delayNode.connect(echoWetGain);
        echoWetGain.connect(masterGain);

        // Reverb path
        trebleFilter.connect(convolver);
        convolver.connect(reverbWetGain);
        reverbWetGain.connect(masterGain);

        // Output + visualizer tap
        masterGain.connect(duckGain);
        duckGain.connect(limiter);
        limiter.connect(makeupGain);
        makeupGain.connect(analyser);

        if (isMobileDevice()) {
            // iOS/Android browsers often switch to a "voice call" audio
            // session while a mic stream is live and route
            // audioCtx.destination through the phone's quiet earpiece
            // instead of its loud speaker. A real <audio playsinline>
            // element gets normal playback routing, so we render into a
            // MediaStreamAudioDestinationNode and play that through one.
            outputDestination = audioCtx.createMediaStreamDestination();
            makeupGain.connect(outputDestination);

            outputEl = document.createElement("audio");
            outputEl.autoplay = true;
            outputEl.playsInline = true;
            outputEl.setAttribute("webkit-playsinline", "true");
            outputEl.srcObject = outputDestination.stream;
            outputEl.style.display = "none";
            document.body.appendChild(outputEl);
            // enableMic() only ever runs from a user tap, so this play()
            // is inside a user-gesture call stack and won't be blocked by
            // autoplay policies.
            outputEl.play().catch(() => {});
        } else {
            makeupGain.connect(audioCtx.destination);
        }

        applyAllControls();
    }

    function teardownGraph() {
        if (rafId) cancelAnimationFrame(rafId);
        rafId = null;
        if (micStream) {
            micStream.getTracks().forEach((track) => track.stop());
        }
        if (outputEl) {
            outputEl.pause();
            outputEl.srcObject = null;
            outputEl.remove();
        }
        outputEl = null;
        outputDestination = null;
        if (audioCtx) {
            audioCtx.close().catch(() => {});
        }
        audioCtx = null;
        micStream = null;
        micSource = null;
        duckGain = null;
        makeupGain = null;
        resetHowlState();
        clearVisualizer();
    }

    // ---- Control -> audio-graph wiring --------------------------------------
    // Each setX() below guards its own audio-node access, so this is safe to
    // call whether or not the mic graph exists yet — it always keeps the
    // slider readout labels in sync, and additionally updates the live audio
    // graph once one exists.
    function applyAllControls() {
        setDry();
        setEcho();
        setEchoTime();
        setBass();
        setTreble();
        setVolume();
        setReverb();
    }

    function setDry() {
        if (!dryGain) return;
        dryGain.gain.value = 1; // voice is always present; effects layer on top
    }

    // Each control's readout label always updates immediately (sliders are
    // usable while the mic is off); the underlying audio node is only
    // touched once the graph actually exists.
    function setEcho() {
        els.echoVal.textContent = els.echo.value + "%";
        if (!echoWetGain || !feedbackGain) return;
        const amount = Number(els.echo.value) / 100;
        echoWetGain.gain.value = amount;
        feedbackGain.gain.value = amount * MAX_FEEDBACK;
    }

    function setEchoTime() {
        const ms = Number(els.echoTime.value);
        els.echoTimeVal.textContent = ms + "ms";
        if (!delayNode) return;
        delayNode.delayTime.value = ms / 1000;
    }

    function setBass() {
        const db = Number(els.bass.value);
        els.bassVal.textContent = (db > 0 ? "+" : "") + db + "dB";
        if (!bassFilter) return;
        bassFilter.gain.value = db;
    }

    function setTreble() {
        const db = Number(els.treble.value);
        els.trebleVal.textContent = (db > 0 ? "+" : "") + db + "dB";
        if (!trebleFilter) return;
        trebleFilter.gain.value = db;
    }

    function setVolume() {
        const pct = Number(els.volume.value);
        els.volumeVal.textContent = pct + "%";
        if (!masterGain) return;
        masterGain.gain.value = pct / 100;
    }

    function setReverb() {
        els.reverbVal.textContent = els.reverb.value + "%";
        if (!convolver || !reverbWetGain) return;
        const amount = Number(els.reverb.value) / 100;
        reverbWetGain.gain.value = amount;
        // More reverb amount = bigger, longer-decaying room.
        const seconds = 1 + amount * 2.5;
        const decay = 2.2;
        convolver.buffer = getImpulseResponse(seconds, decay);
    }

    // ---- Visualizer ----------------------------------------------------------
    function clearVisualizer() {
        canvasCtx.clearRect(0, 0, els.canvas.width, els.canvas.height);
    }

    function drawVisualizer() {
        if (!analyser) return;
        const bufferLength = analyser.frequencyBinCount;
        const data = new Uint8Array(bufferLength);

        function frame() {
            rafId = requestAnimationFrame(frame);
            analyser.getByteFrequencyData(data);
            detectHowl(data); // reuses this frame's data, no extra analyser read

            const w = els.canvas.width;
            const h = els.canvas.height;
            canvasCtx.clearRect(0, 0, w, h);

            const barWidth = (w / bufferLength) * 1.8;
            let x = 0;
            for (let i = 0; i < bufferLength; i++) {
                const barHeight = (data[i] / 255) * h;
                const hue = 40 - (data[i] / 255) * 40; // yellow -> red as it gets louder
                canvasCtx.fillStyle = `hsl(${hue}, 90%, 55%)`;
                canvasCtx.fillRect(x, h - barHeight, barWidth, barHeight);
                x += barWidth + 1;
                if (x > w) break;
            }
        }
        frame();
    }

    // ---- Howl (feedback) detector ---------------------------------------
    // A sung note or spoken voice spreads energy across many bins; a runaway
    // acoustic/delay feedback loop rings at one resonant frequency and looks
    // like a single narrow bin sitting far above the rest of the spectrum,
    // frame after frame. Flag that pattern once it sustains for a while and
    // duck the safety-only duckGain node (never the user's volume slider) to
    // break the loop, then ease back in. With USE_ECHO_CANCELLATION off
    // (see enableMic), this is the main defense against the self-feedback
    // loop, not just a backstop — it still can't fix bleed from a
    // *different* device's speaker, only this tab's own output re-entering
    // its own mic.
    //
    // Currently disabled (see USE_HOWL_DETECTOR) — with both feedback layers
    // off, open-speaker use has no automatic protection at all right now;
    // rely on the headphone warning / manual volume discipline until this is
    // switched back on.
    const USE_HOWL_DETECTOR = false;
    const HOWL_PEAK_THRESHOLD = 235; // byte magnitude (0-255) the peak bin must clear
    const HOWL_DOMINANCE_RATIO = 2.2; // peak must be this many times the spectrum's average
    const HOWL_BIN_TOLERANCE = 1; // peak bin allowed to drift this many bins between frames
    const HOWL_SUSTAIN_FRAMES = 18; // ~300ms at 60fps before it counts as "ringing", not a note
    const DUCK_ATTACK_SECONDS = 0.05; // fast — the whole point is to break the loop quickly
    const DUCK_HOLD_MS = 900; // how long to stay ducked before easing back
    const DUCK_RELEASE_SECONDS = 1.2; // gentle recovery so it doesn't sound like a hard mute

    let howlStreak = 0;
    let howlStreakBin = -1;
    let isDucking = false;
    let duckRecoverTimer = null;

    function resetHowlState() {
        howlStreak = 0;
        howlStreakBin = -1;
        isDucking = false;
        if (duckRecoverTimer) {
            clearTimeout(duckRecoverTimer);
            duckRecoverTimer = null;
        }
    }

    function detectHowl(data) {
        if (!USE_HOWL_DETECTOR || !duckGain || isDucking) return;

        let peakIndex = 0;
        let peakValue = 0;
        let sum = 0;
        for (let i = 0; i < data.length; i++) {
            sum += data[i];
            if (data[i] > peakValue) {
                peakValue = data[i];
                peakIndex = i;
            }
        }
        const average = sum / data.length;
        const isSpike = peakValue >= HOWL_PEAK_THRESHOLD && peakValue >= average * HOWL_DOMINANCE_RATIO;
        const sameBinAsLastFrame = isSpike && Math.abs(peakIndex - howlStreakBin) <= HOWL_BIN_TOLERANCE;

        if (sameBinAsLastFrame) {
            howlStreak++;
        } else {
            howlStreak = isSpike ? 1 : 0;
        }
        howlStreakBin = isSpike ? peakIndex : -1;

        if (howlStreak >= HOWL_SUSTAIN_FRAMES) {
            triggerDuck();
        }
    }

    function triggerDuck() {
        if (!duckGain || !audioCtx || isDucking) return;
        isDucking = true;
        howlStreak = 0;

        const now = audioCtx.currentTime;
        duckGain.gain.cancelScheduledValues(now);
        duckGain.gain.setValueAtTime(duckGain.gain.value, now);
        duckGain.gain.linearRampToValueAtTime(0.03, now + DUCK_ATTACK_SECONDS);
        setStatus("Feedback detected — muting briefly…", "km-error");

        duckRecoverTimer = setTimeout(recoverFromDuck, DUCK_HOLD_MS);
    }

    function recoverFromDuck() {
        duckRecoverTimer = null;
        if (!duckGain || !audioCtx) {
            isDucking = false;
            return;
        }
        const now = audioCtx.currentTime;
        duckGain.gain.cancelScheduledValues(now);
        duckGain.gain.setValueAtTime(duckGain.gain.value, now);
        duckGain.gain.linearRampToValueAtTime(1, now + DUCK_RELEASE_SECONDS);
        isDucking = false;
        if (isLive) {
            setStatus(isMuted ? "Live — muted." : "Live — singing through effects.", "km-live");
        }
    }

    // ---- Status helpers --------------------------------------------------------
    function setStatus(text, mode) {
        els.status.textContent = text;
        els.status.classList.remove("km-live", "km-error");
        if (mode) els.status.classList.add(mode);
    }

    // ---- Mic enable / disable ------------------------------------------------
    async function enableMic() {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            setStatus("Microphone access isn't supported in this browser.", "km-error");
            return;
        }

        setStatus("Requesting microphone access…");
        try {
            micStream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    // See USE_ECHO_CANCELLATION above for why this is a
                    // named toggle rather than a literal.
                    echoCancellation: USE_ECHO_CANCELLATION,
                    noiseSuppression: false,
                    // Off on purpose: AGC auto-levels (usually *down*) and
                    // adds its own processing latency. inputGain in
                    // buildGraph() does the boosting instead, predictably.
                    autoGainControl: false,
                },
            });
        } catch (err) {
            if (err && err.name === "NotAllowedError") {
                setStatus("Microphone permission denied. Allow mic access and try again.", "km-error");
            } else if (err && err.name === "NotFoundError") {
                setStatus("No microphone found on this device.", "km-error");
            } else {
                setStatus("Couldn't access the microphone: " + (err && err.message ? err.message : err), "km-error");
            }
            return;
        }

        buildGraph(micStream);
        await audioCtx.resume();

        isLive = true;
        isMuted = false;
        els.toggleBtn.classList.add("km-active");
        els.toggleBtn.title = "Stop microphone";
        els.toggleLabel.textContent = "Stop Microphone";
        els.muteBtn.style.display = "flex";
        updateMuteUI();
        setStatus("Live — singing through effects.", "km-live");
        drawVisualizer();
    }

    function disableMic() {
        teardownGraph();
        isLive = false;
        isMuted = false;
        els.toggleBtn.classList.remove("km-active");
        els.toggleBtn.title = "Enable microphone";
        els.toggleLabel.textContent = "Enable Microphone";
        els.muteBtn.style.display = "none";
        setStatus("Microphone is off.");
    }

    // Mute/unmute is a *soft* toggle: it flips MediaStreamTrack.enabled,
    // which silences the mic instantly without stopping the track or
    // touching the audio graph. Unlike disableMic()/teardownGraph(), this
    // never revokes the browser's mic permission grant, so toggling it
    // repeatedly never re-prompts the user.
    function toggleMute() {
        if (!micStream) return;
        isMuted = !isMuted;
        micStream.getAudioTracks().forEach((track) => {
            track.enabled = !isMuted;
        });
        updateMuteUI();
        setStatus(isMuted ? "Live — muted." : "Live — singing through effects.", "km-live");
    }

    function updateMuteUI() {
        els.muteBtn.classList.toggle("km-muted", isMuted);
        els.muteBtn.title = isMuted ? "Unmute microphone" : "Mute microphone";
        els.muteIcon.textContent = isMuted ? "mic_off" : "mic";
    }

    // ---- Presets --------------------------------------------------------------
    const PRESETS = {
        dry: { reverb: 0, echo: 0, echoTime: 200, bass: 0, treble: 0 },
        hall: { reverb: 55, echo: 15, echoTime: 300, bass: 2, treble: 3 },
        stadium: { reverb: 40, echo: 55, echoTime: 380, bass: 1, treble: 4 },
        bathroom: { reverb: 75, echo: 30, echoTime: 120, bass: 3, treble: -2 },
    };

    function applyPreset(name) {
        const preset = PRESETS[name];
        if (!preset) return;
        els.reverb.value = preset.reverb;
        els.echo.value = preset.echo;
        els.echoTime.value = preset.echoTime;
        els.bass.value = preset.bass;
        els.treble.value = preset.treble;
        applyAllControls();
        saveControlsToSession();
    }

    // ---- Reset to defaults ---------------------------------------------
    // Matches each slider's original value="..." in the HTML markup.
    const DEFAULTS = { reverb: 35, echo: 20, echoTime: 260, bass: 2, treble: 3, volume: 100 };

    function resetControls() {
        Object.keys(DEFAULTS).forEach((id) => {
            els[id].value = DEFAULTS[id];
        });
        applyAllControls();
        saveControlsToSession();
    }

    // ---- Slider memory (sessionStorage) ---------------------------------
    // Unlike the headphone warning (localStorage, dismissed forever), slider/
    // preset choices persist across reloads and navigation within this
    // browser session, but reset to the page's defaults next time the user
    // opens a fresh tab/session — no permanent "my settings" file needed.
    const CONTROLS_KEY = "km-controls";
    const CONTROL_SETTERS = {
        reverb: setReverb,
        echo: setEcho,
        echoTime: setEchoTime,
        bass: setBass,
        treble: setTreble,
        volume: setVolume,
    };
    const CONTROL_IDS = Object.keys(CONTROL_SETTERS);

    function saveControlsToSession() {
        try {
            const state = {};
            CONTROL_IDS.forEach((id) => {
                state[id] = els[id].value;
            });
            sessionStorage.setItem(CONTROLS_KEY, JSON.stringify(state));
        } catch (err) {
            // ignore — storage unavailable (e.g. private mode)
        }
    }

    function restoreControlsFromSession() {
        let state;
        try {
            const raw = sessionStorage.getItem(CONTROLS_KEY);
            if (!raw) return;
            state = JSON.parse(raw);
        } catch (err) {
            return;
        }
        CONTROL_IDS.forEach((id) => {
            if (state[id] !== undefined) els[id].value = state[id];
        });
        applyAllControls(); // refresh the readout labels (and live audio graph, if any)
    }

    // ---- Event wiring -----------------------------------------------------
    els.toggleBtn.addEventListener("click", () => {
        if (isLive) {
            disableMic();
        } else {
            enableMic();
        }
    });

    els.muteBtn.addEventListener("click", toggleMute);

    CONTROL_IDS.forEach((id) => {
        els[id].addEventListener("input", () => {
            CONTROL_SETTERS[id]();
            saveControlsToSession();
        });
    });

    els.presetButtons.forEach((btn) => {
        btn.addEventListener("click", () => applyPreset(btn.dataset.preset));
    });

    els.resetBtn.addEventListener("click", resetControls);

    restoreControlsFromSession();

    // The headphone-feedback warning is dismissed permanently (localStorage)
    // once the user acknowledges it — it won't nag them again on future
    // reloads, tabs, or app launches (e.g. reopening the installed PWA).
    const WARNING_DISMISSED_KEY = "km-warning-dismissed";

    function warningWasDismissed() {
        try {
            return localStorage.getItem(WARNING_DISMISSED_KEY) === "1";
        } catch (err) {
            return false; // storage unavailable (e.g. private mode) — just show it
        }
    }

    if (warningWasDismissed()) {
        els.warning.classList.add("km-hidden");
    }

    els.dismissWarning.addEventListener("click", () => {
        els.warning.classList.add("km-hidden");
        try {
            localStorage.setItem(WARNING_DISMISSED_KEY, "1");
        } catch (err) {
            // ignore — worst case it just reappears next reload
        }
    });

    // Release the mic if the user navigates away without clicking "Stop".
    window.addEventListener("beforeunload", () => {
        if (isLive) teardownGraph();
    });
})();
