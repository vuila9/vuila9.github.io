let mediaRecorder;
let audioChunks = [];
let MEDIA_STREAM = null;
let isPlaying = false;
let MicrophoneNotFound = true;

async function initMicrophone() {
    try {               
        MEDIA_STREAM = await navigator.mediaDevices.getUserMedia({ audio: true });
        document.getElementById('status').textContent = 'Status: Microphone access granted. Ready to record.';
        document.getElementById('MAT-button-permission').disabled = true;
        MicrophoneNotFound = false;
    } catch (err) {
        document.getElementById('status').textContent = 'Status: Error accessing microphone: ' + err;
        console.error('Error accessing the microphone:', err);
    }
}

async function startRecording() {
    if (isPlaying) {
        document.getElementById('status').textContent = 'Status: Unable to record new sound because currently one is playing.';
        return;
    }

    if (!MEDIA_STREAM) {
        document.getElementById('status').textContent = 'Status: Grant permission to use microphone.';
        return;
    }

    if (MEDIA_STREAM) {
        audioChunks = [];
        mediaRecorder = new MediaRecorder(MEDIA_STREAM);
        mediaRecorder.start();
        document.getElementById('status').textContent = 'Status: Recording...';

        mediaRecorder.ondataavailable = function(event) {
            audioChunks.push(event.data);
        };
    }
}

function stopRecording() {
    if (!MEDIA_STREAM) return;
    document.getElementById('MAT-button-play').disabled = false;
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
        mediaRecorder.stop();
        document.getElementById('status').textContent = 'Status: Recording stopped. Click play to play the recorded sound.';
    }
    console.log(audioChunks);
    console.log(audioChunks.size);

}

function playRecording() {
    const audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
    const audioUrl = URL.createObjectURL(audioBlob);
    const audio = new Audio(audioUrl);

    audio.addEventListener("play", () => {
        isPlaying = true;
    });

    audio.addEventListener("ended", () => {
        isPlaying = false;
    });
    audio.play(); 
}