function START_UBUNTU_TERMINAL() {
    const TERMINAL_CONSOLE = document.getElementById('terminal-body');
    const USERS = InitUser();          // Initialize some users
    const ROOT_DIR = InitFileSystem(); // Initialize pre-built file structure that starts at root directory
    let CURRENT_USER = USERS[1];       // default user, vuila9
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
            if (COMMAND.length == 0) {
                appendCursor('last');
                return;
            }
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
        TERMINAL_CONSOLE.scrollTop = TERMINAL_CONSOLE.scrollHeight; // scroll all the way down if any key is pressed
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

        TERMINAL_CONSOLE.innerHTML += '<span class="terminal-directory"></span>';
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

    function octalToReadable(permission) {
        // Define the permission characters for each possible permission bit
        const permissionMap = ['---', '--x', '-w-', '-wx', 'r--', 'r-x', 'rw-', 'rwx'];
        
        // Convert the octal number to a string and pad it to ensure it's three digits
        let octalStr = permission.padStart(3, '0');
        
        // Translate each octal digit to its corresponding permission
        let readablePermission = '';
        for (let digit of octalStr) {
            readablePermission += permissionMap[parseInt(digit)];
        }
        
        return readablePermission;
    }

    function goToDir(dir) {
        // dir = '/path/to/dir' == '/path/to/dir/' 
        // since all dir start with / and either end with / or a dir name, this will generalize the dir into a simple array
        if (dir.split('').every(char => char === '/')) // if dir is string of '/'s, treat as '/' aka root
            return root;
    
        dir_arr = dir.slice(1).split('/');
        dir_arr = dir_arr.filter(dir => dir !== '');
        // dir_arr = [path, to, dir]
    
        function recursive(cur_dir, dir_arr) {
            if (!cur_dir.getChildren(dir_arr[0]))
                return "No such file or directory";
            else {
                if (dir_arr.length == 1)
                    return cur_dir.getChildren(dir_arr[0]);
                else 
                    return recursive(cur_dir.getChildren(dir_arr[0]), dir_arr.slice(1));
            }
        }
        return recursive(ROOT_DIR, dir_arr);
    }

    function command_handler(command) {
        const command_components = command.split(" ").slice(1);
        const command_name = command.split(" ")[0];
        const cur_dir = goToDir(DIR);
        switch (command_name){
            case '':
                break;

            case 'clear':
                if (command_components.includes('--help')) {
                    TERMINAL_CONSOLE.innerHTML += `<br><span>${command_name}: does not support any options</span>`;
                    break;
                }
                else if (command.length > command_name.length) {
                    TERMINAL_CONSOLE.innerHTML += `<br><span>${command_name}: extra operand '${command_components[1]}'</span>`;
                    break;
                }
                TERMINAL_CONSOLE.innerHTML = '';
                CURSOR_POS == 0;
                break;

            case 'ls':
                TERMINAL_CONSOLE.innerHTML += '<br>';
                if (command_components.includes('--help')) {
                    TERMINAL_CONSOLE.innerHTML += `<br><span>${command_name}: -l, -a, -la'</span>`;
                }
                else if (command_components[0] == '-a') { // display hidden files
                    TERMINAL_CONSOLE.innerHTML += `<span class="terminal-directory">.</span><span>  </span>`;
                    TERMINAL_CONSOLE.innerHTML += `<span class="terminal-directory">..</span><span>  </span>`;
                    for (let i = 0; i < cur_dir.getChildren().length; i++) {
                        const filenode = cur_dir.getChildren()[i];
                        if (filenode instanceof File)
                            TERMINAL_CONSOLE.innerHTML += `<span>${filenode.getName()}</span></span><span>  </span>`;
                        else if (filenode instanceof Directory)
                            TERMINAL_CONSOLE.innerHTML += `<span class="terminal-directory">${filenode.getName()}</span><span>  </span>`;
                    }
                }
                else if (command.length == command_name.length) { // bare command with no option included
                    for (let i = 0; i < cur_dir.getChildren().length; i++) {
                        const filenode = cur_dir.getChildren()[i];
                        if (filenode.getName()[0] == ".") continue
                        if (filenode instanceof File)
                            TERMINAL_CONSOLE.innerHTML += `<span>${filenode.getName()}</span></span><span>  </span>`;
                        else if (filenode instanceof Directory)
                            TERMINAL_CONSOLE.innerHTML += `<span class="terminal-directory">${filenode.getName()}</span><span>  </span>`;
                    }
                }
                else if (command_components[0].includes('-l')) { // list all visible directories in pwd in a list
                    if (command_components.length > 1) { // handle when 'ls -l' is used on a directory or a file
                        for (let i = 1; i < command_components.length; i++) {
                            const filenode = cur_dir.getChildren(command_components[i]);
                            if (!filenode)
                                TERMINAL_CONSOLE.innerHTML += `<span>${command_name}: cannot access '${command_components[i]}': No such file or directory</span>`;
                            else {
                                if (filenode instanceof Directory)
                                    TERMINAL_CONSOLE.innerHTML += `<span>Feature not supported, to view content of a directory, cd into it</span>`;
                                else if (filenode instanceof File) {
                                    TERMINAL_CONSOLE.innerHTML += `<span>${printFilenodeInfo(filenode)}</span>`;
                                }
                            }
                            if (i < command_components.length - 1) 
                                TERMINAL_CONSOLE.innerHTML += `<br>`;
                        }
                    }
                    else {
                        printFilenodeInfoList(cur_dir, command_components[0]); // list all available directories in pwd in a list
                    }
                }
                else if (command_components[0].includes('-')) { // all invalid options
                    TERMINAL_CONSOLE.innerHTML += `<span>${command_name}: unrecognized option '${command_components[0]}'</span>`;
                }
                else { // handle when 'ls' is used on a directory or a file
                    for (let i = 0; i < command_components.length; i++) {
                        const filenode = cur_dir.getChildren(command_components[i]);
                        if (!filenode)
                            TERMINAL_CONSOLE.innerHTML += `<span>${command_name}: cannot access '${command_components[i]}': No such file or directory</span>`;
                        else {
                            if (filenode instanceof Directory)
                                TERMINAL_CONSOLE.innerHTML += `<span>Feature not supported, to view content of a directory, cd into it</span>`;
                            else if (filenode instanceof File) {
                                TERMINAL_CONSOLE.innerHTML += `<span>${filenode.getName()}</span>`;
                            }
                        }
                        if (i < command_components.length - 1) 
                            TERMINAL_CONSOLE.innerHTML += `<br>`;
                    }
                }
                break;
            
            case 'mkdir':
                if (command_components.includes('--help')) {
                    TERMINAL_CONSOLE.innerHTML += `<br><span>${command_name}: does not support any options</span>`;
                }
                else {
                    for (let i = 0; i < command_components.length; i++) {
                        if (command_components[i][0] == '-') continue;
                        if (!cur_dir.addDirectory(new Directory(command_components[i], CURRENT_USER.getUsername(), '775', cur_dir)))
                            TERMINAL_CONSOLE.innerHTML += `<br><span>${command_name}: cannot create directory '${command_components[i]}': File eixists'</span>`;
                    }
                }
                break;

            case 'cd':
                if (command_components.includes('--help')) {
                    TERMINAL_CONSOLE.innerHTML += `<br><span>${command_name}: does not support any options</span>`;
                    break;
                }
                break

            case 'pwd':
                TERMINAL_CONSOLE.innerHTML += `<br><span>${DIR}</span>`;
                break;

            case 'whoami':
                if (command.length > command_name.length) {
                    TERMINAL_CONSOLE.innerHTML += `<br><span>${command_name}: extra operand '${command_components[1]}'</span>`;
                    break;
                }
                TERMINAL_CONSOLE.innerHTML += `<br><span>${CURRENT_USER.getUsername()}</span>`;
                break;

            case 'man':
                if (command_components.includes('--help')) {
                    TERMINAL_CONSOLE.innerHTML += `<br><span>${command_name}: does not support any options</span>`;
                    break;
                }
                else if (command_components == 'command') {
                    let manual = allAvailableSupportedCommands();
                    for (let i = 0; i < manual.length; i++) {
                        const man = manual[i];
                        const comm = Object.keys(man)[0];
                        const info = man[comm];
                        TERMINAL_CONSOLE.innerHTML += info;
                    }
                }
                else {
                    let manual = allAvailableSupportedCommands();
                    let found = false;
                    for (let i = 0; i < command_components.length; i++) {
                        for (let j = 0; j < manual.length; j++) {
                            const man = manual[j];
                            const comm = Object.keys(man)[0];
                            const info = man[comm];
                            if (comm == command_components[i]) {
                                TERMINAL_CONSOLE.innerHTML += info;
                                found = true;
                                break
                            }
                        }
                        if (!found)
                            TERMINAL_CONSOLE.innerHTML += `<br><span>No manual entry for ${command_components[i]}</span>`;
                    }
                }
                break;

            default:
                TERMINAL_CONSOLE.innerHTML += `<br><span>${command_name}: command not found</span>`;
                break;
        }

        // COMMAND HELPER //

        // ls //
        function printFilenodeInfo(filenode, name=filenode.getName(), option=[]){
            let stringHTML = '';
            stringHTML = (filenode instanceof Directory) ? 'd' : '-';
            stringHTML += octalToReadable(filenode.getPermission());
            stringHTML += " " + filenode.getHardlink();
            stringHTML += " " + filenode.getOwner();
            stringHTML += " " + filenode.getSize().toString().padStart(4, ' ');
            if (filenode instanceof Directory)
                stringHTML += " " + `<span class="terminal-directory">${name}</span>`;
            else 
                stringHTML += ` ${name}`;

            return stringHTML;
        }

        function printFilenodeInfoList(cur_dir, option) {
            if (option.length > 3) {
                TERMINAL_CONSOLE.innerHTML += `<span>ls: unrecognized option '${option}'</span>`;
                return;
            }
            let total_size;
            if (option.includes('a'))
                total_size = cur_dir.getChildren().reduce((sum, file) => sum + file.getSize(), 0) / 1024; 
            else
                total_size = cur_dir.getChildren().reduce((sum, file) => (file.getName()[0] == '.') ? sum + file.getSize() : sum, 0) / 1024;

            TERMINAL_CONSOLE.innerHTML += `<span>total ${Math.floor(total_size)}</span><br>`;
            if (option.includes('a')) {
                let as;
            }
            for (let i = 0; i < cur_dir.getChildren().length; i++) {
                const filenode = cur_dir.getChildren()[i];
                if (filenode.getName()[0] != "." || option.includes('a')) 
                    TERMINAL_CONSOLE.innerHTML += `<span>${printFilenodeInfo(filenode)}</span><br>`;

            }
            TERMINAL_CONSOLE.removeChild(TERMINAL_CONSOLE.lastChild); // remove extra <br> tag at the end
        }

        // man //
        function allAvailableSupportedCommands() {
            let manual = []
            manual.push({'help': `<br><span>--help: add anywhere after the command to see available options`});
            manual.push({'pwd':`<br><span>pwd: print name of current/working directory`});
            manual.push({'whoami':`<br><span>whoami: print effective user name`});
            manual.push({'ls':`<br><span>ls (-a, -l, -la): list directory contents`});
            manual.push({'clear':`<br><span>clear: clear the terminal screen`});
            manual.push({'mkdir':`<br><span>man: make directories`});

            manual.push({'man':`<br><span>man: print the system reference manuals`});
            return manual;
        }

        // next function
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
        vuila9.addDirectory(new Directory('this', 'vuila9', '775', vuila9));
        vuila9.addDirectory(new Directory('..abc', 'vuila9', '775', vuila9));
        vuila9.addDirectory(new Directory('fun', 'vuila9', '775', vuila9));
        vuila9.addDirectory(new Directory('...is', 'vuila9', '775', vuila9));
        vuila9.addDirectory(new Directory('just', 'vuila9', '775', vuila9));
        vuila9.addDirectory(new Directory('..for', 'vuila9', '775', vuila9));
        vuila9.addDirectory(new Directory('.-.for', 'vuila9', '775', vuila9));
        vuila9.addDirectory(new Directory('.testing', 'vuila9', '775', vuila9));
        vuila9.addDirectory(new Directory('I', 'vuila9', '775', vuila9));
        vuila9.addDirectory(new Directory('.will', 'vuila9', '775', vuila9));
        vuila9.addDirectory(new Directory('.delete', 'vuila9', '775', vuila9));
        vuila9.addFile(new File('later', 'vuila9', '664', vuila9));
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
        code.addFile(new File('goal', 'vuila9', '664', code));         // would not add
        code.getChildren('goal').setFileContent("need to ace the Google Interview", 'write');

        return root;
    }
}