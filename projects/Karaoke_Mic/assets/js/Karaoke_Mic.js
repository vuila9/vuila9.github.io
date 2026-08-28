// ============================================================================
// Karaoke Mic — live microphone effects processor
// ----------------------------------------------------------------------------
// Everything runs client-side via the Web Audio API: mic -> EQ -> (dry / echo
// / reverb) mix -> speakers. No backing track, no recording, no server —
// this tab only ever processes the user's own voice while they sing along to
// audio playing from somewhere else (phone, another tab, a speaker, etc).
//
// Audio graph:
//   micSource -> bassFilter -> trebleFilter -> [tap] -> analyser
//                                   |
//                                   +--> dryGain -------------------+
//                                   +--> delayNode <-> feedbackGain |--> masterGain -> destination
//                                   |        |                      |
//                                   |        +--> echoWetGain ------+
//                                   +--> convolver --> reverbWetGain+
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
    };

    const canvasCtx = els.canvas.getContext("2d");

    // ---- State --------------------------------------------------------------
    let audioCtx = null;
    let micStream = null;
    let micSource = null;
    let bassFilter = null;
    let trebleFilter = null;
    let dryGain = null;
    let delayNode = null;
    let feedbackGain = null;
    let echoWetGain = null;
    let convolver = null;
    let reverbWetGain = null;
    let masterGain = null;
    let analyser = null;
    let rafId = null;
    let isLive = false;
    let isMuted = false;

    // Max feedback kept well under 1.0 so the delay loop can never run away
    // into an infinite/self-amplifying echo.
    const MAX_FEEDBACK = 0.6;

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
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();

        micSource = audioCtx.createMediaStreamSource(stream);

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

        analyser = audioCtx.createAnalyser();
        analyser.fftSize = 256;

        // EQ chain
        micSource.connect(bassFilter);
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
        masterGain.connect(analyser);
        masterGain.connect(audioCtx.destination);

        applyAllControls();
    }

    function teardownGraph() {
        if (rafId) cancelAnimationFrame(rafId);
        rafId = null;
        if (micStream) {
            micStream.getTracks().forEach((track) => track.stop());
        }
        if (audioCtx) {
            audioCtx.close().catch(() => {});
        }
        audioCtx = null;
        micStream = null;
        micSource = null;
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
                    echoCancellation: false,
                    noiseSuppression: false,
                    autoGainControl: true,
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

    els.reverb.addEventListener("input", setReverb);
    els.echo.addEventListener("input", setEcho);
    els.echoTime.addEventListener("input", setEchoTime);
    els.bass.addEventListener("input", setBass);
    els.treble.addEventListener("input", setTreble);
    els.volume.addEventListener("input", setVolume);

    els.presetButtons.forEach((btn) => {
        btn.addEventListener("click", () => applyPreset(btn.dataset.preset));
    });

    els.dismissWarning.addEventListener("click", () => {
        els.warning.classList.add("km-hidden");
    });

    // Release the mic if the user navigates away without clicking "Stop".
    window.addEventListener("beforeunload", () => {
        if (isLive) teardownGraph();
    });
})();
