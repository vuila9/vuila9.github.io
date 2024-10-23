class SolveState {
    constructor(boardCandidates, isFinalized) {
        this.boardCandidates = boardCandidates; // 2D array of sets (array of arrays of sets)
        this.isFinalized = isFinalized; // 2D array of booleans
    }

    clone() {
        // Deep copy of the boardCandidates (array of sets)
        const boardCandidates = this.boardCandidates.map(row => 
            row.map(candSet => new Set(candSet))
        );

        // Deep copy of isFinalized (array of booleans)
        const isFinalized = this.isFinalized.map(row => 
            row.map(fn => fn)
        );

        // Return a new instance of SolveState with copied data
        return new SolveState(boardCandidates, isFinalized);
    }
}

// Function to calculate the box index based on row and column
function getBoxIdx(row, col) {
    return 3 * Math.floor(row / 3) + Math.floor(col / 3);
}

// Function to initialize row, column, and box sets based on the initial board
function initGroupSets(board) {
    const rowSets = Array.from({ length: 9 }, () => new Set());
    const colSets = Array.from({ length: 9 }, () => new Set());
    const boxSets = Array.from({ length: 9 }, () => new Set());

    // Iterate over each cell of the 9x9 board
    for (let row = 0; row < 9; row++) {
        for (let col = 0; col < 9; col++) {
            const curCell = board[row][col];
            if (curCell === 0) {
                continue; // Skip empty cells
            }

            // Determine the group sets (row, column, and box) for the current cell
            for (let groupSet of [rowSets[row], colSets[col], boxSets[getBoxIdx(row, col)]]) {
                if (groupSet.has(curCell)) {
                    throw new Error("Invalid initial board");
                }
                groupSet.add(curCell);
            }
        }
    }

    // Return the initialized sets for rows, columns, and boxes
    return [rowSets, colSets, boxSets];
}

function initBoardCandidates(board, rowSets, colSets, boxSets) {
    // Initialize boardCandidates and isFinalized as 9x9 arrays
    const boardCandidates = Array.from({ length: 9 }, () => Array(9).fill(null));
    const isFinalized = Array.from({ length: 9 }, () => Array(9).fill(false));

    for (let row = 0; row < 9; row++) {
        for (let col = 0; col < 9; col++) {
            const curEntry = board[row][col];

            // If the cell is already defined (non-zero)
            if (curEntry !== 0) {
                boardCandidates[row][col] = new Set([curEntry]);
                isFinalized[row][col] = true;
            } else {
                // Get potential candidates if the cell is empty
                boardCandidates[row][col] = getCandidates([
                    rowSets[row],
                    colSets[col],
                    boxSets[getBoxIdx(row, col)]
                ]);
                isFinalized[row][col] = false; // Set to false even if there's only one candidate
            }
        }
    }
    return [boardCandidates, isFinalized];
}

function getCandidates(candSets) {
    // Create a set with numbers 1 through 9
    let candidates = new Set([...Array(9).keys()].map(x => x + 1));

    // Remove numbers that are in any of the candidate sets
    for (let candSet of candSets) {
        for (let num of candSet) {
            candidates.delete(num);
        }
    }
    return candidates;
}

function solve_final(state) {
    // Level 2 solve algorithm: 
    // apply the winnow algorithm to remove deterministic candidates. 
    // then, select the cell with the smallest number of remaining candidates.
    // Guess one of the candidates, then re-apply the solve algorithm. If the
    // guess is correct, the solve algorithm will find a correct solution and return it.
    // Return that solution up the chain.
    // If the guess is incorrect, change your guess and repeat until you find the correct
    // value.
    // Apply the winnow function to reduce candidates (assumed to be implemented elsewhere)
    const debug = false;

    // Apply the winnow function to reduce candidates (assumed to be implemented elsewhere)
    const [isValid, returnCode] = winnow(state);

    if (debug) {
        //console.log("winnow return: ", returnCode);
        // Optionally, you can implement a printBoard function for debugging
        // printBoard(state);
    }

    if (!isValid) {
        return null;
    }

    // Initialize variables to find the cell with the smallest number of candidates
    let minCandidateCell = null;
    let minCandidates = Infinity;
    let isFinalized = true;

    // Iterate over the 9x9 board
    for (let row = 0; row < 9; row++) {
        for (let col = 0; col < 9; col++) {
            if (state.isFinalized[row][col]) {
                console.assert(state.boardCandidates[row][col].size === 1, "Invalid finalized cell");
            } else {
                isFinalized = false;
                if (state.boardCandidates[row][col].size < minCandidates) {
                    minCandidates = state.boardCandidates[row][col].size;
                    minCandidateCell = [row, col];
                }
            }
        }
    }

    // If the board is completely finalized, return the current state
    if (isFinalized) {
        return state;
    }

    // Ensure that a cell with the minimum candidates was found
    console.assert(minCandidateCell !== null, "No candidate cell found");
    const [minCandRow, minCandCol] = minCandidateCell;

    // Iterate over each candidate value in the cell with the fewest candidates
    for (let candidateVal of state.boardCandidates[minCandRow][minCandCol]) {
        // Clone the state to create a new guess state
        const guessState = state.clone();
        guessState.boardCandidates[minCandRow][minCandCol] = new Set([candidateVal]);

        // Recursively attempt to solve with the new guess state
        const maybeSolvedState = solve_final(guessState);
        if (maybeSolvedState) {
            return maybeSolvedState;
        }
    }

    // If no solution was found, the board state is invalid
    return null;
}

