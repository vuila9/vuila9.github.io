function START_UBUNTU_TERMINAL() {
    const TERMINAL_CONSOLE = document.getElementById("terminal-body");
    let USER = 'vuila9';
    let DIR = `/home/${USER}`; // pwd
    let HOME_DIR_LENGTH = `/home/${USER}`.length;
    let DOMAIN = 'github.io';
    let THE_PROMPT = `${USER}@${DOMAIN}:~$`; // need to make a function to assign this automatically
    let COMMAND = '';
    let CURSOR_POS = 0;    // track where the cursor is

    addTitleBar();
    addThePrompt();
    appendCursor();

    TERMINAL_CONSOLE.focus();

    TERMINAL_CONSOLE.addEventListener('keydown', (event) => {
        let arrow_keys = ['ArrowLeft', 'ArrowRight'];
        removeCursor();
        if (event.key === 'Enter') {
            // Extract the user input
            const userInput = COMMAND.trim();
            console.log("User Input:", userInput);  // Do something with the input

            // THIS IS WHERE YOU DO YOUR COMMAND HANDLER
            command_handler(userInput);

            // Append the user input and move to the next line
            if (TERMINAL_CONSOLE.innerHTML.length > 0) 
                TERMINAL_CONSOLE.innerHTML += `<br>`;

            addThePrompt();

            // Clear the current command
            COMMAND = '';
            CURSOR_POS = 0;
            event.preventDefault(); // Prevent default "Enter" behavior

            // Scroll to the bottom of the div
            TERMINAL_CONSOLE.scrollTop = TERMINAL_CONSOLE.scrollHeight;  // This ensures the latest line is always visible
        } 
        else if (event.key === 'Backspace') {
            // Handle backspace
            if (COMMAND.length > 0) {
            COMMAND = COMMAND.slice(0, -1);
            }
        } 
        else if (event.key === 'Tab') { // will need to come back to this eventually
            event.preventDefault(); // Prevent the default action (switch focus field)
        }
        else if (event.key === 'ArrowUp') {
            event.preventDefault(); // Prevent the default action (scrolling up)
        }
        else if (event.key === 'ArrowDown') {
            event.preventDefault(); // Prevent the default action (scrolling down)
        }
        else if (event.key === 'ArrowLeft') {
            CURSOR_POS --;
            if (CURSOR_POS <= 0)
                CURSOR_POS = 0;
        }
        else if (event.key === 'ArrowRight') {
            CURSOR_POS ++;
            if (CURSOR_POS > COMMAND.length)
                CURSOR_POS = COMMAND.length;
        }
        else if (event.key.length === 1) {
            // Capture typed characters
            if (CURSOR_POS == COMMAND.length){
                COMMAND += event.key;
            }
            else {
                COMMAND = COMMAND.slice(0, CURSOR_POS) + event.key + COMMAND.slice(CURSOR_POS);
            }
            CURSOR_POS ++;
        }

        if (!arrow_keys.includes(event.key) ) {
            // Update the current input line
            const inputLine = TERMINAL_CONSOLE.querySelectorAll("span");
            inputLine[inputLine.length - 1].innerText = `${COMMAND}`;
            appendCursor();
        }

    });

    function appendCursor() {
        const terminal_cursor = document.createElement('span');
        terminal_cursor.id = 'terminal-cursor';
        terminal_cursor.textContent = '█'; // Cursor character ▐▌
        TERMINAL_CONSOLE.appendChild(terminal_cursor);
        terminal_cursor.style.animation = '1.5s ease infinite alternate blink';
    }

    function removeCursor() {
        const terminal_cursor = document.getElementById('terminal-cursor');
        if (terminal_cursor === null)
            return;
        if (terminal_cursor.parentElement === TERMINAL_CONSOLE) {
            TERMINAL_CONSOLE.removeChild(terminal_cursor);
        }
    }

    function addThePrompt() {
        TERMINAL_CONSOLE.innerHTML += '<span style="color: #87d441; font-weight: bold"></span>';
        TERMINAL_CONSOLE.lastChild.innerHTML += `${USER}@${DOMAIN}`;
        TERMINAL_CONSOLE.innerHTML += '<span>:</span';

        TERMINAL_CONSOLE.innerHTML += '<span style="color: #6d85a9"></span>';
        TERMINAL_CONSOLE.lastChild.innerHTML += directoryPromptHandler();

        TERMINAL_CONSOLE.innerHTML += '<span></span>';
        TERMINAL_CONSOLE.lastChild.innerHTML += "$ ";
        TERMINAL_CONSOLE.innerHTML += '<span></span>';
    }

    function directoryPromptHandler() {
        if (DIR === `/home/${USER}`)
            return `~`
        else if (DIR.includes(`/home/${USER}`, 0))
            return `~${DIR.slice(HOME_DIR_LENGTH)}`;
        else
            return `${DIR}`;
    }

    function addTitleBar() {
        const terminal_bar = document.getElementById('terminal-bar');
        //terminal_bar.innerHTML += `${USER}@${DOMAIN}:` + directoryPromptHandler();
        terminal_bar.innerHTML += `<span style="position: absolute; left: 50%; transform: translateX(-50%); margin-top: 8px; font-weight: bold; font-size: 16.5px">${USER}@${DOMAIN}:` + directoryPromptHandler() + `</span>`;
    }

    function command_handler(command) {
        switch (command){
            case '':
                break;

            case 'clear':
                TERMINAL_CONSOLE.innerHTML = '';
                CURSOR_POS == 0;
                break;

            case 'pwd':
                TERMINAL_CONSOLE.innerHTML += `<br><span>${DIR}</span>`;
                break;

            case 'whoami':
                TERMINAL_CONSOLE.innerHTML += `<br><span>${USER}</span>`;
                break;

            default:
                TERMINAL_CONSOLE.innerHTML += `<br><span>${command.split(" ")[0]}: command not found</span>`;
                break;
        }
    }
}