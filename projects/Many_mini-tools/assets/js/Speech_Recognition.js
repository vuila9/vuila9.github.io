let mediaRecorder;
let audioChunks = [];
let MEDIA_STREAM = null;

async function initMicrophone() {
    try {
        MEDIA_STREAM = await navigator.mediaDevices.getUserMedia({ audio: true });
        document.getElementById('status').textContent = 'Status: Microphone access granted. Ready to record.';
    } catch (err) {
        document.getElementById('status').textContent = 'Status: Error accessing microphone: ' + err;
        console.error('Error accessing the microphone:', err);
    }
}

async function startRecording() {
    if (!MEDIA_STREAM) {
        //await initMicrophone(); // Ensure the microphone is initialized
        document.getElementById('status').textContent = 'Refresh the page and grant permission to use microphone.';
        return;
    }

    if (MEDIA_STREAM) {
        mediaRecorder = new MediaRecorder(MEDIA_STREAM);
        mediaRecorder.start();
        document.getElementById('status').textContent = 'Status: Recording...';

        mediaRecorder.ondataavailable = function(event) {
            audioChunks.push(event.data);
        };

        mediaRecorder.onstop = function() {
            const audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
            const audioUrl = URL.createObjectURL(audioBlob);
            const audio = new Audio(audioUrl);
            audio.play(); // Play the recorded audio after stopping
            audioChunks = []; // Clear for the next recording
        };
    }
}

function stopRecording() {
    if (!MEDIA_STREAM) return;
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
        mediaRecorder.stop();
        document.getElementById('status').textContent = 'Status: Stopped recording.';
    }
    console.log(audioChunks);
}