function winnow(state) {
    // Simple solve algorithm:
    // Loop over the board and collect all non-finalized cells that have only
    // one candidate. Store them in a queue. 
    // While the queue is not empty, pop an entry off, finalize it, and 
    // remove it as a candidate for all squares in the same row, column, and box.
    // When removing, if any corresponding non-finalized cell has only one remaining
    // entry, add it to the queue. 
    // Once the queue is empty, check if everything is finalized. If not we'll need
    // to make some guesses... just throw for now and we can revisit.
    // Return True if the board remains in a valid state after winnowing, otherwise
    // return False. If this returns False, the winnowing process ends and the board
    // will be in an inconsistent state.
    const singleCandidateCells = [];

    // Collect cells with only one candidate
    for (let r = 0; r < 9; r++) {
        for (let c = 0; c < 9; c++) {
            if (!state.isFinalized[r][c] && state.boardCandidates[r][c].size === 1) {
                singleCandidateCells.push([r, c]);
            }
        }
    }

    // Process cells with a single candidate
    while (singleCandidateCells.length > 0) {
        const [curRow, curCol] = singleCandidateCells.pop();
        console.assert(state.boardCandidates[curRow][curCol].size === 1, "Cell must have exactly one candidate");
        const curVal = Array.from(state.boardCandidates[curRow][curCol])[0];

        // Mark the cell as finalized
        state.isFinalized[curRow][curCol] = true;

        // Remove curVal as a candidate in the same row
        for (let col = 0; col < 9; col++) {
            if (state.isFinalized[curRow][col]) continue;
            if (!maybeRemoveCandidateAndEnqueue(curVal, curRow, col, state, singleCandidateCells)) {
                return [false, 1];
            }
        }

        // Remove curVal as a candidate in the same column
        for (let row = 0; row < 9; row++) {
            if (state.isFinalized[row][curCol]) continue;
            if (!maybeRemoveCandidateAndEnqueue(curVal, row, curCol, state, singleCandidateCells)) {
                return [false, 2];
            }
        }

        // Remove curVal as a candidate in the same box
        const boxCoords = getBoxCoords(curRow, curCol);
        for (let [row, col] of boxCoords) {
            if (state.isFinalized[row][col]) continue;
            if (!maybeRemoveCandidateAndEnqueue(curVal, row, col, state, singleCandidateCells)) {
                return [false, 3];
            }
        }
    }

    return [true, 4];
}

function maybeRemoveCandidateAndEnqueue(curVal, row, col, state, singleCandidateCells) {
    /*
    Remove the current value from the candidates for the given cell, and append this cell to the single_candidates
    list if removing this value reduces the number of candidates to one.
    If removing this value reduces the number of candidates to zero, return False, as this means we've entered
    an invalid board state. Otherwise return True
    */
    const curCandidates = state.boardCandidates[row][col];

    // If curVal is a candidate, remove it
    if (curCandidates.has(curVal)) {
        curCandidates.delete(curVal);

        // If only one candidate is left, enqueue this cell
        if (curCandidates.size === 1) {
            singleCandidateCells.push([row, col]);
        } else if (curCandidates.size === 0) {
            // If no candidates are left, return false (invalid state)
            return false;
        }
    }
    return true;
}

function getBoxCoords(row, col) {
    const boxCoords = [];
    const baseRow = 3 * Math.floor(row / 3); // 0, 3, 6
    const baseCol = 3 * Math.floor(col / 3); // 0, 3, 6

    // Collect the coordinates of the 3x3 box
    for (let r = baseRow; r < baseRow + 3; r++) {
        for (let c = baseCol; c < baseCol + 3; c++) {
            boxCoords.push([r, c]);
        }
    }
    return boxCoords;
}

