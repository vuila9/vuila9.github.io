const SUDOKU_BOARD = [];

function init() {
    // JavaScript to dynamically generate 9x9 grid with restricted input fields
    const gridContainer = document.getElementById('sudoku-board');

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
    setButtonTo('check', false);
    setButtonTo('solve', false);
}

function submit() {
    console.log('Submit button was clicked');
    const sudoku_board = getSudokuBoard();

    setButtonTo('submit', false);
    setButtonTo('generate', false);

    if (solvable()) {
        console.log('Board has been submitted');
        setButtonTo('solve', true);
        setButtonTo('check', true);
    }
    else {
        console.log('Board not subbmitted');
        setButtonTo('solve', false);
        setButtonTo('check', false);
    }

    // Output the collected values (e.g., log to the console)
    console.log(sudoku_board);
    
}

function check() {
    const sudoku_board = getSudokuBoard();
    if (verifySudoku(sudoku_board)) {
        console.log('Your solution to this board is correct!');
        setButtonTo('check', false);
        setButtonTo('solve', false);
    }
    else
        console.log('Your solution to this board is either incorrect or incomplete.');
}

function reset() {
    // # This function will reset the whole board, change all buttons' state to their original state
    //     for row in range(9):
    //         for col in range(9):
    //             self.grid[row][col].config(state='normal')
    //             self.grid[row][col].delete(0, tk.END)
    //             self.grid[row][col].config(bg='white')

    //     self.sudoku_board = []
    //     self.fixed_cells = set()
    //     self.solvable = False
    //     self.solve_button['state'] = 'disable'
    //     self.submit_button['state'] = 'active'
    //     self.check_button['state'] = 'disable'
    //     self.generate_button['state'] = 'active'
    
    setButtonTo('solve', false);
    setButtonTo('submit', true);
    setButtonTo('check', false);
    setButtonTo('generate', true);
}

