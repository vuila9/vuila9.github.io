let mediaRecorder;
let audioChunks = [];
let MEDIA_STREAM = null;
let finalTranscript = '';
let recognition;
let recognitionActive = false;
let microphoneInitialized = false;

async function initMicrophone() {
    if (microphoneInitialized) {
        console.log("Microphone already initialized.");
        return; // Prevent re-initialization
    }

    try {
        MEDIA_STREAM = await navigator.mediaDevices.getUserMedia({ audio: true });
        document.getElementById('status').textContent = 'Status: Microphone access granted. Ready to record.';
        microphoneInitialized = true;
    } catch (err) {
        document.getElementById('status').textContent = 'Status: Error accessing microphone: ' + err;
        console.error('Error accessing the microphone:', err);
    }
}

function initSpeechRecognition() {
    if (!microphoneInitialized) {
        console.log("Microphone must be initialized first.");
        return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
        console.error("Web Speech API is not supported in this browser.");
        document.getElementById('status').textContent = 'Speech recognition is not supported in this browser.';
        return;
    }

    recognition = new SpeechRecognition();
    recognition.lang = 'en-US'; // Set language
    recognition.interimResults = true; // Enable partial results
    recognition.continuous = true; // Continue listening after pauses

    recognition.onresult = (event) => {
        let interimTranscript = "";
        for (let i = event.resultIndex; i < event.results.length; i++) {
            if (event.results[i].isFinal) {
                finalTranscript += event.results[i][0].transcript + " ";
            } else {
                interimTranscript += event.results[i][0].transcript;
            }
        }
        //document.getElementById('interim').textContent = interimTranscript;
        document.getElementById('final').textContent += interimTranscript;
    };

    recognition.onerror = (event) => {
        console.error("Speech recognition error:", event.error);
    };
}

function startRecording() {
    if (!MEDIA_STREAM) {
        document.getElementById('status').textContent = 'Microphone not initialized. Please try again.';
        return;
    }

    // Start MediaRecorder
    mediaRecorder = new MediaRecorder(MEDIA_STREAM);
    mediaRecorder.start();
    document.getElementById('status').textContent = 'Status: Recording...';

    audioChunks = [];
    finalTranscript = "";

    mediaRecorder.ondataavailable = (event) => {
        audioChunks.push(event.data);
    };

    if (recognition && !recognitionActive) {
        recognitionActive = true;
        recognition.start(); // Start or resume SpeechRecognition
    }
}

function stopRecording() {
    if (!MEDIA_STREAM) return;
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
        mediaRecorder.stop();
        document.getElementById('status').textContent = 'Status: Stopped recording.';
        document.getElementById('final').textContent = finalTranscript;
    }
    if (recognition) {
        recognitionActive = false; // Pause SpeechRecognition
    }
    console.log(audioChunks);
    // mediaRecorder.onstop = () => {
    //     const audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
    //     const audioUrl = URL.createObjectURL(audioBlob);
    //     const audio = new Audio(audioUrl);
    //     audio.play(); // Play the recorded audio after stopping

    //     document.getElementById('status').textContent = 'Audio playback complete.';
    // };
}