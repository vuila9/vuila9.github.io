let COLOR = 'rgb(0,0,0)';
let RED = 0;
let GREEN = 0;
let BLUE = 0;
let SIZE = 5;

const MAX_CANVAS_WIDTH = 1037.5;
const MAX_CANVAS_HEIGHT = 500;

const MAX_ZOOM_SIZE = 5;
let CURRENT_ZOOM_SIZE = 1;

const mspaint_body = document.getElementById('mspaint-body');
const locations = new Set();
const fresh_pixels = [];
let isDrawing = false;
let isMouseInside = false;
let isEraserON = false;
let isRightClick = false;

document.getElementById('ms-paint').addEventListener('contextmenu', (event) => {
    event.preventDefault(); // Prevent the context menu from showing
});

mspaint_body.addEventListener('mousedown', (event) => {
    //if (event.button !== 0) return; // Only trigger if left-click (button 0)

    if (event.button == 2 && !isEraserON) toggleEraser();
    fresh_pixels.length = 0;
    isDrawing = true;
    placePixel(event); // Place a pixel immediately on mousedown
});

mspaint_body.addEventListener('mousemove', (event) => {
    if (isDrawing && isMouseInside) {
        placePixel(event); // Place pixels only when mouse is inside the canvas
    }
});

mspaint_body.addEventListener('mouseup', (event) => {
    if (event.button == 2) toggleEraser();
    isDrawing = false; // Stop drawing when the mouse is released
    console.log(fresh_pixels);
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
    if (isEraserON && locations.size == 0) return;

    // Get the bounding rectangle of the white space
    const rect = mspaint_body.getBoundingClientRect();

    const x = Math.max(-1, Math.min(event.clientX - rect.left - SIZE/2, MAX_CANVAS_WIDTH - SIZE));
    const y = Math.max(-1, Math.min(event.clientY - rect.top - SIZE/2, MAX_CANVAS_HEIGHT - SIZE));
    const coor = `(${Math.floor(x)},${Math.floor(y)})`;

    // Do nothing if (x,y) already exits, eraser bypass this.
    if (locations.has(coor) && !isEraserON) return;

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
    if (!isEraserON) fresh_pixels.push(coor);
    locations.add(coor);
    //console.log(coor);
}

function removeManyPixel(targets) {
    const pixels = mspaint_body.getElementsByClassName('pixel');
    let counter = 0;
    let size = targets.length
    while (counter < size) {
        mspaint_body.removeChild(pixels[pixels.length - 1]);
        locations.delete(targets.pop())
        counter++;
    }
}

function toggleEraser() {
    COLOR = `rgb(242,242,242)`;
    isEraserON = !isEraserON;

    if (isEraserON) {
        document.getElementById('eraser').className = 'fa fa-eraser button primary';
        document.getElementById('eraser').title = 'Eraser is ON';
        document.getElementById('pointer-size').title = `Eraser size ${SIZE}px`;

        document.getElementById('color-slider-red').disabled = true;
        document.getElementById('color-slider-green').disabled = true;
        document.getElementById('color-slider-blue').disabled = true;
    }
    else {
        document.getElementById('eraser').className = 'fa fa-eraser';
        document.getElementById('eraser').title = 'Eraser is OFF';
        document.getElementById('pointer-size').title = `Pointer size ${SIZE}px`;

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

function undo() {
    if (document.getElementsByClassName('pixel').length == 0) return;
    removeManyPixel(fresh_pixels);
}

function updatePointerSize(value) {
    SIZE = Number(value);
    document.getElementById('pointer-icon').style.fontSize = `${SIZE*1.25}px`;
    document.getElementById('pointer-slider').title = `${SIZE}px`;
    if (isEraserON) 
        document.getElementById('pointer-size').title = `Eraser size ${SIZE}px`;
    else 
        document.getElementById('pointer-size').title = `Pointer size ${SIZE}px`;
}

function updateColorRED(value) {
    RED = value;
    document.getElementById('color-picker').style.backgroundColor = `rgb(${RED},${GREEN},${BLUE})`;
    document.getElementById('color-picker').title = `rgb(${RED},${GREEN},${BLUE})`;
    document.getElementById('color-slider-red').title = `Red ${RED}`;

    COLOR = `rgb(${RED},${GREEN},${BLUE})`;
}

function updateColorGREEN(value) {
    GREEN = value;
    document.getElementById('color-picker').style.backgroundColor = `rgb(${RED},${GREEN},${BLUE})`;
    document.getElementById('color-picker').title = `rgb(${RED},${GREEN},${BLUE})`;
    document.getElementById('color-slider-green').title = `Green ${GREEN}`;


    COLOR = `rgb(${RED},${GREEN},${BLUE})`;
}

function updateColorBLUE(value) {
    BLUE = value;
    document.getElementById('color-picker').style.backgroundColor = `rgb(${RED},${GREEN},${BLUE})`;
    document.getElementById('color-picker').title = `rgb(${RED},${GREEN},${BLUE})`;
    document.getElementById('color-slider-blue').title = `Blue ${BLUE}`;
    COLOR = `rgb(${RED},${GREEN},${BLUE})`;
}

/*
Supported:
- click, click-and-drag pixels
- changing drawing color
- changing pointer size
- temporary eraser
- eraser can change in size
- delete all pixels

TODO:
- Saving feature
- Undo drawn pixels
- Undo erased pixels
- Zoom (magnify)
- Button hover animation


*/


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