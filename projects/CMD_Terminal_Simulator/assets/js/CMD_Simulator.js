function START_WINDOW_CMD() {
    const CMD_CONSOLE = document.getElementById("cmd-body");
    let DIR = 'C:'                   // Current directory
    let THE_PROMPT = `${DIR}\\>`     // The first part of every COMMAND line
    let USER = 'vuila9';
    let COMMAND = '';                // To store user input
    let CURSOR_POS = 0;    // track where the cursor is

    // Set initial prompt
    CMD_CONSOLE.innerHTML += '<span></span>';
    CMD_CONSOLE.lastChild.innerText += `${THE_PROMPT}`;

    appendCursor('last')

    // Focus on div to capture keypresses
    CMD_CONSOLE.focus();

    // Handle keypresses
    CMD_CONSOLE.addEventListener('keydown', (event) => {
        let arrow_keys = ['ArrowLeft', 'ArrowRight'];
        removeCursor();

        if (event.key === 'Enter') {
            // Extract the user input
            const userInput = COMMAND.trim();
            console.log("User Input:", userInput);  // Do something with the input

            // THIS IS WHERE YOU DO YOUR COMMAND HANDLER
            command_handler(userInput);

            // Append the user input and move to the next line
            CMD_CONSOLE.innerHTML += `<br><span>${THE_PROMPT}</span>`;

            // Clear the current command
            COMMAND = '';  
            CURSOR_POS = 0;
            event.preventDefault(); // Prevent default "Enter" behavior

            // Scroll to the bottom of the div
            CMD_CONSOLE.scrollTop = CMD_CONSOLE.scrollHeight;  // This ensures the latest line is always visible
        } 
        else if (event.key === 'Backspace') { // Handle backspace
            let flag = true;
            if (COMMAND.length <= 0 || CURSOR_POS <= 0)
                flag = false;
            
            if (flag) {
                COMMAND = COMMAND.slice(0, CURSOR_POS-1) +  COMMAND.slice(CURSOR_POS);
                CURSOR_POS--;
                CURSOR_POS = (CURSOR_POS <= 0) ? 0 : CURSOR_POS;
            }
        }
        else if (event.key === 'Delete') { // Handle backspace
            let flag = true;
            if (COMMAND.length <= 0 )
                flag = false;
            
            if (flag) {
                COMMAND = COMMAND.slice(0, CURSOR_POS) +  COMMAND.slice(CURSOR_POS+1);
                CURSOR_POS = (CURSOR_POS <= 0) ? 0 : CURSOR_POS;
            }
        }
        else if (event.key === 'Tab') { // will need to come back to this eventually
            event.preventDefault(); // Prevent the default action (scrolling)
        }
        else if (event.key === 'ArrowUp') {
            event.preventDefault(); // Prevent the default action (scrolling up)
        }
        else if (event.key === 'ArrowDown') {
            event.preventDefault(); // Prevent the default action (scrolling down)
        }
        else if (event.key === 'ArrowLeft') {
            CURSOR_POS --;
            CURSOR_POS = (CURSOR_POS < 0) ? 0 : CURSOR_POS;
            if (CURSOR_POS >= 0)
                appendCursor('middle');
        }
        else if (event.key === 'ArrowRight') {
            CURSOR_POS ++;
            if (CURSOR_POS < COMMAND.length) 
                appendCursor('middle');
            else {
                CURSOR_POS = COMMAND.length;
                appendCursor('last');
            }
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
        if (!arrow_keys.includes(event.key)) { // Update the current input line
            const inputLine = CMD_CONSOLE.querySelectorAll("span");
            inputLine[inputLine.length - 1].innerText = `${THE_PROMPT}${COMMAND}`;
            if (CURSOR_POS == COMMAND.length)
                appendCursor('last');
            else
                appendCursor('middle');
        }
    });

    function appendCursor(pos) {
        const cmd_cursor = document.createElement('span');
        cmd_cursor.id = 'cmd-cursor';
        cmd_cursor.textContent = '_'; // Cursor character
        if (pos == 'last')
            CMD_CONSOLE.appendChild(cmd_cursor);
        else if (pos == 'middle') {
            console.log(12)
            const inputLine = CMD_CONSOLE.querySelectorAll("span");
            inputLine[inputLine.length - 1].innerHTML = `${THE_PROMPT}${COMMAND.slice(0, CURSOR_POS)}`;
            inputLine[inputLine.length - 1].innerHTML += `<u id="cmd-cursor-select">${COMMAND[CURSOR_POS]}</u>`;
            inputLine[inputLine.length - 1].innerHTML += `${COMMAND.slice(CURSOR_POS+1)}`;
        }
    }

    function removeCursor() {
        document.getElementById('cmd-cursor')?.remove();
        const cmd_cursor_select = document.getElementById('cmd-cursor-select');
        if (cmd_cursor_select) {
            CMD_CONSOLE.lastChild.innerHTML = `${THE_PROMPT}${COMMAND}`
            cmd_cursor_select.remove();
        }
    }

    function command_handler(command) {
        switch (command){
            case '':
                break;

            case 'cls':
                CMD_CONSOLE.innerHTML = '';
                break;
            case 'whoami':
                CMD_CONSOLE.innerHTML += `<br><span>${USER}</span><br>`;
                break;
            default:
                CMD_CONSOLE.innerHTML += `<br><span>'${command.split(" ")[0]}' is not recognized as an internal or external command,</span>`;
                CMD_CONSOLE.innerHTML += `<br><span>operable program or batch file.</span><br>`;
                break;
        }
    }
}
