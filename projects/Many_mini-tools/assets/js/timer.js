function countdown() {
    const add_button = document.getElementById('TMR-timer-add-button');
    const TIMERS_DISPLAY = document.getElementById('TMR-timer-display');
    const TMR_BODY = document.getElementById('TMR-body');

    const TIMER_MAP = new Map();

    add_button.onclick = function() {
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

        const timer_display_countdown = document.createElement('div');
        timer_display_countdown.innerHTML = '00:00:00';
        timer_display_countdown.id = `TMR-timer-countdown-${timer_id}`;
        timer_display_countdown.className = 'TMR-timer-countdown';

        const utility_div = document.createElement('div');
        utility_div.className = 'TMR-timer-utility';

        const start_button = document.createElement('button');
        start_button.id = `TMR-timer-start-button-${timer_id}`;
        start_button.className = `fas fa-play TMR-timer-start-button`;

        const reset_button = document.createElement('button');
        reset_button.id = `TMR-timer-reset-button-${timer_id}`;
        reset_button.className = `fas fa-undo TMR-timer-reset-button`;

        const remove_button = document.createElement('button');
        remove_button.id = `TMR-timer-remove-button-${timer_id}`;
        remove_button.className = `fas fa-times TMR-timer-remove-button`;
        remove_button.addEventListener("click", (event) => {
            removeTimer(`TMR-timer-container-${timer_id}`, timer_id);
        })

        timer_div.appendChild(timer_display_label);

        utility_div.appendChild(timer_display_countdown);
        utility_div.appendChild(start_button);
        utility_div.appendChild(reset_button);
        utility_div.appendChild(remove_button);

        timer_div.appendChild(utility_div);
        TIMERS_DISPLAY.appendChild(timer_div);
        TMR_BODY.style.maxHeight = 46 + (TIMER_MAP.size + 1)*100 + 'px';
        TIMER_MAP.set(timer_id, new Timer(0,0,0, timer_id));
    }

    function removeTimer(container_id, timer_id) {
        TIMERS_DISPLAY.removeChild(document.getElementById(container_id));
        TIMER_MAP.delete(timer_id);
        TMR_BODY.style.maxHeight = 46 + (TIMER_MAP.size)*100 + 'px';
    }
}

countdown();