// Get the image element
const imageButton = document.getElementById('imageButton');

// Set the images to be used
const originalImage = './assets/img/green.png';
const clickedImage = './assets/img/red.png';

// Add event listeners for mouse events
imageButton.addEventListener('mousedown', () => {
    imageButton.src = clickedImage;
    //requestPermission();
    startRecording();

});

imageButton.addEventListener('mouseup', () => {
    imageButton.src = originalImage;
    stopRecording();
});

imageButton.addEventListener('mouseleave', () => {
    imageButton.src = originalImage;
});

window.onload = function() {
    initMicrophone();
}