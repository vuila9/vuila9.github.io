let GAME_LOOP = false;
let SNAKE_COLOR = 'rgb(255,0,0)';
let SNAKE_SIZE = 20;
let GAME_INTERVAL;
let SNAKE_SPEED = 200;
let LAST_FRAME_TIME;
let SNAKE_LENGTH = 0;
let FRUIT_EATEN = true;


const TURN_HASHMAP = new Map();
const TURN_QUEUE = new Queue();
const SNAKE_BODY = [];
let TURN_COORDINATE = [];

const GAME_INTERFACE = document.getElementById('game-interface');
const MAX_ARENA_WIDTH = GAME_INTERFACE.offsetWidth;   //1040
const MAX_ARENA_HEIGHT = GAME_INTERFACE.offsetHeight; //520


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
    directionRegistry('up');
});

document.getElementById('button-down').addEventListener('mousedown', (event) => {
    console.log('button down clicked');
    directionRegistry('down');
});

document.getElementById('button-left').addEventListener('mousedown', (event) => {
    console.log('button left clicked');
    directionRegistry('left');
});

document.getElementById('button-right').addEventListener('mousedown', (event) => {
    console.log('button right clicked');
    directionRegistry('right');
});

// Add event listener for keyboard key presses
document.addEventListener("keydown", (event) => {
    if (!GAME_LOOP) return;
    event.preventDefault();
    switch (event.key) {
        case "ArrowUp":
            directionRegistry('up');
            break;
        case "ArrowDown":
            directionRegistry('down');
            break;
        case "ArrowLeft":
            directionRegistry('left');
            break;
        case "ArrowRight":
            directionRegistry('right');
            break;
        default:
            // Ignore other keys
            break;
    }
});

function directionHandler(direction) {
    const snake_head = SNAKE_BODY[0];
    let current_direction = snake_head['direction'];
    if (current_direction == 'up' || current_direction == 'down')
        return direction == 'left' || direction == 'right';
    else if (current_direction == 'left' || current_direction == 'right')
        return direction == 'up' || direction == 'down';
}

function directionRegistry(direction) {
    if (!directionHandler(direction)) return;
    SNAKE_BODY[0]['direction'] = direction;
    const x = SNAKE_BODY[0]['stat'].offsetLeft;
    const y = SNAKE_BODY[0]['stat'].offsetTop;
    //TURN_HASHMAP.set(`${x},${y}`, direction);
    //TURN_QUEUE.enqueue([`${x},${y}`, direction]);
    for (let snakepart of SNAKE_BODY) {
        snakepart['turnqueue'].enqueue([`${x},${y}`, direction])
    }
}

function moveSnakePart(pixelsToMove, snakepart, direction) {
    let currentDirectionMoving;

    if (direction == 'left') {
        currentDirectionMoving = snakepart.offsetLeft;
        if (currentDirectionMoving <= 0 - SNAKE_SIZE) {
            snakepart.style.left = Math.ceil((MAX_ARENA_WIDTH + currentDirectionMoving - pixelsToMove + SNAKE_SIZE)) + 'px';
        }
        else
            snakepart.style.left = Math.ceil((currentDirectionMoving - pixelsToMove)) + 'px';
    }
    else if (direction == 'right') {
        currentDirectionMoving = snakepart.offsetLeft;
        if (currentDirectionMoving > MAX_ARENA_WIDTH + SNAKE_SIZE) {
            snakepart.style.left = Math.floor((MAX_ARENA_WIDTH - (currentDirectionMoving + pixelsToMove - SNAKE_SIZE/2))) + 'px';
        }
        else
            snakepart.style.left = Math.floor((currentDirectionMoving + pixelsToMove)) + 'px';
    }
    else if (direction == 'up') {
        currentDirectionMoving = snakepart.offsetTop;
        if (currentDirectionMoving <= 0 - SNAKE_SIZE) {
            snakepart.style.top = Math.ceil((MAX_ARENA_HEIGHT + currentDirectionMoving - pixelsToMove + SNAKE_SIZE)) + 'px';
        }
        else
            snakepart.style.top = Math.ceil((currentDirectionMoving - pixelsToMove)) + 'px';
    }
    else if (direction == 'down') {
        currentDirectionMoving = snakepart.offsetTop;
        if (currentDirectionMoving > MAX_ARENA_HEIGHT + SNAKE_SIZE) {
            snakepart.style.top = Math.floor((MAX_ARENA_HEIGHT - (currentDirectionMoving + pixelsToMove - SNAKE_SIZE/2))) + 'px';
        }
        else
            snakepart.style.top = Math.floor((currentDirectionMoving + pixelsToMove)) + 'px';
    }
<<<<<<< HEAD
    //console.log(currentDirectionMoving);
=======
}

function withinRange(value, target, range=1) {
    //return value >= target - range || value <= target + range;
    return value == target;
>>>>>>> f9b5304c7b72aaccc78e8013fe35a394f63719e0
}

function gameLoop(currentTime) {
    if (!GAME_LOOP) return;
    const elapsedTime = currentTime - LAST_FRAME_TIME;

    if (elapsedTime > 16.67) { // Approx 60 FPS (1000ms/60 = ~16.67ms per frame)
        const pixelsToMove = (elapsedTime / 1000) * SNAKE_SPEED;
        for (let i = 0; i < SNAKE_LENGTH; i++) {
            const snake = document.getElementById('snake-body-' + i);
            const turnqueue = SNAKE_BODY[i]['turnqueue'];
            if (!turnqueue.isEmpty()) {
                const current_xy = turnqueue.peek()[0].split(',');
                const current_direction = turnqueue.peek()[1];
                if (withinRange(snake.offsetLeft, Number(current_xy[0])) && withinRange(snake.offsetTop, Number(current_xy[1])))
                    SNAKE_BODY[i]['direction'] = current_direction;
                //turnqueue.dequeue();
            }
            moveSnakePart(pixelsToMove, snake, SNAKE_BODY[i]['direction']);
        }
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
        const snakepart_x = SNAKE_BODY.at(-1)['stat'].offsetLeft + SNAKE_SIZE;
        const snakepart_y = SNAKE_BODY.at(-1)['stat'].offsetTop;
        const snakepart = placePixel(snakepart_x, snakepart_y);
        GAME_INTERFACE.appendChild(snakepart);
        SNAKE_BODY.push({'stat': snakepart, 'direction': SNAKE_BODY.at(-1)['direction'], 'turnqueue': new Queue()});
    }
}

window.onload = function () {
    const snakehead = placePixel(Math.floor(MAX_ARENA_WIDTH/2), Math.floor(MAX_ARENA_HEIGHT/2));
    GAME_INTERFACE.appendChild(snakehead);
    SNAKE_BODY.push({'stat': snakehead, 'direction': 'left', 'turnqueue': new Queue()});

    addPartsToSnake(5);
}