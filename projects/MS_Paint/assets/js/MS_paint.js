let COLOR = 'rgb(0,0,0)';
let RED = 0;
let GREEN = 0;
let BLUE = 0;
let SIZE = 5;
const BACKGROUND_COLOR = 'rgb(242,242,242)';

const MAX_CANVAS_WIDTH = 1037.5;
const MAX_CANVAS_HEIGHT = 500;

const MAX_ZOOM_SIZE = 5;
//let CURRENT_ZOOM_SIZE = 1;

const PIXELS_LOCATIONS = new Set();
const PIXEL_UNDO_HISTORY = [];
const PIXEL_REDO_HISTORY = [];

const MSPAINT_BODY = document.getElementById('mspaint-body');
const UNDO_REDO_BUTTON = document.getElementById('undo-redo-button')

let isDrawing = false;
let isMouseInside = false;
let isEraserON = false;
let isRightClick = false;

document.getElementById('ms-paint').addEventListener('contextmenu', (event) => {
    event.preventDefault(); // Prevent the default right-click action while inside the canvas
});

MSPAINT_BODY.addEventListener('mousedown', (event) => {
    if (event.button == 2 && !isEraserON && isMouseInside) toggleEraser();
    PIXEL_UNDO_HISTORY.push([]);
    isDrawing = true;
    placePixel(event); // Place a pixel immediately on mousedown
});

MSPAINT_BODY.addEventListener('mousemove', (event) => {
    if (isDrawing && isMouseInside) {
        placePixel(event); // Place pixels only when mouse is inside the canvas
    }
});

document.addEventListener('mouseup', (event) => {
    if (event.button == 2 && isMouseInside && isDrawing) toggleEraser();
    isDrawing = false; // Stop drawing when the mouse is released
});

// Prevent drag issues if the mouse leaves the canvas
MSPAINT_BODY.addEventListener('mouseleave', (event) => {
    isMouseInside = false;
});

// Ensure the drawing continues if the mouse enters the canvas again
MSPAINT_BODY.addEventListener('mouseenter', (event) => {
    isMouseInside = true;
});

UNDO_REDO_BUTTON.addEventListener('mousedown', (event) => {
    if (event.button == 0) {
        UNDO_REDO_BUTTON.className = 'fas fa-undo button primary';
    }
    else if (event.button == 2) {
        UNDO_REDO_BUTTON.className = 'fas fa-redo button primary';
    }
});

UNDO_REDO_BUTTON.addEventListener('mouseup', (event) => {
    if (event.button == 0) {
        undo();
        UNDO_REDO_BUTTON.className = 'fas fa-undo';
    }
    else if (event.button == 2) {
        redo();
        UNDO_REDO_BUTTON.className = 'fas fa-undo';
    }
});

UNDO_REDO_BUTTON.addEventListener('mouseleave', (event) => {
    UNDO_REDO_BUTTON.className = 'fas fa-undo';
});

UNDO_REDO_BUTTON.addEventListener('contextmenu', (event) => {
    event.preventDefault();
});

function placePixel(event) {
    if (!isDrawing) return;
    if (isEraserON && PIXELS_LOCATIONS.size == 0) return;

    // Get the bounding rectangle of the white space
    const rect = MSPAINT_BODY.getBoundingClientRect();

    const x = Math.max(-1, Math.min(event.clientX - rect.left - SIZE/2, MAX_CANVAS_WIDTH - SIZE));
    const y = Math.max(-1, Math.min(event.clientY - rect.top - SIZE/2, MAX_CANVAS_HEIGHT - SIZE));
    const coor = `(${Math.floor(x)},${Math.floor(y)})`;

    // Do nothing if (x,y) already exits, eraser bypass this.
    if (PIXELS_LOCATIONS.has(coor) && !isEraserON) return;

    // Create a new pixel
    const pixel = document.createElement('div');
    pixel.className = 'pixel';
    pixel.style.left = `${x}px`;
    pixel.style.top = `${y}px`;
    pixel.style.width = `${SIZE}px`;
    pixel.style.height = `${SIZE}px`;

    pixel.style.backgroundColor = COLOR;
    MSPAINT_BODY.appendChild(pixel);
    PIXEL_UNDO_HISTORY.at(-1).push(coor);
    PIXELS_LOCATIONS.add(coor);
    //console.log(coor);
}

function removeManyPixel(targets) {
    const pixels = MSPAINT_BODY.getElementsByClassName('pixel');
    let counter = 0;
    let size = targets.length;
    PIXEL_REDO_HISTORY.push([]);
    while (counter < size) {
        MSPAINT_BODY.removeChild(pixels[pixels.length - 1]);
        let pixel = targets.pop()
        PIXELS_LOCATIONS.delete(pixel);
        PIXEL_REDO_HISTORY.at(-1).push(pixel);
        counter++;
    }
}

