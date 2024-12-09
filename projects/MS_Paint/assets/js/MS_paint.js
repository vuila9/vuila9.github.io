const COLOR = 'red';
const mspaint_body = document.getElementById('mspaint-body');
const locations = new Set();
let isDrawing = false;

document.getElementById('ms-paint').addEventListener('contextmenu', (event) => {
    event.preventDefault(); // Prevent the context menu from showing
});

mspaint_body.addEventListener('mousedown', (event) => {
    if (event.button !== 0) return; // Only trigger if left-click (button 0)
    isDrawing = true;
    placePixel(event); // Place a pixel immediately on mousedown
});

mspaint_body.addEventListener('mousemove', (event) => {
    if (isDrawing) {
        placePixel(event); // Place pixels as the mouse moves
    }
});

mspaint_body.addEventListener('mouseup', () => {
    isDrawing = false; // Stop drawing when the mouse is released
});

// Prevent drag issues if the mouse leaves the canvas
mspaint_body.addEventListener('mouseleave', () => {
    isDrawing = false;
});

function placePixel(event) {
    // Get the bounding rectangle of the white space
    const rect = mspaint_body.getBoundingClientRect();

    const x = Math.max(-1, Math.min(event.clientX - rect.left - 2.5, 1033));
    const y = Math.min(event.clientY - rect.top, 495);
    const coor = `(${Math.floor(x)},${Math.floor(y)})`;

    // Do nothing if (x,y) already exits
    if (locations.has(coor)) return;

    // Create a new pixel
    const pixel = document.createElement('div');
    pixel.className = 'pixel';
    pixel.style.left = `${x}px`;
    pixel.style.top = `${y}px`;

    let currentColor = COLOR;
    pixel.style.backgroundColor = currentColor;
    mspaint_body.appendChild(pixel);
    locations.add(coor);
    //console.log(location);
}

function eraseAll() {
    mspaint_body.innerHTML = '';
}