function START_UBUNTU_TERMINAL() {
    const TERMINAL_CONSOLE = document.getElementById('terminal-body');
    const USERS = InitUser();     // Initialize some users
    const ROOT_DIR = InitFileSystem();
    let CURRENT_USER = USERS[1];  // default user, vuila9
    let DIR = `/home/${CURRENT_USER.getUsername()}`; // default current directory, pwd
    let HOME_DIR_LENGTH = `/home/${CURRENT_USER.getUsername()}`.length;
    let DOMAIN = 'github.io';
    let THE_PROMPT = `${CURRENT_USER.getUsername()}@${DOMAIN}:~$`; // need to make a function to assign this automatically
    let COMMAND = '';
    let CURSOR_POS = 0;    // track where the cursor is

    addTitleBar();
    addThePrompt();
    appendCursor('last');

    TERMINAL_CONSOLE.focus();

    TERMINAL_CONSOLE.addEventListener('keydown', (event) => {
        let arrow_keys = ['ArrowLeft', 'ArrowRight'];
        removeCursor();

        if (event.key === 'Enter') { // Extract the user input
            
            const userInput = COMMAND.trim();
            console.log('User Input:', userInput);  // Do something with the input

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
        else if (event.key === 'Delete') { // Handle delete
            let flag = true;
            if (COMMAND.length <= 0)
                flag = false;

            if (flag) {
                COMMAND = COMMAND.slice(0, CURSOR_POS) +  COMMAND.slice(CURSOR_POS+1);
                CURSOR_POS = (CURSOR_POS <= 0) ? 0 : CURSOR_POS;
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
        else if (event.key.length === 1) {  // Capture typed characters
            if (CURSOR_POS == COMMAND.length){
                COMMAND += event.key;
            }
            else {
                COMMAND = COMMAND.slice(0, CURSOR_POS) + event.key + COMMAND.slice(CURSOR_POS);
            }
            CURSOR_POS ++;
        }

        if (!arrow_keys.includes(event.key) ) { // Update the current input line
            const inputLine = TERMINAL_CONSOLE.querySelectorAll("span");
            inputLine[inputLine.length - 1].innerText = `${COMMAND}`;
            if (CURSOR_POS == COMMAND.length) 
                appendCursor('last');
            else 
                appendCursor('middle');
        }
    });

    function appendCursor(pos) {
        const terminal_cursor = document.createElement('span');
        terminal_cursor.id = 'terminal-cursor';
        terminal_cursor.textContent = '█'; // Cursor character █
        if (pos == 'last') 
            TERMINAL_CONSOLE.appendChild(terminal_cursor);
        else if (pos == 'middle') {
            const inputLine = TERMINAL_CONSOLE.querySelectorAll("span");
            inputLine[inputLine.length - 1].innerHTML = `${COMMAND.slice(0, CURSOR_POS)}`;
            inputLine[inputLine.length - 1].innerHTML += `<span id="terminal-cursor-select">${COMMAND[CURSOR_POS]}</span>`;
            inputLine[inputLine.length - 1].innerHTML += `${COMMAND.slice(CURSOR_POS+1)}`;
        }
    }

    function removeCursor() {
        document.getElementById('terminal-cursor')?.remove();
        const terminal_cursor_select = document.getElementById('terminal-cursor-select');
        if (terminal_cursor_select) {
            TERMINAL_CONSOLE.lastChild.innerHTML = `${COMMAND}`
            terminal_cursor_select.remove();
        }
    }

    function addThePrompt() {
        TERMINAL_CONSOLE.innerHTML += '<span class="terminal-prompt" style="color: rgb(38,162,105); font-weight: bold"></span>';
        TERMINAL_CONSOLE.lastChild.innerHTML += `${CURRENT_USER.getUsername()}@${DOMAIN}`;
        TERMINAL_CONSOLE.innerHTML += '<span>:</span';

        TERMINAL_CONSOLE.innerHTML += '<span class="terminal-directory" style="color: rgb(18,72,139)"></span>';
        TERMINAL_CONSOLE.lastChild.innerHTML += directoryPromptHandler();

        TERMINAL_CONSOLE.innerHTML += '<span></span>';
        TERMINAL_CONSOLE.lastChild.innerHTML += "$ ";
        TERMINAL_CONSOLE.innerHTML += '<span></span>';
    }

    function directoryPromptHandler() {
        if (DIR === `/home/${CURRENT_USER.getUsername()}`)
            return `~`
        else if (DIR.includes(`/home/${CURRENT_USER.getUsername()}`, 0))
            return `~${DIR.slice(HOME_DIR_LENGTH)}`;
        else
            return `${DIR}`;
    }

    function addTitleBar() {
        const terminal_bar = document.getElementById('terminal-bar');
        terminal_bar.innerHTML += `<span id="terminal-title" style="position: absolute; left: 50%; transform: translateX(-50%); margin-top: 8px; font-weight: bold; font-size: 16.5px">${CURRENT_USER.getUsername()}@${DOMAIN}:` + directoryPromptHandler() + `</span>`;
    }

    function command_handler(command) {
        switch (command.split(" ")[0]){
            case '':
                break;

            case 'clear':
                TERMINAL_CONSOLE.innerHTML = '';
                CURSOR_POS == 0;
                break;

            case 'ls':
                TERMINAL_CONSOLE.innerHTML += '<br><span>I\'m working on it T.T<span>';
                break;
            
            case 'pwd':
                TERMINAL_CONSOLE.innerHTML += `<br><span>${DIR}</span>`;
                break;

            case 'whoami':
                TERMINAL_CONSOLE.innerHTML += `<br><span>${CURRENT_USER.getUsername()}</span>`;
                break;

            default:
                TERMINAL_CONSOLE.innerHTML += `<br><span>${command.split(" ")[0]}: command not found</span>`;
                break;
        }
    }

    // INITIALIZE //
    function InitUser() {
        return [new User('root'), new User('vuila9'), new User('ptkv'), new User('guest')];
    }

    function InitFileSystem() {
        const root = new Directory('/', 'root', '755');
        root.addDirectory(new Directory('bin', 'root', '755', root));
        root.addDirectory(new Directory('home', 'root', '755', root));
        root.addDirectory(new Directory('home', 'root', '755', root)); // would not add
        root.addDirectory(new Directory('src', 'root', '755', root));

        const home = root.getChildren('home');
        home.addDirectory(new Directory('vuila9', 'vuila9', '750', home));
        home.addDirectory(new Directory('ptkv', 'ptkv', '750', home));

        const vuila9 = home.getChildren('vuila9');
        vuila9.addDirectory(new Directory('code', 'vuila9', '775', vuila9));
        vuila9.addFile(new File('GitHub', 'vuila9', '664', vuila9));
        vuila9.getChildren('GitHub').setFileContent("https://vuila9.github", 'write');
        vuila9.getChildren('GitHub').setFileContent(".io/", 'append');


        const ptkv = home.getChildren('ptkv');
        ptkv.addDirectory(new Directory('ex', 'ptkv', '775', ptkv));
        ptkv.getChildren('ex').addDirectory(new Directory('me', 'ptkv', '775', ptkv.getChildren('ex')));
        ptkv.addFile(new File('MKNQ', 'ptkv', '664', ptkv));
        ptkv.getChildren('MKNQ').setFileContent("still a mystery...", 'write');

        const code = vuila9.getChildren('code');
        code.addDirectory(new Directory('is', 'vuila9', '775', code));
        code.addDirectory(new Directory('is', 'vuila9', '775', code)); // would not add
        code.addFile(new File('goal', 'vuila9', '664', code));
        code.addFile(new File('goal', 'vuila9', '664', code));  // would not add
        code.getChildren('goal').setFileContent("need to ace the Google Interview", 'write');


        return root;
    }
}