function stopwatch() {
    let isRunning = false;
    let elapsedTime = 0;  // in miliseconds
    let intervalIdRef = null;
    let startTimeRef = 0;

    const STOPWATCH = document.getElementById('stopwatch-display');

    const start_button = document.getElementById('STW-button-start');
    const pause_button = document.getElementById('STW-button-pause');
    const reset_button = document.getElementById('STW-button-reset');

    start_button.addEventListener('click', (event) => {
        isRunning = true;
        let time_now = Date.now();
        let seconds = 0;
        //stopwatch.innerHTML = `${timeFormat(seconds)}`;
        start_button.disabled = true;
        pause_button.disabled = false;
        reset_button.disabled = false;

        timeLoop();
    });
       
    pause_button.addEventListener('click', (event) => {
        isRunning = !isRunning;

        if (isRunning)
            event.target.innerHTML = 'Pause';
        else
            event.target.innerHTML = 'Resume';

        timeLoop();
    });

    reset_button.addEventListener('click', (event) => {
        isRunning = false;
        reset_button.disabled = true;
        pause_button.disabled = true;
        start_button.disabled = false;
    });

    function timeFormat() {
        const minutes = Math.floor(elapsedTime / 1000 / 60);
        const seconds = Math.floor((elapsedTime - minutes * 1000 * 60) / 1000);
        const miliseconds = elapsedTime - minutes * 1000 * 60 - seconds * 1000;
        return `${minutes}:${seconds}:${miliseconds}`;
    }

    function timeLoop() {
        if (!isRunning) return;
        elapsedTime += 1;
        //STOPWATCH.textContent = `${timeFormat()}`;
        STOPWATCH.innerHTML = timeFormat();
        setTimeout(timeLoop, 1);
    }
    //timeLoop();
}

window.onload = function() {
    stopwatch();
}