function toggleEraser() {
    COLOR = BACKGROUND_COLOR;
    isEraserON = !isEraserON;

    if (isEraserON) {
        document.getElementById('eraser-button').className = 'fa fa-eraser button primary';
        document.getElementById('eraser-button').title = 'Eraser is ON';
        document.getElementById('pointer-size-button').title = `Eraser size ${SIZE}px`;

        document.getElementById('color-slider-red').disabled = true;
        document.getElementById('color-slider-green').disabled = true;
        document.getElementById('color-slider-blue').disabled = true;
    }
    else {
        document.getElementById('eraser-button').className = 'fa fa-eraser';
        document.getElementById('eraser-button').title = 'Eraser is OFF';
        document.getElementById('pointer-size-button').title = `Pointer size ${SIZE}px`;

        document.getElementById('color-slider-red').disabled = false;
        document.getElementById('color-slider-green').disabled = false;
        document.getElementById('color-slider-blue').disabled = false;
        COLOR = `rgb(${RED},${GREEN},${BLUE})`;
    }
}

function eraseAll() {
    MSPAINT_BODY.innerHTML = '';
    PIXEL_UNDO_HISTORY.length = 0;
    PIXELS_LOCATIONS.clear();
}

function undo() {
    if (document.getElementsByClassName('pixel').length == 0) return;
    if (PIXEL_UNDO_HISTORY.length == 1 && PIXEL_UNDO_HISTORY.at(-1) == '') return;
    let removed_pixels = PIXEL_UNDO_HISTORY.pop();
    removeManyPixel(removed_pixels);
}

function redo() {
    if (PIXEL_REDO_HISTORY.length == 0) return;
    
}

function updatePointerSize(value) {
    SIZE = Number(value);
    document.getElementById('pointer-icon').style.fontSize = `${SIZE*1.25}px`;
    document.getElementById('pointer-slider').title = `${SIZE}px`;
    if (isEraserON) 
        document.getElementById('pointer-size-button').title = `Eraser size ${SIZE}px`;
    else 
        document.getElementById('pointer-size-button').title = `Pointer size ${SIZE}px`;
}

function updateColorRED(value) {
    RED = value;
    document.getElementById('color-picker-button').style.backgroundColor = `rgb(${RED},${GREEN},${BLUE})`;
    document.getElementById('color-picker-button').title = `rgb(${RED},${GREEN},${BLUE})`;
    document.getElementById('color-slider-red').title = `Red ${RED}`;
    COLOR = `rgb(${RED},${GREEN},${BLUE})`;
}

function updateColorGREEN(value) {
    GREEN = value;
    document.getElementById('color-picker-button').style.backgroundColor = `rgb(${RED},${GREEN},${BLUE})`;
    document.getElementById('color-picker-button').title = `rgb(${RED},${GREEN},${BLUE})`;
    document.getElementById('color-slider-green').title = `Green ${GREEN}`;
    COLOR = `rgb(${RED},${GREEN},${BLUE})`;
}

function updateColorBLUE(value) {
    BLUE = value;
    document.getElementById('color-picker-button').style.backgroundColor = `rgb(${RED},${GREEN},${BLUE})`;
    document.getElementById('color-picker-button').title = `rgb(${RED},${GREEN},${BLUE})`;
    document.getElementById('color-slider-blue').title = `Blue ${BLUE}`;
    COLOR = `rgb(${RED},${GREEN},${BLUE})`;
}

//Benched for now
// function zoom(value) {
//     const pixels = document.getElementsByClassName('pixel');
//     //console.log('old size:', SIZE);
//     const newSize = SIZE * Number(value);
//     //console.log('new size:', newSize);
//     for (let i = 0; i < pixels.length; i++) {
//         const height = parseFloat(pixels[i].style.height);
//         const width = parseFloat(pixels[i].style.width);
//         let x, y;
//         // Needs work on
//         if (Number(value) > CURRENT_ZOOM_SIZE) {
//             x = parseFloat(pixels[i].style.left) - newSize/2;
//             y = parseFloat(pixels[i].style.top) - newSize/2;
//         }
//         else {
//             x = parseFloat(pixels[i].style.left) + newSize/2;
//             y = parseFloat(pixels[i].style.top) + newSize/2;
//         }
//         pixels[i].style.left = `${x}px`;
//         pixels[i].style.top = `${y}px`;
//         pixels[i].style.height = `${height * Number(value) / CURRENT_ZOOM_SIZE}px`;
//         pixels[i].style.width  = `${width * Number(value) / CURRENT_ZOOM_SIZE}px`;
//     }
//     CURRENT_ZOOM_SIZE = Number(value);
//     //console.log(CURRENT_ZOOM_SIZE);
// }