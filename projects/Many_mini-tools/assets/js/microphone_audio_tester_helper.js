const imageButton = document.getElementById('imageButton');
const originalImage = './assets/img/green.png';
const clickedImage = './assets/img/red.png';

// Add event listeners for mouse events
imageButton.addEventListener('mousedown', () => {
    imageButton.src = clickedImage;
    startRecording();
});

imageButton.addEventListener('mouseup', () => {
    imageButton.src = originalImage;
    stopRecording();
});

imageButton.addEventListener('mouseleave', () => {
    imageButton.src = originalImage;
});