function init() {
    // JavaScript to dynamically generate 9x9 grid with restricted input fields
    const gridContainer = document.getElementById('grid-container');

    // Function to handle input restrictions
    function restrictInput(event) {
        const input = event.target;
        const value = input.value;

        // Allow only digits (0-9) and limit to 1 character
        if (/\D/.test(value) || value.length > 1) {
            input.value = value.slice(0, 1).replace(/\D/g, '');
        }
    }

    // Generate 9x9 grid
    for (let i = 0; i < 81; i++) {
        const gridItem = document.createElement('div');
        gridItem.classList.add('grid-item');

        const input = document.createElement('input');
        input.type = 'text';
        input.maxLength = 1; // Allow only one character input
        input.value = ''; // Start with empty input

        // Add input event listener to restrict input to 0-9
        input.addEventListener('input', restrictInput);

        gridItem.appendChild(input);
        gridContainer.appendChild(gridItem);
    }
}

window.onload = function() {
    init();
}