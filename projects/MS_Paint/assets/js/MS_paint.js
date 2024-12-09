let COLOR = 'black';
let RED = 0;
let GREEN = 0;
let BLUE = 0;
let SIZE = 5;

const mspaint_body = document.getElementById('mspaint-body');
const locations = new Set();
let isDrawing = false;
let isMouseInside = false;
let isEraserON = false;

document.getElementById('ms-paint').addEventListener('contextmenu', (event) => {
    event.preventDefault(); // Prevent the context menu from showing
});

mspaint_body.addEventListener('mousedown', (event) => {
    if (event.button !== 0) return; // Only trigger if left-click (button 0)
    isDrawing = true;
    placePixel(event); // Place a pixel immediately on mousedown
});

document.addEventListener('mousemove', (event) => {
    if (isDrawing && isMouseInside) {
        placePixel(event); // Place pixels only when mouse is inside the canvas
    }
});

document.addEventListener('mouseup', () => {
    isDrawing = false; // Stop drawing when the mouse is released
});

// Prevent drag issues if the mouse leaves the canvas
mspaint_body.addEventListener('mouseleave', () => {
    isMouseInside = false;
});

// Ensure the drawing continues if the mouse enters the canvas again
mspaint_body.addEventListener('mouseenter', () => {
    isMouseInside = true;
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
    pixel.style.width = `${SIZE}px`;
    pixel.style.height = `${SIZE}px`;

    let currentColor = COLOR;
    pixel.style.backgroundColor = currentColor;
    mspaint_body.appendChild(pixel);
    locations.add(coor);
    //console.log(location);
}

function eraserON() {
    COLOR = `rgb(242,242,242)`;
    isEraserON = !isEraserON;

    if (isEraserON) {
        document.getElementById('eraser').className = 'fa fa-eraser button primary';
        document.getElementById('eraser').title = 'Eraser is ON';
        SIZE = 20;
        document.getElementById('color-slider-red').disabled = true;
        document.getElementById('color-slider-green').disabled = true;
        document.getElementById('color-slider-blue').disabled = true;

    }
    else {
        document.getElementById('eraser').className = 'fa fa-eraser';
        document.getElementById('eraser').title = 'Eraser is OFF';
        SIZE = 5;
        document.getElementById('color-slider-red').disabled = false;
        document.getElementById('color-slider-green').disabled = false;
        document.getElementById('color-slider-blue').disabled = false;
        COLOR = `rgb(${RED},${GREEN},${BLUE})`;
    }

}

function eraseAll() {
    mspaint_body.innerHTML = '';
    locations.clear();
}

function updateColorRED(value) {
    RED = value;
    document.getElementById('color-picker').style.backgroundColor = `rgb(${RED},${GREEN},${BLUE})`;
    COLOR = `rgb(${RED},${GREEN},${BLUE})`;
}

function updateColorGREEN(value) {
    GREEN = value;
    document.getElementById('color-picker').style.backgroundColor = `rgb(${RED},${GREEN},${BLUE})`;
    COLOR = `rgb(${RED},${GREEN},${BLUE})`;
}

function updateColorBLUE(value) {
    BLUE = value;
    document.getElementById('color-picker').style.backgroundColor = `rgb(${RED},${GREEN},${BLUE})`;
    COLOR = `rgb(${RED},${GREEN},${BLUE})`;
}