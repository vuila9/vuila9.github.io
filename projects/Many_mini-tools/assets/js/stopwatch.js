function stopwatch() {
    let isRunning = false;
    let elapsedTime = 0;
    let intervalIdRef = null;
    let startTimeRef = 0;

    const STOPWATCH = document.getElementById('stopwatch-display');

    document.getElementById('button-play').addEventListener('click', (event) => { // start / pause the game
        if (event.button == 2) event.preventDefault(); // prevent right-click
        pauseGame();
    });

    document.getElementById('STW-button-start').addEventListener('click', (event) => {
        isRunning = true;
        let time_now = Date.now();
        let seconds = 0;
        stopwatch.innerHTML = `${timeFormat(seconds)}`;
    });
       
    document.getElementById('STW-button-pause').addEventListener('click', (event) => {
        isRunning = false;
    });

    document.getElementById('STW-button-reset').addEventListener('click', (event) => {

    });

    function timeFormat(time) {
        let time_string = '00:00:00';
        return time_string;
    }

    function timeLoop() {
        if (!isRunning) return;
    }
}

window.onload = function() {
    stopwatch();
}