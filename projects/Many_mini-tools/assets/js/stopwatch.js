function stopwatch() {
    let isRunning = false;
    let elapsedTime = 0;
    let intervalId = null;
    let startTime = 0;

    const STOPWATCH = document.getElementById('STW-stopwatch-display');
    const STOPWATCH_name = document.getElementById('STW-tool-name');
    const STW_BODY = document.getElementById('STW-body');
    const start_button = document.getElementById('STW-button-start');
    const pause_button = document.getElementById('STW-button-pause');
    const reset_button = document.getElementById('STW-button-reset');

    start_button.addEventListener('click', (event) => {
        isRunning = true;
        start_button.disabled = true;
        pause_button.disabled = false;
        reset_button.disabled = false;
        timeLoop();
    });
       
    pause_button.addEventListener('click', (event) => {
        isRunning = !isRunning;

        if (isRunning) 
            pause_button.textContent = 'Pause';
        else {
            pause_button.textContent = 'Resume';
            clearInterval(intervalId);
            intervalId = null;
            elapsedTime += Date.now() - startTime;
        }
        timeLoop();
    });

    reset_button.addEventListener('click', (event) => {
        clearInterval(intervalId);
        isRunning = false;
        intervalId = null;
        startTime = 0;
        elapsedTime = 0;
        STOPWATCH.textContent = '00:00:000';
        pause_button.textContent = 'Pause';
        pause_button.disabled = true;
        reset_button.disabled = true;
        start_button.disabled = false;
    });

    function timeFormat(totalElapsed) {
        const minutes = Math.floor(totalElapsed / 1000 / 60);
        const seconds = Math.floor((totalElapsed - minutes * 1000 * 60) / 1000);
        const miliseconds = totalElapsed - minutes * 1000 * 60 - seconds * 1000;
        return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}:${miliseconds.toString().padStart(3, '0')}`;
    }

    function timeLoop() {
        if (!isRunning) return;
        startTime = Date.now();
        intervalId = setInterval(() => {
            const totalElapsed = Date.now() - startTime + elapsedTime;
            if (getComputedStyle(STW_BODY).maxHeight == '0px') {
                STOPWATCH_name.textContent = `Stopwatch (${timeFormat(totalElapsed)})`;
            }
            else {
                STOPWATCH.textContent = timeFormat(totalElapsed);
                STOPWATCH_name.textContent = 'Stopwatch';
            }
        },1);
    }
}

stopwatch();