function solveSudoku(board) {
    let solvedState;
    try {
        // Initialize the solve state
        const [ rowSets, colSets, boxSets ] = initGroupSets(board);
        const [ boardCandidates, isFinalized ] = initBoardCandidates(board, rowSets, colSets, boxSets);
        const state = new SolveState(boardCandidates, isFinalized);

        // Solve
        solvedState = solve_final(state);
    } catch (error) {
        //console.log("Invalid board\n");
        return [false, "invalid"];
    }

    // Copy everything over to the original board and return
    for (let row = 0; row < 9; row++) {
        for (let col = 0; col < 9; col++) {
            try {
                if (solvedState.isFinalized[row][col] && solvedState.boardCandidates[row][col].size === 1) {
                    // If the board value is 0, fill it with the solved candidate
                    if (board[row][col] === 0) {
                        const entry = Array.from(solvedState.boardCandidates[row][col])[0];
                        board[row][col] = entry;
                    }
                } else {
                    throw new Error("Unsolvable sudoku");
                }
            } catch (error) {
                //console.log("Unsolvable sudoku\n");
                return [false, "unsolvable"];
            }
        }
    }
    return [true, ""];
}

function printSudoku(sudoku) {
    for (let row = 0; row < sudoku.length; row++) {
        if (row !== 0 && row % 3 === 0) 
            console.log("------+-------+------");
        let rowString = "";
        for (let col = 0; col < sudoku[row].length; col++) {
            if (col !== 0 && col % 3 === 0) 
                rowString += "| ";
            rowString += sudoku[row][col] + " ";
        }
        console.log(rowString.trim());
    }
}

function spawn(difficulty) {
    function isValid(sud, row, col, value) {
        // Check if the input value is acceptable according to Sudoku rules
        for (let i = 0; i < 9; i++) {
            if (sud[i][col] === value || sud[row][i] === value) {
                return false;
            }
            const blockRow = 3 * Math.floor(row / 3) + Math.floor(i / 3);
            const blockCol = 3 * Math.floor(col / 3) + (i % 3);
            if (sud[blockRow][blockCol] === value) {
                return false;
            }
        }
        return true;
    }

    // Initialize an empty 9x9 Sudoku board
    const sud = Array.from({ length: 9 }, () => Array(9).fill(0));
    let rate = 0;

    // Set the rate based on difficulty level
    switch (difficulty) {
        case "EXPERT":
            rate = 9;
            break;
        case "HARD":
            rate = 15;
            break;
        case "MEDIUM":
            rate = 21;
            break;
        case "EASY":
            rate = 30;
            break;
    }

    for (let row = 0; row < 9; row++) {
        for (let col = 0; col < 9; col++) {
            if (Math.random() * 100 < rate) {
                let val = Math.floor(Math.random() * 9) + 1; // Generate a random value from 1 to 9
                let counter = 0;

                while (counter < 9) {
                    if (isValid(sud, row, col, val)) {
                        sud[row][col] = val; // Place the valid value on the board
                        break;
                    }
                    val = (val % 9) + 1; // Increment value, wrapping around to 1
                    counter++;
                }
            }
        }
    }
    return sud;
}

function verifySudoku(sud) {
    // Helper function to verify if an array contains valid numbers
    function verifySet(arr) {
        const set = new Set(arr);
        // Remove 0s from the array
        arr = arr.filter(x => x !== 0);

        // Check if each number is within the range 1-9
        for (let num of arr) {
            if (num < 1 || num > 9) {
                //console.log("Input number out of range 1-9");
                return false;
            }
        }

        // Ensure no duplicates
        return arr.length === set.size;
    }

    // Verifying Rule 1:
    for (let row = 0; row < sud.length; row++) {
        if (sud[row].includes(0)) {
            //console.log("Incomplete board");
            return false;
        }
        if (!verifySet(sud[row])) {
            //console.log("Rule 1 not satisfied");
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
            //console.log("Rule 2 not satisfied");
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
            //console.log("Rule 3 not satisfied");
            return false;
        }
    }
    return true;
}

function getSudokuBoard(highlight=true) {
    const sudoku_div = document.querySelectorAll('.grid-item input');
    const sudoku_board = [];
    const fixed_cells = [];
    let counter = 0;
    sudoku_div.forEach((cell) => {
        if (counter % 9 == 0) 
            sudoku_board.push([]);

        if (cell.value === '' || cell.value == 0) 
            sudoku_board[sudoku_board.length - 1].push(0);
        else {
            sudoku_board[sudoku_board.length - 1].push(Number(cell.value));
            fixed_cells.push(counter);
            if (highlight) {     
                cell.disabled = true;
                cell.style.background = 'lightblue';
            }
        }
        counter++;
    });
    return [sudoku_board, fixed_cells];
}

function setButton(button, state) {
    document.getElementById(button).disabled = !state;
}