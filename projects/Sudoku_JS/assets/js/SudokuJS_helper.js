function verifySudoku(sud) {
    // Helper function to verify if an array contains valid numbers
    function verifySet(arr) {
        const set = new Set(arr);
        // Remove 0s from the array
        arr = arr.filter(x => x !== 0);

        // Check if each number is within the range 1-9
        for (let num of arr) {
            if (num < 1 || num > 9) {
                console.log("Input number out of range 1-9");
                return false;
            }
        }

        // Ensure no duplicates
        return arr.length === set.size;
    }

    // Verifying Rule 1:
    for (let row = 0; row < sud.length; row++) {
        if (sud[row].includes(0)) {
            console.log("Incomplete board");
            return false;
        }
        if (!verifySet(sud[row])) {
            console.log("Rule 1 not satisfied");
            return false;
        }
    }

    // Verifying Rule 2:
    for (let row = 0; row < sud.length; row++) {
        const coln = [];
        for (let col = 0; col < sud[row].length; col++) {
            coln.push(sud[col][row]);
        }
        if (!verifySet(coln)) {
            console.log("Rule 2 not satisfied");
            return false;
        }
    }

    // Verifying Rule 3:
    for (let row = 0; row < sud.length; row++) {
        const block = [];
        for (let col = 0; col < sud[row].length; col++) {
            block.push(sud[Math.floor(row / 3) * 3 + Math.floor(col / 3)][col % 3 + (row % 3) * 3]);
        }
        if (!verifySet(block)) {
            console.log("Rule 3 not satisfied");
            return false;
        }
    }
    return true;
}

function solvable(sud) {
    return 1;
}

function getSudokuBoard() {
    const sudoku_div = document.querySelectorAll('.grid-item input');
    const sudoku_board = [];
    let counter = 0;
    // Iterate over each input field in the grid
    sudoku_div.forEach((input) => {
        // If the input is empty, assign 0, otherwise use the input's value
        if (counter % 9 == 0) {
            sudoku_board.push([]);
        }
        const value = input.value === '' ? '0' : input.value;
        sudoku_board[sudoku_board.length - 1].push(value);
        counter++;
    });

    return sudoku_board;
}

function setButtonTo(button, state) {
    document.getElementById(button).disabled = !state;
}