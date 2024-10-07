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

    appendCursor()

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
            event.preventDefault(); // Prevent default "Enter" behavior

            // Scroll to the bottom of the div
            CMD_CONSOLE.scrollTop = CMD_CONSOLE.scrollHeight;  // This ensures the latest line is always visible
        } 
        else if (event.key === 'Backspace') {
            // Handle backspace
            if (COMMAND.length <= 0 || CURSOR_POS <= 0)
                return;
            
            COMMAND = COMMAND.slice(0, CURSOR_POS-1) +  COMMAND.slice(CURSOR_POS);
            CURSOR_POS--;
            if (CURSOR_POS <= 0) 
                CURSOR_POS = 0;
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
            if (CURSOR_POS <= 0)
                CURSOR_POS = 0;
        }
        else if (event.key === 'ArrowRight') {
            CURSOR_POS ++;
            if (CURSOR_POS > COMMAND.length)
                CURSOR_POS = COMMAND.length;
            if (CURSOR_POS == COMMAND.length)
                appendCursor();
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
        if (!arrow_keys.includes(event.key)) {
            // Update the current input line
            const inputLine = CMD_CONSOLE.querySelectorAll("span");
            inputLine[inputLine.length - 1].innerText = `${THE_PROMPT}${COMMAND}`;
            if (CURSOR_POS == COMMAND.length)
                appendCursor();
        }
    });

    function appendCursor() {
        const cmd_cursor = document.createElement('span');
        cmd_cursor.id = 'cmd-cursor';
        cmd_cursor.textContent = '_'; // Cursor character
        CMD_CONSOLE.appendChild(cmd_cursor);
        cmd_cursor.style.animation = 'blink 1s step-end infinite';
    }

    function removeCursor() {
        const cmd_cursor = document.getElementById('cmd-cursor');
        if (cmd_cursor === null)
            return;
        if (cmd_cursor.parentElement === CMD_CONSOLE) {
            CMD_CONSOLE.removeChild(cmd_cursor);
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
