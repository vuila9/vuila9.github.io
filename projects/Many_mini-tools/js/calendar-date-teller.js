const MONTHS = [
    { name: 'January'  , days: 31 },
    { name: 'February' , days: 29 }, // Always 29 days
    { name: 'March'    , days: 31 },
    { name: 'April'    , days: 30 },
    { name: 'May'      , days: 31 },
    { name: 'June'     , days: 30 },
    { name: 'July'     , days: 31 },
    { name: 'August'   , days: 31 },
    { name: 'September', days: 30 },
    { name: 'October'  , days: 31 },
    { name: 'November' , days: 30 },
    { name: 'December' , days: 31 }
];
const MONTHS_ORDER = { 
    'January'  : 0,
    'February' : 1,
    'March'    : 2,
    'April'    : 3,
    'May'      : 4,
    'June'     : 5,
    'July'     : 6,
    'August'   : 7,
    'September': 8,
    'October'  : 9, 
    'November' : 10,
    'December' : 11
};

const DAY_IN_WEEK = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

// Populate the months dropdown
const monthsSelect = document.getElementById('CDT-select-month');
MONTHS.forEach((month, index) => {
    const option = document.createElement('option');
    option.value = index;
    option.textContent = month.name;
    monthsSelect.appendChild(option);
});

const monthsSelect_hidden = document.getElementById('CDT-select-month-hidden');
MONTHS.forEach((month, index) => {
    const option = document.createElement('option');
    option.value = index;
    option.textContent = month.name;
    monthsSelect_hidden.appendChild(option);
});

// Populate the days dropdown dynamically based on the month selected
const daysSelect = document.getElementById('CDT-select-day');

function populate_days(monthIndex) {
    // Get the number of days in the selected month
    let daysInMonth = MONTHS[monthIndex].days;

    // Clear any existing options in the days dropdown
    daysSelect.innerHTML = '';

    // Populate the days dropdown
    for (let i = 1; i <= daysInMonth; i++) {
        const option = document.createElement('option');
        option.value = i;
        option.textContent = i;
        daysSelect.appendChild(option);
    }
}

const daysSelect_hidden = document.getElementById('CDT-select-day-hidden');
function populate_days_hidden(monthIndex) {
    // Get the number of days in the selected month
    let daysInMonth = MONTHS[monthIndex].days;

    // Clear any existing options in the days dropdown
    daysSelect_hidden.innerHTML = '';

    // Populate the days dropdown
    for (let i = 1; i <= daysInMonth; i++) {
        const option = document.createElement('option');
        option.value = i;
        option.textContent = i;
        daysSelect_hidden.appendChild(option);
    }
}

// Initially populate days based on the first month (January)
populate_days(0);
populate_days_hidden(0);

// Add event listener to update the days when the month changes
monthsSelect.addEventListener('change', function () {
    populate_days(this.value);  // this.value is the selected month index
});

monthsSelect_hidden.addEventListener('change', function () {
    populate_days_hidden(this.value);  // this.value is the selected month index
});

const promptSelect = document.getElementById('CDT-select-prompt');
promptSelect.addEventListener('change', function () {
    const selectedPrompt = promptSelect.value;
    const hiddenPrompt_block = document.getElementById("CDT-text-hiddenPrompt");
    if (selectedPrompt == "custom-days-gap") {
        toggleContent("CDT-text-hiddenPrompt"); // from `root/assets/js/project_page_layout.js`
        document.getElementById("CDT-text-result").innerHTML = `&nbsp;`;
    }
    else {
        console.log(`you picked ${selectedPrompt}`);
        if ((hiddenPrompt_block.classList.contains("active"))) 
            toggleContent("CDT-text-hiddenPrompt");
    }
});

function dayth_in_year(year, month, day) {
    var total_days_current = 0;
    for (let i = 0; i < MONTHS.length; i++) {
        if (month == MONTHS[i].name)
            break;
        if (!is_leap_year(year) && i == 1) {// Feb, by default, has 29 days (dont ask me why), we subtract -1 if it's a leap year AND it's later than Feb
            console.log(`when did this happen ${year} ${month} ${day}`);
            total_days_current -= 1;
        }
        total_days_current += MONTHS[i].days;
    }
    
    total_days_current += Number(day);
    return total_days_current; 
}

function is_later(day1, day2) { // ([year1, month1, day1], [year2, month2, day2])

    if (day1[0] > day2[0]) // year
        return true;
    else if (day1[0] < day2[0]) // year
        return false;
    else if (MONTHS_ORDER[day1[1]] > MONTHS_ORDER[day2[1]]) // month
        return true;
    else if (MONTHS_ORDER[day1[1]] < MONTHS_ORDER[day2[1]]) // month
        return false;
    else if (day1[2] > day2[2]) // day
        return true;
    else
        return false;
};

function is_leap_year(year) {
    return (year % 4 == 0 && (year % 100 != 0 || year % 400 == 0));
}

