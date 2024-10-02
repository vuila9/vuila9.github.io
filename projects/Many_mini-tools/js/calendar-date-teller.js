const months = [
    { name: 'January', days: 31 },
    { name: 'February', days: 29 }, // Always 29 days
    { name: 'March', days: 31 },
    { name: 'April', days: 30 },
    { name: 'May', days: 31 },
    { name: 'June', days: 30 },
    { name: 'July', days: 31 },
    { name: 'August', days: 31 },
    { name: 'September', days: 30 },
    { name: 'October', days: 31 },
    { name: 'November', days: 30 },
    { name: 'December', days: 31 }
];

// Populate the months dropdown
const monthsSelect = document.getElementById('CDT-select-month');
months.forEach((month, index) => {
    const option = document.createElement('option');
    option.value = index;
    option.textContent = month.name;
    monthsSelect.appendChild(option);
});

const monthsSelect_hidden = document.getElementById('CDT-select-month-hidden');
months.forEach((month, index) => {
    const option = document.createElement('option');
    option.value = index;
    option.textContent = month.name;
    monthsSelect_hidden.appendChild(option);
});

// Populate the days dropdown dynamically based on the month selected
const daysSelect = document.getElementById('CDT-select-day');

function populateDays(monthIndex) {
    // Get the number of days in the selected month
    let daysInMonth = months[monthIndex].days;

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
function populateDays_hidden(monthIndex) {
    // Get the number of days in the selected month
    let daysInMonth = months[monthIndex].days;

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
populateDays(0);
populateDays_hidden(0);

// Add event listener to update the days when the month changes
monthsSelect.addEventListener('change', function () {
    populateDays(this.value);  // this.value is the selected month index
});

monthsSelect_hidden.addEventListener('change', function () {
    populateDays_hidden(this.value);  // this.value is the selected month index
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

function daysGap(day1, day2) {
    console.log(`day1 is ${day1}`);
    console.log(`day2 is ${day2}`);

    return 0;
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

    switch (promptSelect.value) {
        case "current-days-gap":
            
            console.log(`${promptSelect.value}`);
            var [month_now, day_now, year_now] = formattedDate.split(' ');
            day_now = day_now.replace(',', '');
            let gap = daysGap([month_now, day_now, year_now], [months[month_input].name, day_input, year_input.value]);
            console.log(`The gap is ${gap}`);
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
