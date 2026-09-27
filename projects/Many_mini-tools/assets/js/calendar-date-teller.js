function Calendar_date_teller() {
    const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June',
                         'July', 'August', 'September', 'October', 'November', 'December'];
    // Days per month in a common year. The Day dropdown still offers Feb 29 for any
    // year; verify_date() rejects it when the year isn't a leap year.
    const MONTH_DAYS = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    // Days in a common year before each month starts: [0, 31, 59, 90, ...]
    const DAYS_BEFORE_MONTH = MONTH_DAYS.map((_, m) => MONTH_DAYS.slice(0, m).reduce((a, b) => a + b, 0));

    const DAY_IN_WEEK = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    // January 1 of year 1 (Gregorian calendar extended backwards) was a Monday
    const WEEKDAY_OF_DAY_ZERO = 1;
    const MAX_YEAR_DIGITS = 9;

    const CDT_BODY = document.getElementById('CDT-body');

    // ===== Date math: every date becomes a "day number" =====
    // Day number = days since January 1 of year 1 (that date is day 0). Once two dates
    // are day numbers, the gap is a subtraction and the weekday is a remainder,
    // so any year up to 9 digits is answered instantly with no loops.

    function is_leap_year(year) {
        return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
    }

    // Leap years from year 1 through `year`: every 4th year, minus every 100th, plus every 400th
    function leap_years_through(year) {
        return Math.floor(year / 4) - Math.floor(year / 100) + Math.floor(year / 400);
    }

    // year: 1+, month: 0-11, day: 1-31
    function day_number(year, month, day) {
        const days_before_year = 365 * (year - 1) + leap_years_through(year - 1);
        const leap_day = month > 1 && is_leap_year(year) ? 1 : 0; // Feb 29 already passed this year
        return days_before_year + DAYS_BEFORE_MONTH[month] + leap_day + (day - 1);
    }

    // Days between two dates, counting both the start and the end date
    function days_gap(date1, date2) {
        return Math.abs(day_number(...date1) - day_number(...date2)) + 1;
    }

    function day_of_week(date) {
        return DAY_IN_WEEK[(day_number(...date) + WEEKDAY_OF_DAY_ZERO) % 7];
    }

    // ===== Inputs =====

    // Month and day dropdowns (the "from" row and the hidden "to" row share this)
    function fill_months(select) {
        MONTH_NAMES.forEach((name, index) => select.add(new Option(name, index)));
    }

    function fill_days(select, monthIndex) {
        const days = monthIndex === 1 ? 29 : MONTH_DAYS[monthIndex];
        const selected = Math.min(Number(select.value) || 1, days); // keep the chosen day if it still exists
        select.replaceChildren(...Array.from({ length: days }, (_, i) => new Option(i + 1, i + 1)));
        select.value = selected;
    }

    // Year fields accept digits only (max 9): strip anything else as it's typed or pasted,
    // keeping the caret where the user left it. Not done with maxlength, which would cut
    // a paste like "year 2024" before filtering.
    function digits_only(event) {
        const input = event.target;
        const cleaned = input.value.replace(/\D/g, '').slice(0, MAX_YEAR_DIGITS);
        if (cleaned === input.value) return;
        const caret = Math.max(input.selectionStart - (input.value.length - cleaned.length), 0);
        input.value = cleaned;
        input.setSelectionRange(caret, caret);
    }

    // Wire up one Month / Day / Year row; returns a reader for its current date
    function setup_date_row(suffix) {
        const monthSelect = document.getElementById('CDT-select-month' + suffix);
        const daySelect = document.getElementById('CDT-select-day' + suffix);
        const yearInput = document.getElementById('CDT-input-year' + suffix);

        fill_months(monthSelect);
        fill_days(daySelect, 0);
        monthSelect.addEventListener('change', () => fill_days(daySelect, Number(monthSelect.value)));
        yearInput.addEventListener('input', digits_only);

        // Empty year defaults to the current year (and shows it in the field)
        return function read_date(currentYear) {
            if (!yearInput.value) yearInput.value = currentYear;
            return [Number(yearInput.value), Number(monthSelect.value), Number(daySelect.value)];
        };
    }

    const read_from_date = setup_date_row('');
    const read_to_date = setup_date_row('-hidden');

    // Returns an error message, or null if the date is valid
    function verify_date([year, month, day]) {
        if (year < 1)
            return `The input year is less than 1 (BC year is not supported).`;
        if (String(year).length > MAX_YEAR_DIGITS)
            return `The input year is too large. Only support up to ${MAX_YEAR_DIGITS} digits.`;
        if (month === 1 && day === 29 && !is_leap_year(year))
            return `The input year is not a leap year, so February does not have 29 days.`;
        return null;
    }

    // ===== Question selector: "from when to then" needs a second date row =====
    const promptSelect = document.getElementById('CDT-select-prompt');
    const hiddenPrompt_block = document.getElementById("CDT-text-hiddenPrompt");
    promptSelect.addEventListener('change', function () {
        if (promptSelect.value === "custom-days-gap") {
            TOGGLE_CONTENT("CDT-text-hiddenPrompt"); // from `root/assets/js/project_global_function.js`
            PRINT_TO_HTML("CDT-text-result", `&nbsp;`);
            // Grow the outer panel right away by the second date row's height so it isn't clipped
            // while it slides open (the row's height depends on screen width, so measure it)
            CDT_BODY.style.maxHeight = (CDT_BODY.scrollHeight + hiddenPrompt_block.scrollHeight) + 'px';
        }
        else if (hiddenPrompt_block.classList.contains("active")) {
            TOGGLE_CONTENT("CDT-text-hiddenPrompt");
        }
    });

    // Once the second date row finishes opening/closing, fit the outer panel to its content
    hiddenPrompt_block.addEventListener('transitionend', () => REFIT_CONTENT('CDT-body'));
    window.addEventListener('resize', () => REFIT_CONTENT('CDT-body'));

    // ===== Submit =====

    // Returns the text to show for the selected question
    function CDT_answer() {
        // The only built-in date call: reading today's date
        const now = new Date();
        const today = [now.getFullYear(), now.getMonth(), now.getDate()];

        const from = read_from_date(today[0]);
        const fromError = verify_date(from);
        if (fromError) return fromError;

        switch (promptSelect.value) {
            case "current-days-gap":
                return `The gap is ${days_gap(today, from).toLocaleString()} day(s) from today.`;

            case "custom-days-gap": {
                const to = read_to_date(today[0]);
                const toError = verify_date(to);
                if (toError) return toError;
                return `The gap is ${days_gap(from, to).toLocaleString()} day(s)`;
            }

            case "what-date-week": {
                const [year, month, day] = from;
                return `It's ${day_of_week(from)} in year ${year}, ${MONTH_NAMES[month]} ${day}`;
            }
        }
    }

    // Results can wrap onto extra lines on narrow screens, so refit the panel after each one
    document.getElementById("CDT-button-submit").onclick = function() {
        PRINT_TO_HTML("CDT-text-result", CDT_answer());
        REFIT_CONTENT('CDT-body');
    };

    document.getElementById('CDT-note').title = `This tool was developed using manually built functions, without utilizing any built-in date manipulation functions, except for one to obtain the current date. The result will include the ending date.`;
}

Calendar_date_teller();
