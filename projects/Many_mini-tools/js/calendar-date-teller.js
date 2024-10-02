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
    if (selectedPrompt == "selected-days-gap") {
        console.log(`you picked ${selectedPrompt}`);
        toggleContent("CDT-text-hiddenPrompt"); // from `root/assets/js/project_page_layout.js`
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
        total_days_current += MONTHS[i].days;
    }
    if (year % 4 != 0) // Feb is by default having 29 days, so we subtract 1 day if it's not a leap year now.
        total_days_current -= 1;
    total_days_current += Number(day);
    return total_days_current;
}

function is_later(day1, day2) {
    const months_order = { 
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
    if (day1[0] > day2[0]) // year
        return true;
    else if (day1[0] < day2[0]) // year
        return false;
    else if (months_order[day1[1]] > months_order[day2[1]]) // month
        return true;
    else if (months_order[day1[1]] < months_order[day2[1]]) // month
        return false;
    else if (day1[2] > day2[2]) // day
        return true;
    else
        return false;
};

function days_gap(day1, day2) {
    console.log(`is day1 (now) later than day2 (when): ${is_later(day1, day2)}`);
    var days_gap = dayth_in_year(day1[0], day1[1], day1[2]) - dayth_in_year(day2[0], day2[1], day2[2]);
    if (day1[0] == day2[0]) { // same year
        console.log(`How many days since the start of year to ${day1} ${dayth_in_year(day1[0], day1[1], day1[2])}`);
        console.log(`How many days since the start of year to ${day2} ${dayth_in_year(day2[0], day2[1], day2[2])}`);
        return Math.abs(days_gap);
    }
    else {
        let years_gap = Math.abs(Number(day1[0]) - Number(day2[0]));
        let total_days_gap = years_gap * 365;
        let target_year = 0;
        if (is_later(day1, day2)) 
            target_year = Number(day2[0]);
        else
            target_year = Number(day1[0]);
        for (let i = target_year % 4; i < years_gap; i += 4) 
            total_days_gap +=1;
        return total_days_gap + days_gap;
    }
        
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
    if (year_input.value % 4 != 0 && month_input == 1 && day_input == 29) {
        document.getElementById("CDT-text-result").innerHTML = "The input year is not a leap year, so February does not have 29 days.";
        return;
    }

    switch (promptSelect.value) {
        case "current-days-gap":
            console.log(`${promptSelect.value}`);
            var [month_now, day_now, year_now] = formattedDate.split(' ');
            day_now = day_now.replace(',', '');
            let gap = days_gap([year_now, month_now, day_now], [year_input.value, MONTHS[month_input].name, day_input]); //daysGap(now, when)
            console.log(`The gap is ${gap} day(s)`);
            break;

        case "selected-days-gap":
            console.log(`${promptSelect.value}`);
            break;

        case "what-date":
            console.log(`${promptSelect.value}`);
            break;

        case "special":
            console.log(`${promptSelect.value}`);
            break;
    }
}
