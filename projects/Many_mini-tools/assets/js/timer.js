function countdown() {
    const add_button = document.getElementById('TMR-timer-add-button');
    const TIMERS_DISPLAY = document.getElementById('TMR-timer-display');
    const TMR_BODY = document.getElementById('TMR-body');
    const DOC_ICON = document.getElementById('MMT-icon');
    const originalHREF = DOC_ICON.href;

    const TIMER_MAP = new Map();

    add_button.onclick = function() {
        let [hh,mm,ss] = document.querySelectorAll('.TMR-timer-input');
        [hh,mm,ss] = durationConverter(hh.value, mm.value, ss.value);
        if (hh == '00' && mm == '00' && ss == '00') return;

        const total_timers_count = document.querySelectorAll('.TMR-timer-container').length;
        const timer_id = (total_timers_count == 0) ? 0 : Number(document.querySelectorAll('.TMR-timer-container')[total_timers_count-1].id.split('-').at(-1)) + 1;

        const timer_div = document.createElement('div');
        timer_div.id = `TMR-timer-container-${timer_id}`;
        timer_div.className = 'TMR-timer-container';

        const timer_label = document.getElementById('TMR-label-input');
        const timer_display_label = document.createElement('div');
        timer_display_label.id = `TMR-timer-label-${timer_id}`;
        timer_display_label.className = `TMR-timer-label`;
        timer_display_label.innerHTML = (timer_label.value == '') ? `Timer ${timer_id + 1}` : timer_label.value;
        timer_label.value = '';

        const timer_label_sound = document.createElement('div');
        timer_label_sound.className = 'fas fa-volume-mute TMR-timer-sound';
        timer_label_sound.addEventListener('click', (event) => {
            timerSound(timer_id, event.target);
        })

        const timer_display_countdown = document.createElement('div');
        timer_display_countdown.innerHTML = `${hh.toString().padStart(2, '0')}:${mm.toString().padStart(2, '0')}:${ss.toString().padStart(2, '0')}`;
        timer_display_countdown.id = `TMR-timer-countdown-${timer_id}`;
        timer_display_countdown.className = 'TMR-timer-countdown';

        const utility_div = document.createElement('div');
        utility_div.className = 'TMR-timer-utility';

        const start_button = document.createElement('button');
        start_button.id = `TMR-timer-start-button-${timer_id}`;
        start_button.className = `fas fa-play TMR-timer-start-button`;
        start_button.title = 'start';
        start_button.addEventListener("click", (event) => {
            startTimer(timer_id, event.target)
        });

        const reset_button = document.createElement('button');
        reset_button.id = `TMR-timer-reset-button-${timer_id}`;
        reset_button.className = `fas fa-undo TMR-timer-reset-button`;
        reset_button.title = 'reset';
        reset_button.addEventListener("click", (event) => {
            resetTimer(timer_id);
        });

        const remove_button = document.createElement('button');
        remove_button.id = `TMR-timer-remove-button-${timer_id}`;
        remove_button.className = `fas fa-times TMR-timer-remove-button`;
        remove_button.title = 'remove';
        remove_button.addEventListener("click", (event) => {
            removeTimer(`TMR-timer-container-${timer_id}`, timer_id);
        });

        utility_div.appendChild(timer_display_countdown);
        utility_div.appendChild(start_button);
        utility_div.appendChild(reset_button);
        utility_div.appendChild(remove_button);

        timer_display_label.appendChild(timer_label_sound);

        timer_div.appendChild(timer_display_label);
        timer_div.appendChild(utility_div);

        TIMERS_DISPLAY.appendChild(timer_div);
        TMR_BODY.style.maxHeight = 46 + (TIMER_MAP.size + 1)*100 + 'px';
        TIMER_MAP.set(timer_id, new Timer([hh,mm,ss], timer_id));
    }

    function startTimer(timer_id, start_button) {
        const timer = TIMER_MAP.get(timer_id);
        if (timer.getRemaining() == 0) return;
        timer.togglePause();
        start_button.className = 'fas fa-play TMR-timer-start-button';
        if (TIMER_MAP.get(timer_id).isPause()) {
            clearInterval(timer.getIntervalID());
            timer.setIntervalID(null);
            return;
        }
        start_button.className = 'fas fa-pause TMR-timer-start-button';
        timer.setStartTime(Date.now());
        timer.setEndTime(timer.getStartTime() + timer.getRemaining()); // target time
        timer.setIntervalID(setInterval(() => {
            const currentTime = Date.now();
            timer.setRemaining(timer.getEndTime() - currentTime);

            if (timer.getRemaining() <= 0) { // when timer ends
                if (timer.isSoundOn()) 
                    timer.playSound();
                clearInterval(timer.getIntervalID());
                timer.setIntervalID(null);
                timer.setRemaining(0);
                start_button.className = 'fas fa-play TMR-timer-start-button';
                const timer_countdown = document.getElementById(`TMR-timer-countdown-${timer_id}`);
                const timer_tool_name = document.getElementById('TMR-tool-name');
                
                let isVisible = true;
                timer.setIntervalID(setInterval(() => {
                    isVisible = !isVisible;
                    timer_countdown.style.visibility = isVisible ? 'visible' : 'hidden';
                    DOC_ICON.href = (isVisible) ? './assets/img/bell.png' : originalHREF;
                    if (getComputedStyle(TMR_BODY).maxHeight == '0px') {
                        timer_tool_name.innerHTML = (isVisible) ? 'Timer 🔔' : 'Timer';
                    } else 
                        timer_tool_name.innerHTML= 'Timer';
                }, 500));
            } else {
                document.getElementById(`TMR-timer-countdown-${timer_id}`).innerHTML = timeFormat(timer.getRemaining());
            }
        }), 1000);
    }

    function resetTimer(timer_id) {
        const timer = TIMER_MAP.get(timer_id);
        if (timer.getRemaining() == timer.getDuration()) return;
        timer.pauseSound();
        timer.setPause(true);
        clearInterval(timer.getIntervalID());
        timer.setIntervalID(null);
        timer.setRemaining(timer.getDuration());
        document.getElementById(`TMR-timer-countdown-${timer_id}`).innerHTML = timeFormat(timer.getRemaining());
        document.getElementById(`TMR-timer-start-button-${timer_id}`).className = 'fas fa-play TMR-timer-start-button';
        document.getElementById(`TMR-timer-countdown-${timer_id}`).style.visibility = 'visible';
        DOC_ICON.href = originalHREF;
    }

    function removeTimer(container_id, timer_id) {
        const timer = TIMER_MAP.get(timer_id);
        if (!timer.isPause()) {
            timer.setPause(true);
            clearInterval(timer.getIntervalID());
            timer.setIntervalID(null);
        }
        timer.pauseSound();
        DOC_ICON.href = originalHREF;
        TIMERS_DISPLAY.removeChild(document.getElementById(container_id));
        TIMER_MAP.delete(timer_id);
        TMR_BODY.style.maxHeight = 46 + (TIMER_MAP.size)*100 + 'px';
    }

    function timerSound(timer_id, sound_label) {
        const timer = TIMER_MAP.get(timer_id);
        timer.toggleSound();
        if (timer.isSoundOn()) {
            sound_label.className = 'fas fa-volume-up TMR-timer-sound';
        }
        else {
            sound_label.className = 'fas fa-volume-mute TMR-timer-sound';
            if (timer.getRemaining() == 0) 
                timer.pauseSound();
        }
    }

    function timeFormat(remainingTime) {
        const seconds = Math.floor((remainingTime / 1000) % 60);
        const minutes = Math.floor((remainingTime / (1000 * 60)) % 60);
        const hours = Math.floor((remainingTime / (1000 * 60 * 60)));
        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }

    function durationConverter(hour, minute, second) {
        if (isNaN(hour))     hour = 0;
        if (isNaN(minute)) minute = 0;
        if (isNaN(second)) second = 0;

        [hour, minute, second] = [Number(hour), Number(minute), Number(second)];
        if (second > 59) {
            second -= 60;
            minute += 1;
        }
        if (minute > 59) {
            minute -= 60;
            hour += 1;
        }
        return [hour, minute, second];
    }
}

countdown();