function days_gap(day1, day2) { // (now, when)
    console.log(`is day1 (now) later than day2 (when): ${is_later(day1, day2)}`);
    if (day1[0] == day2[0]) { // same year
        let days_gap = dayth_in_year(day1[0], day1[1], day1[2]) - dayth_in_year(day2[0], day2[1], day2[2]);
        console.log(`How many days since the start of year to ${day1} ${dayth_in_year(day1[0], day1[1], day1[2])}`);
        console.log(`How many days since the start of year to ${day2} ${dayth_in_year(day2[0], day2[1], day2[2])}`);
        return Math.abs(days_gap) + 1; // +1 because we include the end date
    }
    else {
        let years_gap = Math.abs(Number(day1[0]) - Number(day2[0])) - 1; // -1 because we will do the calculation for the starting and ending year separately
        let total_days_gap = years_gap * 365;
        let starting_year = 0;
        let ending_year = 0;
        let days_passed_in_starting_year = 0;
        let days_passed_in_ending_year = 0;
        if (is_later(day1, day2)) { // (end, start)
            starting_year = Number(day2[0]);
            days_passed_in_starting_year = dayth_in_year(day2[0], day2[1], day2[2]);
            days_passed_in_ending_year = dayth_in_year(day1[0], day1[1], day1[2]);
        }
        else { // (start, end)
            starting_year = Number(day1[0]);
            days_passed_in_starting_year = dayth_in_year(day1[0], day1[1], day1[2]);
            days_passed_in_ending_year = dayth_in_year(day2[0], day2[1], day2[2]);
        }
        ending_year = starting_year + years_gap;
        for (let year = starting_year + 1; year < ending_year; year += 1) { // as mentioned above, we do calculations for starting year and ending year separately
            if (is_leap_year(year)) 
                total_days_gap +=1;
        }
        let days_left_in_starting_year = 0
        if (is_leap_year(starting_year)) 
            days_left_in_starting_year = 366 - days_passed_in_starting_year;
        else
            days_left_in_starting_year = 365 - days_passed_in_starting_year;
        
        return total_days_gap + days_left_in_starting_year + days_passed_in_ending_year + 1; // +1 because we include end date in the equation
    }
}

function verify_year_input(year, month, day){
    if (isNaN(year)) {
        document.getElementById("CDT-text-result").innerHTML = "The input year is not a number.";
        return false;
    }
    if (year < 1) {
        document.getElementById("CDT-text-result").innerHTML = "The input year is less than 1 (BC year is not supported).";
        return false;
    }
    if (year.length > 9) {
        document.getElementById("CDT-text-result").innerHTML = "The input year is is too large. Only support up to 9 digits.";
        return false;
    }
    if (!is_leap_year(year) && month == 1 && day == 29) {
        document.getElementById("CDT-text-result").innerHTML = "The input year is not a leap year, so February does not have 29 days.";
        return false;
    }
    return true;
}

document.getElementById("CDT-button-submit").onclick = function() {
    var month_input = document.getElementById("CDT-select-month").value;
    var day_input = document.getElementById("CDT-select-day").value;
    var year_input = document.getElementById("CDT-input-year");
    const date_now = new Date();
    const Date_options = { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
    };
    const formattedDate = date_now.toLocaleDateString('en-US', Date_options);

    if (!year_input.value) // if year is not input, assign default year as the current year
        year_input.value = formattedDate.slice(-4);

    document.getElementById("CDT-text-result").innerHTML = "&nbsp;"
    if (!verify_year_input(year_input.value, month_input, day_input))
        return;

    switch (promptSelect.value) {
        case "current-days-gap":
            console.log(`${promptSelect.value}`);
            var [month_now, day_now, year_now] = formattedDate.split(' ');
            day_now = day_now.replace(',', '');
            var current_days_gap = days_gap([year_now, month_now, day_now], [year_input.value, MONTHS[month_input].name, day_input]); //daysGap(now, when)
            console.log(`The gap is ${current_days_gap} day(s)`);
            document.getElementById("CDT-text-result").innerHTML = `The gap is ${current_days_gap.toLocaleString()} day(s) from today.`;
            break;

        case "custom-days-gap":
            console.log(`${promptSelect.value}`);
            var month_input_hidden = document.getElementById("CDT-select-month-hidden").value;
            var day_input_hidden = document.getElementById("CDT-select-day-hidden").value;
            var year_input_hidden = document.getElementById("CDT-input-year-hidden");
            document.getElementById("CDT-text-result").innerHTML = "&nbsp;"
            if (!year_input_hidden.value) // if year is not input, assign default year as the current year
                year_input_hidden.value = formattedDate.slice(-4);

            document.getElementById("CDT-text-result").innerHTML = "&nbsp;"
            if (!verify_year_input(year_input_hidden.value, month_input_hidden, day_input_hidden))
                return;

            console.log("hidden day, month, year: ", day_input_hidden, MONTHS[month_input_hidden].name, year_input_hidden.value);
            let custom_days_gap = days_gap([year_input.value, MONTHS[month_input].name, day_input], [year_input_hidden.value, MONTHS[month_input_hidden].name, day_input_hidden]); //daysGap(then, when)
            document.getElementById("CDT-text-result").innerHTML = `The gap is ${custom_days_gap.toLocaleString()} day(s)`;
            console.log(`The gap is ${custom_days_gap} day(s)`);
            break;

        case "what-date-week":
            console.log(`${promptSelect.value}`);
            var [month_now, day_now, year_now] = formattedDate.split(' ');
            day_now = day_now.replace(',', '');
            var current_days_gap = days_gap([year_now, month_now, day_now], [year_input.value, MONTHS[month_input].name, day_input]); //daysGap(now, when)
            console.log(`days gap ${current_days_gap}`);
            var dayth_in_week = (current_days_gap - 1 ) % 7; // -1 because god knows why
            if (is_later([year_now, month_now, day_now], [year_input.value, MONTHS[month_input].name, day_input])){
                var temp = (date_now.getDay() - dayth_in_week + 7) % 7;
                console.log(`It's ${DAY_IN_WEEK[temp]} in year ${year_input.value}, ${MONTHS[month_input].name} ${day_input}`);
            }
            else {
                var temp = ((date_now.getDay() + dayth_in_week) % 7)
                console.log(`It's ${DAY_IN_WEEK[temp]} in year ${year_input.value}, ${MONTHS[month_input].name} ${day_input}`);
            }
            break;
    }
}
