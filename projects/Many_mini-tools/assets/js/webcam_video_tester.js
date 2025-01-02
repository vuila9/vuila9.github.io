let WEBCAM_ON = false;
let STREAM;
const VIDEO_ELEMENT = document.getElementById('webcam-video-area');

function initWebcam() {
    // Access the webcam
    navigator.mediaDevices.getUserMedia({ video: true })
        .then((mediaStream) => {
            // Set the video source to the STREAM
            STREAM = mediaStream;
            VIDEO_ELEMENT.srcObject = STREAM;
            WEBCAM_ON = true;
            document.getElementById('WVT-button-start').disabled = true;
            document.getElementById('WVT-button-pause').disabled = false;
            document.getElementById('WVT-button-stop').disabled = false;

        })
        .catch((error) => {
            console.error('Error accessing webcam:', error);
    });
}

function stopWebcam() {
    const pauseButton = document.getElementById('WVT-button-pause');
    if (STREAM) {
        // Stop all tracks in the STREAM
        STREAM.getTracks().forEach((track) => track.stop());
        VIDEO_ELEMENT.srcObject = null; // Clear the video feed

        WEBCAM_ON = false;
        document.getElementById('WVT-button-start').disabled = false;
        pauseButton.disabled = true;
        document.getElementById('WVT-button-stop').disabled = true;

        if (pauseButton.textContent == 'Resume') {
            pauseButton.textContent = 'Pause';
            console.log('helloooo');
        }
    }
}

function pauseWebcam() {
    const pauseButton = document.getElementById('WVT-button-pause');
    if (VIDEO_ELEMENT.paused) {
        VIDEO_ELEMENT.play();
        pauseButton.textContent = 'Pause';
    } else {
        VIDEO_ELEMENT.pause();
        pauseButton.textContent = 'Resume';
    }
}