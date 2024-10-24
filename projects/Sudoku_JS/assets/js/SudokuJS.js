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
    setButton('check', false);
    setButton('solve', false);
}

function submit() {
    const submit_popup = document.getElementById('submit-popup');
    const submit_body_popup = document.getElementsByClassName('body-popup')[0].lastElementChild;
    submit_body_popup.innerHTML = '';
    const [sudoku_board] = getSudokuBoard();
    const [solvable, msg] = solveSudoku(sudoku_board);

    setButton('submit', false);
    setButton('generate', false);

    if (solvable) {
        submit_body_popup.innerHTML += `<h2>Board Sumitted</h2>`;
        submit_body_popup.innerHTML += `<p>Board has been submitted!</p>`;
        setButton('solve', true);
        setButton('check', true);
    }
    else {
        submit_body_popup.innerHTML += `<h2>Board Not Sumitted</h2>`;
        submit_body_popup.innerHTML += `<p>Input board is ${msg}</p>`;
        setButton('solve', false);
        setButton('check', false);
    }
    const span = document.getElementsByClassName("close")[0];
    submit_popup.style.display = 'block';
    span.onclick = function() {
        submit_popup.style.display = "none";
    }
    window.onclick = function(event) {
        if (event.target == submit_popup) 
            submit_popup.style.display = "none";
    }
}

function check() {
    const check_popup = document.getElementById('check-popup');
    const check_body_popup = document.getElementsByClassName('body-popup')[1].lastElementChild;
    check_body_popup.innerHTML = '';
    const [sudoku_board] = getSudokuBoard(false);
    if (verifySudoku(sudoku_board)) {
        check_body_popup.innerHTML += `<h2>Congratulation</h2>`;
        check_body_popup.innerHTML += `<p>Your solution to this board is correct!</p>`;
        setButton('check', false);
        setButton('solve', false);
    }
    else {
        check_body_popup.innerHTML += `<h2>Unfortunately</h2>`;
        check_body_popup.innerHTML += `<p>Your solution to this board is either incorrect or incomplete.</p>`;
    }
    const span = document.getElementsByClassName("close")[1];
    check_popup.style.display = 'block';
    span.onclick = function() {
        check_popup.style.display = "none";
    }
    window.onclick = function(event) {
        if (event.target == check_popup) 
            check_popup.style.display = "none";
    }
}

function solve() {
    const sudoku_div = document.querySelectorAll('.grid-item input');
    const [sudoku_board, fixed_cells] = getSudokuBoard(false);
    const [solvable, msg] = solveSudoku(sudoku_board); // no other way but to recall this, could avoid doing this by using global variable
    if (!solvable) {
        const solve_popup = document.getElementById('solve-popup');
        const solve_body_popup = document.getElementsByClassName('body-popup')[2].lastElementChild;
        solve_body_popup.innerHTML  = '<h2>Error</h2>';
        solve_body_popup.innerHTML += `<p>Current state of the board is ${msg}</p>`;

        const span = document.getElementsByClassName("close")[2];
        solve_popup.style.display = 'block';
        span.onclick = function() {
            solve_popup.style.display = "none";
        }
        window.onclick = function(event) {
            if (event.target == solve_popup) 
                solve_popup.style.display = "none";
        }
        return;
    }
    let counter = -1;
    sudoku_div.forEach((cell) => {
        cell.disabled = true;
        if (fixed_cells.includes(++counter)) 
            return;
        cell.value = sudoku_board[Math.floor(counter / 9)][counter % 9];
    });

    setButton('solve', false);
    setButton('check', false);
}

function generate(mode=null) {
    const difficulty_popup = document.getElementById('difficulty-popup');
    if (!mode) {
        const span = document.getElementsByClassName("close")[3];
        difficulty_popup.style.display = 'block';
        span.onclick = function() {
            difficulty_popup.style.display = "none";
        }
        window.onclick = function(event) {
            if (event.target == difficulty_popup) 
                difficulty_popup.style.display = "none";
        }
    }
    else {
        difficulty_popup.style.display = "none";
        const sudoku_div = document.querySelectorAll('.grid-item input');

        let solvable = false;
        let sudoku_board;
        while (!solvable) {
            const temp = spawn(mode);
            sudoku_board = JSON.parse(JSON.stringify(temp));
            [solvable] = solveSudoku(temp);
        }
        let counter = -1;
        sudoku_div.forEach((cell) => {
            //counter++;
            if (sudoku_board[Math.floor(++counter / 9)][counter % 9] == 0) 
                return;
            cell.value = sudoku_board[Math.floor(counter / 9)][counter % 9];
            cell.disabled = true;
            cell.style.background = 'lightblue';
        });
        setButton('generate', false);
        setButton('submit', false);
        setButton('solve', true);
        setButton('check', true);
    }
}

function reset() {
    const sudoku_div = document.querySelectorAll('.grid-item input');
    sudoku_div.forEach((cell) => {
        cell.value = '';
        cell.disabled = false;
        cell.style.background = 'white';
    });
    
    setButton('solve', false);
    setButton('submit', true);
    setButton('check', false);
    setButton('generate', true);
}

function rules() {
    const rules_popup = document.getElementById('rules-popup');
    const span = document.getElementsByClassName("close")[4];
    rules_popup.style.display = 'block';
    span.onclick = function() {
        rules_popup.style.display = "none";
    }
    window.onclick = function(event) {
        if (event.target == rules_popup) 
            rules_popup.style.display = "none";
    }
}