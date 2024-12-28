function main() {
    const DELAY = 150; //miliseconds, increasing makes the game slower, decreasing makes the game faster
    const GAME_INTERFACE = document.getElementById("game-interface");
    const GRIDSIZE = 15;
    const SCORE_RATIO = 1;
    const DEFAULT_DIRECTION = ['left', 'up', 'right', 'down'][Math.floor(Math.random() * 4)];
    const PLAY_FIELD = new PlayField(GAME_INTERFACE, GRIDSIZE);
    var DIRECTION_INQUEUE = false;
    PLAY_FIELD.init();

    const SNAKE = new Snake(Math.floor(PLAY_FIELD.getColsNum()/2), Math.floor(PLAY_FIELD.getRowsNum()/2), GRIDSIZE, DEFAULT_DIRECTION);
    PLAY_FIELD.spawnSnake(SNAKE);

    const APPLE = new Apple(SCORE_RATIO, GRIDSIZE);
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
        SNAKE.setTempDirection('up');
    });
    
    document.getElementById('button-down').addEventListener('mousedown', (event) => {
        if (!GAME_LOOP) return;
        SNAKE.setTempDirection('down');
    });
    
    document.getElementById('button-left').addEventListener('mousedown', (event) => {
        if (!GAME_LOOP) return;
        SNAKE.setTempDirection('left');
    });
    
    document.getElementById('button-right').addEventListener('mousedown', (event) => {
        if (!GAME_LOOP) return;
        SNAKE.setTempDirection('right');
    });

    document.getElementById('button-reset').addEventListener('mousedown', (event) => {
        GAME_LOOP = false;
        PLAY_FIELD.reset();
        SNAKE.reset(Math.floor(PLAY_FIELD.getColsNum()/2), Math.floor(PLAY_FIELD.getRowsNum()/2), GRIDSIZE, DEFAULT_DIRECTION);
        PLAY_FIELD.spawnSnake(SNAKE);
        APPLE.reset(SCORE_RATIO, GRIDSIZE);
        PLAY_FIELD.spawnApple(APPLE);
        document.getElementById('button-play-icon').className = 'fa fa-play';
        document.getElementById('button-play-icon').title = 'Press to play';
        document.getElementById('button-play').disabled = false;
        document.getElementById('gameover-popup').style.display = 'none';
    });
    
    // Add event listener for keyboard key presses
    document.addEventListener("keydown", (event) => {
        if (!GAME_LOOP) return;
        event.preventDefault();
        switch (event.key) {
            case "w":
            case "ArrowUp":
                SNAKE.setTempDirection('up');
                break;
                
            case "s":
            case "ArrowDown":
                SNAKE.setTempDirection('down');
                break;

            case "a":
            case "ArrowLeft":
                SNAKE.setTempDirection('left');
                break;

            case "d":
            case "ArrowRight":
                SNAKE.setTempDirection('right');
                break;
            default:
                // Ignore other keys
                break;
        }
    });

    function gameLoop() {
        if (!GAME_LOOP) return;
        SNAKE.setConfirmedDirection();
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
            gameoverPopupHandler();
            GAME_LOOP = false;
            document.getElementById('button-play').disabled = true;
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

    function gameoverPopupHandler() {
        const gameover_popup = document.getElementById('gameover-popup');
        const gameover_body_popup = document.getElementsByClassName('body-popup')[0].lastElementChild;
        gameover_body_popup.innerHTML = "<h3>Game Over</h3>";

        const span = document.getElementsByClassName("close")[0];
        gameover_popup.style.display = 'block';
        span.onclick = function() {
            gameover_popup.style.display = "none";
        }
        window.onclick = function(event) {
            if (event.target == gameover_popup) 
                gameover_popup.style.display = "none";
        }
    }

    setInterval(gameLoop, DELAY);
}

window.onload = function() {
    main();
}