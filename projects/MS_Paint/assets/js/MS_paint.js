const COLOR = 'red';
const mspaint_body = document.getElementById('mspaint-body');
const locations = new Set();

mspaint_body.addEventListener('click', (event) => {
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
});