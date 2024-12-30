function main() {
    const GAME_INTERFACE = document.getElementById("game-interface");
    const SPEED = 150;                    // base speed
    let DEFAULT_DIRECTION = ['left', 'up', 'right', 'down'][Math.floor(Math.random() * 4)];

    let GRIDSIZE = 15;                    // size of each box, changing this value will affect the entire game size
    let DELAY = Math.floor(SPEED * GRIDSIZE / 15);    // miliseconds, increasing makes the game slower, decreasing makes the game faster
    let HASTE = 2;                        // double the speed by default
    let isHasten = false;
    let GRID_ENABLED = true;              // grid enabled by default
    let GAME_MODE = false;
    let GRID_RESIZE = false;

    const PLAY_FIELD = new PlayField(GAME_INTERFACE, GRIDSIZE);
    PLAY_FIELD.init();

    const SNAKE = new Snake(Math.floor(PLAY_FIELD.getColsNum()/2), Math.floor(PLAY_FIELD.getRowsNum()/2), GRIDSIZE, DEFAULT_DIRECTION);
    PLAY_FIELD.spawnSnake(SNAKE);

    const APPLE = new Apple(GRIDSIZE);
    PLAY_FIELD.spawnApple(APPLE);

    let GAME_LOOP = false;
    document.getElementById('button-play').addEventListener('click', (event) => { // start / pause the game
        if (event.button == 2) event.preventDefault(); // prevent right-click
        pauseGame();
    });

    document.getElementById('button-grow').addEventListener('click', (event) => {
        if (!GAME_LOOP) return;
        SNAKE.grow();
        updateScore();
    });

    document.getElementById('button-up').addEventListener('click', (event) => {
        if (!GAME_LOOP) return;
        SNAKE.setTempDirection('up');
    });
    
    document.getElementById('button-down').addEventListener('click', (event) => {
        if (!GAME_LOOP) return;
        SNAKE.setTempDirection('down');
    });
    
    document.getElementById('button-left').addEventListener('click', (event) => {
        if (!GAME_LOOP) return;
        SNAKE.setTempDirection('left');
    });
    
    document.getElementById('button-right').addEventListener('click', (event) => {
        if (!GAME_LOOP) return;
        SNAKE.setTempDirection('right');
    });

    document.getElementById('button-reset').addEventListener('click', (event) => { // reset 
        reset();
    });

    document.getElementById('button-grid').addEventListener('click', (event) => { // toggle grid on/off
        GRID_ENABLED = !GRID_ENABLED; 
        const elements = document.querySelectorAll('.grid-box'); 
        if (GRID_ENABLED) {
            document.getElementById('button-grid-icon').className = 'fas fa-border-none';
            event.target.title = 'Untoggle grid';
            elements.forEach(element => {
                element.style.border = '1px solid #ccc';
            });
        } else {
            document.getElementById('button-grid-icon').className = 'fas fa-border-all';
            event.target.title = 'Toggle grid';
            elements.forEach(element => {
                element.style.border = 'none'; 
            });
        }
    });

    document.getElementById('button-mode').addEventListener('click', (event) => { // toggle grid on/off
        gamemodePopupHandler();
    });

    document.getElementById('button-gamemode-plain').addEventListener('click', (event) => { // game mode - PLAIN
        PLAY_FIELD.plainMode();
        reset();
    });

    document.getElementById('button-gamemode-border').addEventListener('click', (event) => { // game mode - BORDER
        PLAY_FIELD.borderMode();
        reset();
    });

    document.getElementById('button-gamemode-corners').addEventListener('click', (event) => { // game mode - BORDER
        PLAY_FIELD.cornersMode();
        reset();
    });

    document.getElementById('button-gamemode-semiwall').addEventListener('click', (event) => { // game mode - BORDER
        PLAY_FIELD.semiWallMode();
        reset();
    });

    document.getElementById('button-gamemode-heart').addEventListener('click', (event) => { // game mode - BORDER
        PLAY_FIELD.heartMode();
        reset();
    });

    document.getElementById('button-haste').addEventListener('mousedown', (event) => { // hasten the snake when mouse is down
        DELAY /= HASTE;
    });

    document.addEventListener("keydown", (event) => {
        if (event.key === " " && !isHasten) {
            event.preventDefault();
            DELAY /= HASTE;
            isHasten = true;
        }
    });

    document.getElementById('button-haste').addEventListener('mouseup', (event) => {   // reset speed to default when mouse is up
        DELAY *= HASTE;
    });

    document.getElementById('gridsize-slider').addEventListener('input', (event) => {
        GRIDSIZE = event.target.value;
        document.getElementById('gridsize-icon').style.fontSize = event.target.value * 1.25 + 'px';
        document.getElementById('button-gridsize').title = `Grid size ${event.target.value}px`;
        GRID_RESIZE = true;
        if (GRID_RESIZE) {
            document.getElementById('button-play').disabled = true;
            document.getElementById('button-mode').disabled = true;
        }
    });

    document.addEventListener("keyup", (event) => {
        if (event.key === " ") {
            event.preventDefault();
            DELAY *= HASTE;
            isHasten = false;
        }
        else if (event.key === 'p' && !GAME_MODE && !GRID_RESIZE) {
            pauseGame();
        }
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
        setTimeout(gameLoop, DELAY);
    }

    function pauseGame() {
        GAME_LOOP = !GAME_LOOP;
        if (GAME_LOOP) {
            document.getElementById('button-play-icon').className = 'fa fa-pause';
            document.getElementById('button-play').title = 'Pause';
            document.getElementById('button-mode').disabled = true;
            document.getElementById('gridsize-slider').disabled = true;
        }
        else {
            document.getElementById('button-play-icon').className = 'fa fa-play';
            document.getElementById('button-play').title = 'Pause';
            document.getElementById('button-mode').disabled = false;
            document.getElementById('gridsize-slider').disabled = false;
        }
        gameLoop();
    }

    function reset() {
        GAME_LOOP = false;
        GAME_MODE = false;
        isHasten = false;
        PLAY_FIELD.reset(GAME_INTERFACE, GRIDSIZE, GRID_RESIZE);
        GRID_RESIZE = false;
        DELAY =  Math.floor(SPEED * GRIDSIZE / 15);
        DEFAULT_DIRECTION = ['left', 'up', 'right', 'down'][Math.floor(Math.random() * 4)];
        SNAKE.reset(Math.floor(PLAY_FIELD.getColsNum()/2), Math.floor(PLAY_FIELD.getRowsNum()/2), GRIDSIZE, DEFAULT_DIRECTION);
        PLAY_FIELD.spawnSnake(SNAKE);
        APPLE.reset(GRIDSIZE);
        PLAY_FIELD.spawnApple(APPLE, SNAKE.getOccupiedGrid());
        updateScore(true);
        document.getElementById('button-play-icon').className = 'fa fa-play';
        document.getElementById('button-play-icon').title = 'Play';
        document.getElementById('button-play').disabled = false;
        document.getElementById('button-mode').disabled = false;
        document.getElementById('gridsize-slider').disabled = false;
        document.getElementById('gameover-popup').style.display = 'none';
        document.getElementById('gamemode-popup').style.display = 'none';
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
        if (SNAKE.collideSelf() || SNAKE.collideObstacle(PLAY_FIELD.getOccupiedGrid())) {
            console.log('GAME OVER');
            console.log('Score:', (SNAKE.getLength() - 1) * PLAY_FIELD.getScoreRatio());
            gameoverPopupHandler();
            GAME_LOOP = false;
            document.getElementById('button-play').disabled = true;
            return;
        }
        SNAKE.updateOccupiedGrid(`${SNAKE.getHead()['position'][0]},${SNAKE.getHead()['position'][1]}`);

        if (SNAKE.eatenFood(APPLE)) {
            SNAKE.grow();
            APPLE.spawn(PLAY_FIELD.getRowsNum(), PLAY_FIELD.getColsNum(), SNAKE.getOccupiedGrid(), PLAY_FIELD.getOccupiedGrid());
            updateScore()
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
        gameover_body_popup.innerHTML = `<h1>GAME OVER</h1>`;
        gameover_body_popup.innerHTML += `<h2>Score: ${(SNAKE.getLength() - 1) * PLAY_FIELD.getScoreRatio()}</h2>`;
        gameover_body_popup.innerHTML += `<h2>Length: ${(SNAKE.getLength() - 1)}</h2>`;

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

    function updateScore(reset=false) {
        const score_div = document.getElementById('game-score');
        if (!reset)
            score_div.innerHTML = (SNAKE.getLength() - 1) * PLAY_FIELD.getScoreRatio();
        else
            score_div.innerHTML = 0;
    }

    function gamemodePopupHandler() {
        const difficulty_popup = document.getElementById('gamemode-popup');
        const span = document.getElementsByClassName("close")[1];
        const button_play = document.getElementById('button-play');
        button_play.disabled = true;
        GAME_MODE = true;

        difficulty_popup.style.display = 'block';
        span.onclick = function() {
            GAME_MODE = false;
            button_play.disabled = false;
            difficulty_popup.style.display = "none";
        }
        window.onclick = function(event) {
            if (event.target == difficulty_popup) {
                GAME_MODE = false;
                button_play.disabled = false;
                difficulty_popup.style.display = "none";
            }
        }
    }

    function slider() {
        const slider = document.getElementById('gridsize-slider');
        const tooltip = document.getElementById('slider-title');
    
        // Function to update tooltip position and text
        const updateTooltip = (event) => {
            const sliderValue = slider.value;
            tooltip.textContent = `${sliderValue}px`;
            tooltip.style.left = `${event.pageX}px`;
            tooltip.style.top = `${event.pageY - 10}px`; // Slightly above the cursor
        };
    
        // Show tooltip on interaction
        const showTooltip = () => {
            tooltip.style.opacity = 1;
        };
    
        // Hide tooltip when interaction stops
        const hideTooltip = () => {
            tooltip.style.opacity = 0;
        };
    
        // Add event listeners
        slider.addEventListener('mousedown', showTooltip);
        slider.addEventListener('mousemove', updateTooltip);
        slider.addEventListener('mouseup', hideTooltip);
        slider.addEventListener('touchstart', showTooltip);
        slider.addEventListener('touchmove', (event) => {
            // For touch devices, use the first touch point
            const touch = event.touches[0];
            updateTooltip(touch);
        });
        slider.addEventListener('touchend', hideTooltip);
    }

    //setInterval(gameLoop, DELAY);
    //setTimeout(gameLoop, DELAY);
    slider();
    gameLoop();
}

window.onload = function() {
    main();
}