function webcam() {
    let WEBCAM_ON = false;
    let STREAM;
    const VIDEO_ELEMENT = document.getElementById('webcam-video-area');
    const startButton = document.getElementById('WVT-button-start');
    const pauseButton = document.getElementById('WVT-button-pause');
    const stopButton = document.getElementById('WVT-button-stop');
    let intervalID = null;

    startButton.onclick = function() {
        // Access the webcam
        navigator.mediaDevices.getUserMedia({ video: true })
            .then((mediaStream) => {
                // Set the video source to the STREAM
                STREAM = mediaStream;
                VIDEO_ELEMENT.srcObject = STREAM;
                WEBCAM_ON = true;
                startButton.disabled = true;
                pauseButton.disabled = false;
                stopButton.disabled = false;
                document.getElementById('WVT-tool-name').innerHTML = 'Webcam Video Tester 🔴';
                intervalID = setInterval(() => {
                    if (WEBCAM_ON && getComputedStyle(document.getElementById('WVT-body')).maxHeight == '0px') {
                        stop();
                        console.log('webcam stopped');
                    }
                }, 1000);
            })
            .catch((error) => {
                console.error('Error accessing webcam:', error);
        });
    };

    pauseButton.onclick = function() {
        const pauseButton = document.getElementById('WVT-button-pause');
        if (VIDEO_ELEMENT.paused) {
            VIDEO_ELEMENT.play();
            pauseButton.textContent = 'Pause';
        } else {
            VIDEO_ELEMENT.pause();
            pauseButton.textContent = 'Resume';
        }
    };

    stopButton.addEventListener('click', (event) => {
        stop();
    });

    function stop() {
        if (STREAM) {
            // Stop all tracks in the STREAM
            clearInterval(intervalID);
            document.getElementById('WVT-tool-name').innerHTML = 'Webcam Video Tester';


            STREAM.getTracks().forEach((track) => track.stop());
            VIDEO_ELEMENT.srcObject = null; // Clear the video feed

            WEBCAM_ON = false;
            document.getElementById('WVT-button-start').disabled = false;
            pauseButton.disabled = true;
            document.getElementById('WVT-button-stop').disabled = true;

            if (pauseButton.textContent == 'Resume') {
                pauseButton.textContent = 'Pause';
            }
        }
    }
}

webcam();