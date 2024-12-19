let GAME_LOOP = false;
let SNAKE_COLOR = 'rgb(255,0,0)';
let SNAKE_SIZE = 20;
let GAME_INTERVAL;
let SNAKE_SPEED = 200;
let LAST_FRAME_TIME;
let SNAKE_LENGTH = 0;
let FRUIT_EATEN = true;


const TURN_HASHMAP = new Map();
const SNAKE_BODY = [];
let TURN_COORDINATE = [];

const GAME_INTERFACE = document.getElementById('game-interface');
const MAX_ARENA_WIDTH = GAME_INTERFACE.offsetWidth;
const MAX_ARENA_HEIGHT = GAME_INTERFACE.offsetHeight;


document.getElementById('button-play').addEventListener('mousedown', (event) => {
    if (event.button == 2) event.preventDefault(); // prevent right-click
    GAME_LOOP = !GAME_LOOP;

    if (GAME_LOOP) {
        document.getElementById('button-play-icon').className = 'fa fa-pause';
        event.target.title = 'Press to pause';
        LAST_FRAME_TIME = performance.now();
        gameLoop(LAST_FRAME_TIME);
    }
    else {
        document.getElementById('button-play-icon').className = 'fa fa-play';
        event.target.title = 'Press to play';
    }
});

document.getElementById('button-up').addEventListener('mousedown', (event) => {
    console.log('button up clicked');
    SNAKE_BODY[0]['direction'] = 'up';
});

document.getElementById('button-down').addEventListener('mousedown', (event) => {
    console.log('button down clicked');
    SNAKE_BODY[0]['direction'] = 'down';
    

});

document.getElementById('button-left').addEventListener('mousedown', (event) => {
    console.log('button left clicked');
    SNAKE_BODY[0]['direction'] = 'left';

});

document.getElementById('button-right').addEventListener('mousedown', (event) => {
    console.log('button right clicked');
    SNAKE_BODY[0]['direction'] = 'right';

});

function gameLoop(currentTime) {
    if (!GAME_LOOP) return;
    const elapsedTime = currentTime - LAST_FRAME_TIME;

    if (elapsedTime > 16.67) { // Approx 60 FPS (1000ms/60 = ~16.67ms per frame)

        for (let i = 0; i < SNAKE_LENGTH; i++) {
            const snake = document.getElementById('snake-body-' + i);
            const currentLeft = parseInt(snake.style.left || '0', 10);
    
            // Calculate movement based on elapsed time
            const pixelsToMove = (elapsedTime / 1000) * SNAKE_SPEED;
            if (snake.offsetLeft < 0 - SNAKE_SIZE) {
                snake.style.left = (MAX_ARENA_WIDTH + currentLeft - pixelsToMove + SNAKE_SIZE) + 'px';
            }
            else
                snake.style.left = (currentLeft - pixelsToMove) + 'px';
        }
        // Update the last frame time
        LAST_FRAME_TIME = currentTime;
    }

    // Schedule the next frame
    requestAnimationFrame(gameLoop);
}

function placePixel(x=0, y=0) {
    const pixel = document.createElement('div');
    pixel.id = 'snake-body-' + SNAKE_LENGTH;
    SNAKE_LENGTH +=1;
    pixel.className  = 'pixel';
    pixel.style.left = `${x}px`;
    pixel.style.top  = `${y}px`;
    pixel.style.width  = `${SNAKE_SIZE}px`;
    pixel.style.height = `${SNAKE_SIZE}px`;
    if (SNAKE_LENGTH == 1)
        pixel.style.backgroundColor = 'rgb(0,0,0)';
    else
        pixel.style.backgroundColor = SNAKE_COLOR;

    return pixel;
}

function addPartsToSnake(length=1, option=1) {
    for (let len = 0; len < length; len++) {
        const snakepart_x = SNAKE_BODY.at(-1)['stat'].offsetLeft + SNAKE_SIZE + option;
        const snakepart_y = SNAKE_BODY.at(-1)['stat'].offsetTop;
        const snakepart = placePixel(snakepart_x, snakepart_y);
        GAME_INTERFACE.appendChild(snakepart);
        SNAKE_BODY.push([snakepart, SNAKE_BODY.at(-1)[1]]);
    }
}

window.onload = function () {
    const snakehead = placePixel(Math.floor(MAX_ARENA_WIDTH/2), Math.floor(MAX_ARENA_HEIGHT/2));
    GAME_INTERFACE.appendChild(snakehead);
    SNAKE_BODY.push({'stat': snakehead, 'direction': 'left'});

    //addPartsToSnake(15);
    
}