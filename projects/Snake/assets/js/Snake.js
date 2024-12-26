function main() {
    const DELAY = 100; //miliseconds, increasing makes the game slower, decreasing makes the game faster
    const GAME_INTERFACE = document.getElementById("game-interface");
    const GRIDSIZE = 15;
    const PLAY_FIELD = new PlayField(GAME_INTERFACE, GRIDSIZE)
    PLAY_FIELD.init();

    const SNAKE = new Snake(Math.floor(PLAY_FIELD.getColsNum()/2), Math.floor(PLAY_FIELD.getRowsNum()/2), GRIDSIZE, 'left');
    PLAY_FIELD.spawnSnake(SNAKE);

    const APPLE = new Apple(1, GRIDSIZE);
    PLAY_FIELD.spawnApple(APPLE);

    let GAME_LOOP = false;
    document.getElementById('button-play').addEventListener('mousedown', (event) => { 
        if (event.button == 2) event.preventDefault(); // prevent right-click
        GAME_LOOP = !GAME_LOOP;
        if (GAME_LOOP) {
            document.getElementById('button-play-icon').className = 'fa fa-pause';
            event.target.title = 'Press to pause';
        }
        else {
            document.getElementById('button-play-icon').className = 'fa fa-play';
            event.target.title = 'Press to play';
        }
    });

    document.getElementById('button-grow').addEventListener('mousedown', (event) => {
        if (!GAME_LOOP) return;
        SNAKE.grow();
    });

    document.getElementById('button-up').addEventListener('mousedown', (event) => {
        if (!GAME_LOOP) return;
        SNAKE.setDirection('up');
    });
    
    document.getElementById('button-down').addEventListener('mousedown', (event) => {
        if (!GAME_LOOP) return;
        SNAKE.setDirection('down');
    });
    
    document.getElementById('button-left').addEventListener('mousedown', (event) => {
        if (!GAME_LOOP) return;
        SNAKE.setDirection('left');
    });
    
    document.getElementById('button-right').addEventListener('mousedown', (event) => {
        if (!GAME_LOOP) return;
        SNAKE.setDirection('right');
    });
    
    // Add event listener for keyboard key presses
    document.addEventListener("keydown", (event) => {
        if (!GAME_LOOP) return;
        event.preventDefault();
        switch (event.key) {
            case "w":
            case "ArrowUp":
                SNAKE.setDirection('up');
                break;
                
            case "s":
            case "ArrowDown" || 'S':
                SNAKE.setDirection('down');
                break;

            case "a":
            case "ArrowLeft":
                SNAKE.setDirection('left');
                break;

            case "d":
            case "ArrowRight":
                SNAKE.setDirection('right');
                break;
            default:
                // Ignore other keys
                break;
        }
    });

    function gameLoop() {
        if (!GAME_LOOP) return;
        updateSnake();
        renderSnake();
        
    }

    function updateSnake() {
        SNAKE.updateLastPosition();
        SNAKE.resetOccupiedGrid();
        for (let i = SNAKE.getLength() - 1; i >= 1; i--) {
            const snakePart = SNAKE.getPartAt(i);
            snakePart['position'][0] = SNAKE.getPartAt(i-1)['position'][0];
            snakePart['position'][1] = SNAKE.getPartAt(i-1)['position'][1];
            SNAKE.updateOccupiedGrid(`${snakePart['position'][0]},${snakePart['position'][1]}`);
        }
        SNAKE.updateHeadPosition(PLAY_FIELD.getRowsNum(), PLAY_FIELD.getColsNum());
        if (SNAKE.collideSelf()) {
            console.log('game over');
            GAME_LOOP = !GAME_LOOP;
            return;
        }
        SNAKE.updateOccupiedGrid(`${SNAKE.getHead()['position'][0]},${SNAKE.getHead()['position'][1]}`);

        if (SNAKE.eatenFood(APPLE)) {
            SNAKE.grow();
            APPLE.spawn(PLAY_FIELD.getRowsNum(), PLAY_FIELD.getColsNum(), SNAKE.getOccupiedGrid());
            renderApple();
        }
    }

    function renderSnake() {
        for (let i = 0; i < SNAKE.getLength(); i++) {
            const snakePart = SNAKE.getPartAt(i);
            snakePart['div'].style.left = GRIDSIZE * snakePart['position'][0] + 'px';
            snakePart['div'].style.top = GRIDSIZE * snakePart['position'][1] + 'px';
        }
    }

    function renderApple() {
        const apple_div = document.getElementById('apple');
        const [x,y] = APPLE.getApplePosition();
        apple_div.style.left = GRIDSIZE * x + 'px';
        apple_div.style.top = GRIDSIZE * y + 'px';

    }
    setInterval(gameLoop, DELAY);
}

window.onload = function() {
    main();
}