const CMD_CONSOLE = document.getElementById("cmd-body");
let DIR = 'C:'                   // Current directory
let THE_PROMPT = `${DIR}\\>`     // The first part of every COMMAND line
let COMMAND = '';                // To store user input

// Set initial prompt
CMD_CONSOLE.innerHTML = '<span></span>';
CMD_CONSOLE.querySelector('span').innerText = `${THE_PROMPT}`;
appendCmdCursor()

// Focus on div to capture keypresses
CMD_CONSOLE.focus();

// Handle keypresses
CMD_CONSOLE.addEventListener('keydown', (event) => {
    removeCmdCursor();
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
        if (COMMAND.length > 0) {
        COMMAND = COMMAND.slice(0, -1);
        }
    } 
    else if (event.key === 'Tab') { // will need to come back to this eventually
        event.preventDefault(); // Prevent the default action (scrolling)
    }
    else if (event.key.length === 1) {
        // Capture typed characters
        COMMAND += event.key;
    }
    // Update the current input line
    const inputLine = CMD_CONSOLE.querySelectorAll("span");
    inputLine[inputLine.length - 1].innerText = `${THE_PROMPT}${COMMAND}`;
    appendCmdCursor();
});

document.addEventListener('keydown', function(event) {
    if (event.code === 'Space') {
        event.preventDefault(); // Prevent the default action (scrolling)
    }
});

function appendCmdCursor(){
    const cmd_cursor = document.createElement('span');
    cmd_cursor.id = 'cmd-cursor';
    cmd_cursor.textContent = '_'; // Cursor character
    CMD_CONSOLE.appendChild(cmd_cursor);
    cmd_cursor.style.animation = 'blink 1s step-end infinite';
}

function removeCmdCursor(){
    const cmd_cursor = document.getElementById('cmd-cursor')
    if (cmd_cursor === null)
        return;
    if (cmd_cursor.parentElement === CMD_CONSOLE) {
        CMD_CONSOLE.removeChild(cmd_cursor);
    }
}

function command_handler(command){
    switch (command){
        case '':
            break;

        case 'cls':
            CMD_CONSOLE.innerHTML = '';
            break;
        
        default:
            CMD_CONSOLE.innerHTML += `<br><span>'${command.split(" ")[0]}' is not recognized as an internal or external command, operable program or batch file.</span>`;
            break;
    }
}
