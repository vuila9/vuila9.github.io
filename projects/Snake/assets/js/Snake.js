function main() {
    const gameinterface = document.getElementById("game-interface");
    const gridsize = 15;
    const playField = new PlayField(gameinterface, gridsize)
    playField.init();

    const snake = new Snake(Math.floor(playField.getColsNum()/2), Math.floor(playField.getRowsNum()/2) ,'left');
    playField.placeSnake(snake);

    let GAME_LOOP = false;
    document.getElementById('button-play').addEventListener('mousedown', (event) => { 
        if (event.button == 2) event.preventDefault(); // prevent right-click
        GAME_LOOP = !GAME_LOOP;
    
        if (GAME_LOOP) {
            document.getElementById('button-play-icon').className = 'fa fa-pause';
            event.target.title = 'Press to pause';
            //LAST_FRAME_TIME = performance.now();
            //gameLoop(LAST_FRAME_TIME);
        }
        else {
            document.getElementById('button-play-icon').className = 'fa fa-play';
            event.target.title = 'Press to play';
        }
    });

    document.getElementById('button-up').addEventListener('mousedown', (event) => {
        if (!GAME_LOOP) return;
        console.log('button up clicked');
        snake.setDirection('up');
    });
    
    document.getElementById('button-down').addEventListener('mousedown', (event) => {
        if (!GAME_LOOP) return;
        console.log('button down clicked');
        snake.setDirection('down');
    });
    
    document.getElementById('button-left').addEventListener('mousedown', (event) => {
        if (!GAME_LOOP) return;
        console.log('button left clicked');
        snake.setDirection('left');
    });
    
    document.getElementById('button-right').addEventListener('mousedown', (event) => {
        if (!GAME_LOOP) return;
        console.log('button right clicked');
        snake.setDirection('right');

    });
    
    // Add event listener for keyboard key presses
    document.addEventListener("keydown", (event) => {
        if (!GAME_LOOP) return;
        event.preventDefault();
        switch (event.key) {
            case "ArrowUp":
                snake.setDirection('up');
                break;
            case "ArrowDown":
                snake.setDirection('down');
                break;
            case "ArrowLeft":
                snake.setDirection('left');
                break;
            case "ArrowRight":
                snake.setDirection('right');
                break;
            default:
                // Ignore other keys
                break;
        }
    });

    function gameLoop() {
        if (!GAME_LOOP) return;
        console.log("it's on");
        updateSnake();
        renderSnake();
    }

    function updateSnake() {
        const head_direction = snake.getHead()['direction'];
        if (head_direction == 'left') {

        }
    }

    function renderSnake() {

    }

    setInterval(gameLoop, 250);
}

function gameLoop(GAME_LOOP) {
    
}


window.onload = function() {
    main();
}