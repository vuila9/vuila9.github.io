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
const monthsDropdown = document.getElementById('CDT-select-month');
months.forEach((month, index) => {
    const option = document.createElement('option');
    option.value = index;
    option.textContent = month.name;
    monthsDropdown.appendChild(option);
});

// Populate the days dropdown dynamically based on the month selected
const daysDropdown = document.getElementById('CDT-select-day');
function populateDays(monthIndex) {
    // Get the number of days in the selected month
    let daysInMonth = months[monthIndex].days;

    // Clear any existing options in the days dropdown
    daysDropdown.innerHTML = '';

    // Populate the days dropdown
    for (let i = 1; i <= daysInMonth; i++) {
        const option = document.createElement('option');
        option.value = i;
        option.textContent = i;
        daysDropdown.appendChild(option);
    }
}

// Initially populate days based on the first month (January)
populateDays(0);

// Add event listener to update the days when the month changes
monthsDropdown.addEventListener('change', function () {
    populateDays(this.value);  // this.value is the selected month index
});

document.getElementById("CDT-button-submit").onclick = function() {
    var day = document.getElementById("CDT-select-day").value;
    var month = document.getElementById("CDT-select-month").value;
    var year = document.getElementById("CDT-input-year").value;

    console.log(`Day ${day} Month ${month} Year ${year}`);
}
