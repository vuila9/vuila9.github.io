function START_UBUNTU_TERMINAL() {
    const TERMINAL_CONSOLE = document.getElementById('terminal-body');
    const UMASK = '0002'               // default umask
    const Dir_Perm = 777 - Number(UMASK);
    const File_Perm = 666 - Number(UMASK);
    const USERS = InitUser();          // Initialize some users
    const ROOT_DIR = InitFileSystem(); // Initialize pre-built file structure that starts at root directory
    let CURRENT_USER = USERS[1];       // default user, vuila9
    let DIR = `/home/${CURRENT_USER.getUsername()}`; // default current directory, pwd
    let HOME_DIR = `/home/${CURRENT_USER.getUsername()}`;
    let DOMAIN = 'github.io';
    let SUDO = false;
    
    let THE_PROMPT = `${CURRENT_USER.getUsername()}@${DOMAIN}:~$`; // need to make a function to assign this automatically
    let COMMAND = '';
    let CURSOR_POS = 0;    // track where the cursor is
    let HISTORY_POS = 0;   
    let HISTORY_COMMAND = [];

    addTitleBar();
    addThePrompt();
    appendCursor();

    TERMINAL_CONSOLE.focus();

    TERMINAL_CONSOLE.addEventListener('keydown', (event) => {
        let arrow_keys = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'];
        let tab_count = 0;
        removeCursor();

        if (event.key === 'Enter') { // Extract the user input
            
            const userInput = COMMAND.trim();
            if (COMMAND.length)
                HISTORY_COMMAND.push(COMMAND);
            console.log('User Input:', userInput);  // Do something with the input

            // THIS IS WHERE YOU DO YOUR COMMAND HANDLER
            command_handler(userInput);

            // Append the user input and move to the next line
            if (TERMINAL_CONSOLE.lastElementChild && TERMINAL_CONSOLE.lastElementChild.tagName != 'BR')
                TERMINAL_CONSOLE.innerHTML += `<br>`;

            addThePrompt();
            addTitleBar(); // change title bar if pwd is changed

            // Clear the current command
            COMMAND = '';
            CURSOR_POS = 0;
            HISTORY_POS = HISTORY_COMMAND.length;
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
        else if (event.key === 'Home') {
            event.preventDefault(); // Prevent the default action (whatever it is)
            CURSOR_POS = 0;
        }
        else if (event.key === 'End') {
            event.preventDefault(); // Prevent the default action (whatever it is)
            CURSOR_POS = COMMAND.length;
        }
        else if (event.key === 'Tab') {
            event.preventDefault(); // Prevent the default action (whatever it is)
        }
        else if (event.key === 'ArrowUp') {
            event.preventDefault(); // Prevent the default action (scrolling up)
            const inputLine = TERMINAL_CONSOLE.querySelectorAll("span");
            HISTORY_POS--;
            HISTORY_POS = (HISTORY_POS <= 0) ? 0 : HISTORY_POS;
            COMMAND = (HISTORY_COMMAND[HISTORY_POS]) ? HISTORY_COMMAND[HISTORY_POS] : '';
            CURSOR_POS = COMMAND.length;
            inputLine[inputLine.length - 1].innerText = `${COMMAND}`;
            appendCursor();
        }
        else if (event.key === 'ArrowDown') {
            event.preventDefault(); // Prevent the default action (scrolling down)
            const inputLine = TERMINAL_CONSOLE.querySelectorAll("span");
            HISTORY_POS++;
            HISTORY_POS = (HISTORY_POS >= HISTORY_COMMAND.length) ? (HISTORY_COMMAND.length) : HISTORY_POS;
            COMMAND = HISTORY_COMMAND[HISTORY_POS];

            if (typeof COMMAND !== 'undefined') 
                CURSOR_POS = COMMAND.length;
            else {
                CURSOR_POS = 0;
                COMMAND = '';
            }
            inputLine[inputLine.length - 1].innerText = `${COMMAND}`;
            appendCursor();
        }
        else if (event.key === 'ArrowLeft') {
            if (COMMAND.length == 0) {
                appendCursor();
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
                appendCursor();
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
                appendCursor();
            else 
                appendCursor('middle');
        }
        TERMINAL_CONSOLE.scrollTop = TERMINAL_CONSOLE.scrollHeight; // scroll all the way down if any key is pressed
    });

    function appendCursor(pos='last') {
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
        if (DIR.split('').every(char => char === '/')) // if dir is string of '/'s, treat as '/' aka root
            return '/';
        if (DIR === `/home/${CURRENT_USER.getUsername()}`)
            return `~`
        else if (DIR.includes(`/home/${CURRENT_USER.getUsername()}`, 0))
            return `~${DIR.slice(HOME_DIR.length)}`;
        else 
            return (DIR[DIR.length - 1] == "/") ? DIR.slice(0, -1) : DIR;
    }

    function addTitleBar() {
        const terminal_bar = document.getElementById('terminal-bar');
        document.getElementById("terminal-title")?.remove();
        terminal_bar.innerHTML += `<span id="terminal-title" style="position: absolute; left: 50%; transform: translateX(-50%); margin-top: 8px; font-weight: bold; font-size: 16.5px">${CURRENT_USER.getUsername()}@${DOMAIN}:` + directoryPromptHandler() + `</span>`;
    }

    function octalToReadable(permission) {
        // Define the permission characters for each possible permission bit
        const permissionMap = ['---', '--x', '-w-', '-wx', 'r--', 'r-x', 'rw-', 'rwx'];
        
        // Convert the octal number to a string and pad it to ensure it's three digits
        let octalStr = permission.toString().padStart(3, '0');
        
        // Translate each octal digit to its corresponding permission
        let readablePermission = '';
        for (let digit of octalStr) {
            readablePermission += permissionMap[parseInt(digit)];
        }
        
        return readablePermission;
    }

    function autocomplete(target_filenode, type='') {
        const dir_obj = target_filenode.getChildren();
        
        let exactMatch = null;
        let partialMatches = [];
    
        // Traverse through the array to find matches
        for (let filenode of dir_obj) {
            if (type == "cd") {
                if (filenode instanceof Directory && filenode.getName() === target_filenode) {
                    exactMatch = str;
                } else if (filenode instanceof Directory && filenode.getName().includes(target_filenode)) {
                    partialMatches.push(filenode.getName());
                }
            }
            else {
                if (filenode.getName() === target_filenode) {
                    exactMatch = str;
                } else if (filenode.getName().includes(target_filenode)) {
                    partialMatches.push(filenode.getName());
                }
            }
        }
    
        // If there's an exact match, return it
        if (exactMatch) {
            return exactMatch;
        }
    
        // If there are multiple partial matches, return the closest one
        if (partialMatches.length > 0) {
            // Sort the partial matches by length and return the shortest one
            partialMatches.sort((a, b) => a.length - b.length);
            return partialMatches[0];
        }
    
        // If no match is found, return null or an appropriate value
        return null;
    }

    function absolutePathInterpreter(path) {
        if (path[0] === '~') {
            path = path.replace('~', HOME_DIR);
        }
        
        // Split the input path into parts
        let pathParts = path.split('/');
        let resolvedParts = [];

        // Traverse through the path parts
        for (let part of pathParts) {
            if (part === '.' || part === '') {
                // Do nothing for current directory (.) or empty parts
                continue;
            } else if (part === '..') {
                // Go up one directory for (..), but prevent going above the root (empty resolvedParts)
                if (resolvedParts.length > 0) {
                    resolvedParts.pop(); // Remove the last directory
                }
            } else {
                // Add new directory or file to the resolved path
                resolvedParts.push(part);
            }
        }

        // Join the parts back into a valid path
        let resolvedPath = '/' + resolvedParts.join('/');

        // Ensure the result doesn't end with an extra '/' (except for root '/')
        return resolvedPath === '/' ? resolvedPath : resolvedPath.replace(/\/$/, '');
    } 

    // this function will normalize the . and .. components.
    // it will resolve the path relative to the current directory DIR
    function pathInterpreter(dir, relativePath) {
        if (relativePath === '/') { // root
            return '/';
        }
        if (relativePath[0] === '~') {
            return relativePath.replace('~', HOME_DIR);
        }
        // Split the current directory and relative path into parts
        let dirParts = dir.split('/');
        let pathParts = relativePath.split('/');
    
        // Traverse through the relative path parts
        for (let part of pathParts) {
            if (part === '.' || part === '') {
                // Do nothing for current directory (.)
                continue;
            } else if (part === '..') {
                // Go up one directory for (..)
                if (dirParts.length > 1) {
                    dirParts.pop(); // Remove the last directory in DIR
                }
            } else {
                // Add new directory or file to the path
                dirParts.push(part);
            }
        }
        // Join the parts back into a valid path and return
        if (dirParts.length == 1 && dirParts[0] == '')
            return '/';
        else
            return dirParts.join('/');
    }

    function goToDir(dir) {
        // dir = '/path/to/dir' == '/path/to/dir/' 
        // since all dir start with / and either end with / or a dir name, this will generalize the dir into a simple array
        if (dir.split('').every(char => char === '/')) // if dir is string of '///'s, treat as '/' aka root
            return ROOT_DIR;
    
        dir_arr = dir.slice(1).split('/');
        dir_arr = dir_arr.filter(dir => dir !== '');
        // dir_arr = [path, to, dir]
    
        function recursive(cur_dir, dir_arr) {
            try {
                if (!cur_dir.getChildren(dir_arr[0]))
                    return null;
                else {
                    if (dir_arr.length == 1)
                        return cur_dir.getChildren(dir_arr[0]);
                    else 
                        return recursive(cur_dir.getChildren(dir_arr[0]), dir_arr.slice(1));
                }
            }
            catch {
                return null;
            }
        }
        return recursive(ROOT_DIR, dir_arr);
    }

    // This replaces all occurrences of two or more repeated 'character' with a single 'character'.
    function filterExcessiveCharacter(string, character) {
        let regex = new RegExp(character + '{2,}', 'g'); // Dynamically create the regex
        string = string.replace(regex, character);  
        return string; 
    }

    function permissionCheck(filenode, type='') {
        if (CURRENT_USER.getUsername() == filenode.getOwner())
            return true;
        let perm = octalToReadable(filenode.getPermission()).slice(-3); // only look at the last 3 elements, the 'Others' component
        return perm.includes(type);
    }

    function command_handler(command) {
        if (command.split(' ')[0] != 'echo' && !command.split(' ').includes(">>"))
            command = filterExcessiveCharacter(command, ' ');
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
                if (command_components.includes('--help')) {
                    TERMINAL_CONSOLE.innerHTML += `<span>${command_name}: -l, -a, -la</span>`;
                }
                else if (command_components[0] == '-a') {     // ls -a 
                    if (!command_components.slice(1).length)  // single
                        printFileNodeName(cur_dir, '-a');
                    else                                      // multi
                        printAnyFileNodeInfo(command_components.slice(1), '-a');
                }
                else if (command_components[0] == null || command_components[0][0] != '-') { // ls - naked command with no option included
                    if (!command_components.length)          // single
                        printFileNodeName(cur_dir);
                    else                                     // multi
                        printAnyFileNodeInfo(command_components);
                }
                else if (command_components[0].includes('-l') || command_components[0].includes('-a')) { // ls - list all visible directories in pwd in a list
                    if (!command_components.slice(1).length)  // single
                        printFilenodeInfoList(cur_dir, command_components[0]);
                    else                                      // multi
                        printAnyFileNodeInfo(command_components.slice(1), command_components[0]);
                }
                else if (command_components[0].includes('-'))  // all invalid options
                    TERMINAL_CONSOLE.innerHTML += `<br><span>${command_name}: unrecognized option '${command_components[0]}'</span>`;
                break;
            
            case 'mkdir':
                if (command_components.includes('--help')) {
                    TERMINAL_CONSOLE.innerHTML += `<br><span>${command_name}: -m ### (perm) dir, can only create directories in the current working directory, no nesting allowed</span>`;
                }
                else if (command_components.length == 3 && command_components[0] == '-m' && /^[0-7]{3}$/.test(command_components[1])) { // checking for -m ### form
                    if (!cur_dir.addDirectory(new Directory(command_components[2], CURRENT_USER.getUsername(), command_components[1], cur_dir)))
                        TERMINAL_CONSOLE.innerHTML += `<br><span>${command_name}: cannot create directory '${command_components[i]}': File eixists'</span>`;
                }
                else if (command_components[0] == "~") {
                    TERMINAL_CONSOLE.innerHTML += `<br><span>${command_name}: cannot create directory '${HOME_DIR}': File eixists'</span>`;
                }
                else {
                    for (let i = 0; i < command_components.length; i++) {
                        if (command_components[i][0] == '-') continue;
                        if (command_components[i].includes("/")){
                            TERMINAL_CONSOLE.innerHTML += `<br><span>${command_name}: cannot create nested directories</span>`;
                            continue
                        }
                        if (!cur_dir.addDirectory(new Directory(command_components[i], CURRENT_USER.getUsername(), Dir_Perm, cur_dir)))
                            TERMINAL_CONSOLE.innerHTML += `<br><span>${command_name}: cannot create directory '${command_components[i]}': File eixists'</span>`;
                    }
                }
                break;

            // case 'touch':
            //     if (command_components.includes('--help')) {
            //         TERMINAL_CONSOLE.innerHTML += `<br><span>${command_name}: does not support any options. Cannot be used alone</span>`;
            //     }
            //     else if (command_components.length == 0) {
            //         TERMINAL_CONSOLE.innerHTML += `<br><span>${command_name}: missing file operand</span>`;
            //     }
            //     else {
            //         for (let i = 0; i < command_components.length; i++) {
            //             if (command_components[i][0] == '-') continue;
            //             let temp_components = command_components[i].split('/');
            //             let flag = (temp_components.length == 1); 
            //             let file_name = temp_components.pop();
            //             if (temp_components.length == 0) { // file in current dir
            //                 if (!cur_dir.addFile(new File(file_name, CURRENT_USER.getUsername(), File_Perm, cur_dir)))
            //                     TERMINAL_CONSOLE.innerHTML += `<br><span>${command_name}: cannot create directory '${command_components[i]}': File eixists'</span>`;
            //             }
            //             else if (temp_components.length == 1) {
            //                 let temp_dir;
            //                 if (temp_components)
            //             }
            //             else { 
            //                 let temp_dir;
            //                 temp_components = temp_components.join('/');
            //                 if (temp_components[0] != '/') { // not absolute path
            //                     if (temp_dir = goToDir(DIR + '/' + temp_components)) {
            //                         if (!temp_dir.addFile(new File(file_name, CURRENT_USER.getUsername(), File_Perm, temp_dir)))
            //                             TERMINAL_CONSOLE.innerHTML += `<br><span>${command_name}: cannot create directory '${command_components[i]}': File eixists'</span>`;
            //                     }
            //                 }
            //                 else {
            //                     if (temp_dir = goToDir(pathInterpreter(DIR, temp_components))
            //                 }
            //             }


            //             if (command_components[i].includes("/")){
            //                 TERMINAL_CONSOLE.innerHTML += `<br><span>${command_name}: cannot create nested directories</span>`;
            //                 continue
            //             }
            //             if (!cur_dir.addDirectory(new Directory(command_components[i], CURRENT_USER.getUsername(), Dir_Perm, cur_dir)))
            //                 TERMINAL_CONSOLE.innerHTML += `<br><span>${command_name}: cannot create directory '${command_components[i]}': File eixists'</span>`;
            //         }
            //     }

            case 'cd':
                if (command_components.includes('--help')) {
                    TERMINAL_CONSOLE.innerHTML += `<br><span>${command_name}: does not support any options</span>`;
                }
                else if (command_components.length > 1) {
                    TERMINAL_CONSOLE.innerHTML += `<br><span>bash: ${command_name}: too many arguments</span>`;
                }
                else if (command.length == command_name.length || command_components[0] == '~') // aka just cd
                    DIR = HOME_DIR;
                else { 
                    let temp_filenode;
                    let temp_dir;
                    if (!command_components[0].slice(2).includes('.') && command_components[0] != '/') {  // any path that starts with . or .. and doesnt include any . or .. in the middle
                        temp_dir = pathInterpreter(DIR, command_components[0]);
                        temp_filenode = goToDir(temp_dir);
                        
                    }
                    else if (command_components[0][0] == '/' || command_components[0][0] == '~') {        // any absolute path or path starts with '~', doesnt matter if . or .. is in the middle
                        temp_dir = absolutePathInterpreter(command_components[0]);
                        temp_filenode = goToDir(temp_dir);
                    }
                    else {                                                                                // any path that starts at the current directory, could also start with . or ..
                        temp_dir = absolutePathInterpreter(DIR + '/' + command_components[0]);
                        temp_filenode = goToDir(temp_dir);
                    }
                    if (temp_filenode){
                        if (temp_filenode instanceof File)
                            TERMINAL_CONSOLE.innerHTML += `<br><span>bash: ${command_name}: ${command_components[0]}: Not a directory</span>`;
                        else {
                            if (SUDO || permissionCheck(temp_filenode, 'x'))
                                DIR = temp_dir;
                            else 
                                TERMINAL_CONSOLE.innerHTML += `<br><span>bash: ${command_name}: ${command_components[0]}: Permission denied</span>`;

                        }
                    }
                    else 
                        TERMINAL_CONSOLE.innerHTML += `<br><span>bash: ${command_name}: ${command_components[0]}: No such file or directory</span>`;
                }
                break;

            case 'history':
                if (command_components.includes('--help')) {
                    TERMINAL_CONSOLE.innerHTML += `<br><span>${command_name}: -c, ##</span>`;
                }
                else if (command_components[0] == '-c') { // delete history
                    HISTORY_COMMAND = [];
                }
                else if (Number(command_components[0]) || command_components[0] == 0) { // print a fixed amount of lines from the most recent
                    if (command_components[0] < 0) 
                        TERMINAL_CONSOLE.innerHTML += `<br><span>bash: ${command_name}: ${command_components[0]}: invalid option</span>`;
                    else
                        printHistory(command_components[0]);
                }
                else if (command.length == command_name.length) // just 'history'
                    printHistory();
                else 
                    TERMINAL_CONSOLE.innerHTML += `<br><span>bash: ${command_name}: ${command_components[0]}: numeric argument required</span>`;
                break;

            case 'pwd':
                TERMINAL_CONSOLE.innerHTML += `<br><span>${DIR}</span>`;
                break;

            case 'whoami':
                if (command_components.includes('--help')) {
                    TERMINAL_CONSOLE.innerHTML += `<br><span>${command_name}: does not support any options</span>`;
                    break;
                }
                else if (command.length > command_name.length) {
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
        function printFileNodeName(cur_dir, option='') {
            var stringHTML = '';
            for (let i = 0; i < cur_dir.getChildren().length; i++) {
                const filenode = cur_dir.getChildren()[i];
                if (!option.includes('a') && filenode.getName()[0] == ".") continue
                if (filenode instanceof File)
                    stringHTML += `<span>${filenode.getName()}</span><span>  </span>`;
                else if (filenode instanceof Directory)
                    stringHTML += `<span class="terminal-directory">${filenode.getName()}</span><span>  </span>`;
            }
            if (stringHTML) {
                TERMINAL_CONSOLE.innerHTML += '<br>';
            }
            TERMINAL_CONSOLE.innerHTML += stringHTML;
        }
        //ls MAIN
        function printAnyFileNodeInfo(dir_arr, option='') {
            const bad_dir = [];
            const good_dir_obj = [];
            const good_dir_name = [];
            for (let i = 0; i < dir_arr.length; i++) {
                if (dir_arr[i] == '~') {
                    good_dir_obj.push(goToDir(HOME_DIR));
                    good_dir_name.push(HOME_DIR);
                    continue;
                }
                let temp_dir;
                if (!dir_arr[i].slice(2).includes('.') && dir_arr[i][0] != '/')  // any path that starts with . or .. and doesnt include any . or .. in the middle
                    temp_dir = goToDir(pathInterpreter(DIR, dir_arr[i]));
                else if (dir_arr[i][0] == '/' || dir_arr[i][0] == '~')           // any absolute path or path starts with '~', doesnt matter if . or .. is in the middle
                    temp_dir = goToDir(absolutePathInterpreter(dir_arr[i]));
                else                                                             // any path that starts at the current directory, could also start with . or ..
                    temp_dir = goToDir(absolutePathInterpreter(DIR + '/' + dir_arr[i]));
                
                (temp_dir) ? (good_dir_obj.push(temp_dir), good_dir_name.push(dir_arr[i])) : bad_dir.push(dir_arr[i]);
            }
            for (let i = 0; i < bad_dir.length; i++) {
                TERMINAL_CONSOLE.innerHTML += `<br><span>ls: cannot access '${bad_dir[i]}': No such file or directory</span>`;
            }
            let flag_file = true;
            for (let i = 0; i < good_dir_obj.length; i++) { // loop only File objects
                if (good_dir_obj[i] instanceof File)  {
                    if (flag_file ) TERMINAL_CONSOLE.innerHTML += `<br>`;
                    if (!option.includes('l')) {
                        TERMINAL_CONSOLE.innerHTML += `<span>${good_dir_name[i]}  </span>`;
                    }
                    else 
                        TERMINAL_CONSOLE.innerHTML += `<span>${printFilenodeInfo(good_dir_obj[i], good_dir_name[i])}</span><br>`;
                    flag_file = false;
                }
            }
                
            let flag_dir = (good_dir_obj.length > 1);
            for (let i = 0; i < good_dir_obj.length; i++) {
                if (good_dir_obj[i] instanceof Directory) {
                    if (!option.includes('l')) {
                        if (flag_file && bad_dir.length == 0 && good_dir_obj.length > 1 && i == 0) // god forgive me for making this if statement
                            TERMINAL_CONSOLE.innerHTML += `<br><span>${good_dir_name[i]}:</span>`;
                        else if (flag_dir || bad_dir.length > 0) 
                            TERMINAL_CONSOLE.innerHTML += `<br><br><span>${good_dir_name[i]}:</span>`;
                        
                        printFileNodeName(good_dir_obj[i], option);
                    }
                    else {
                        if (flag_dir || bad_dir.length > 0) 
                            TERMINAL_CONSOLE.innerHTML += `<br><span>${good_dir_name[i]}:`;
                        printFilenodeInfoList(good_dir_obj[i], option);
                    }
                }
            }
        }
        //ls
        function printFilenodeInfo(filenode, customized_name=''){
            let maxUsername_length = 0;

            USERS.forEach(user => {
                if (user.getUsername().length > maxUsername_length) {
                    maxUsername_length = user.getUsername().length;
                }
            });
            let stringHTML = '';
            stringHTML = (filenode instanceof Directory) ? 'd' : '-'; // file type '-' for file, 'd' for directory
            stringHTML += octalToReadable(filenode.getPermission());
            if (filenode.getName() == "..") 
                stringHTML += " " + "?".toString().padStart(3, ' ');  // I'm so done with this hardlink bs for '..'
            else
                stringHTML += " " + filenode.getHardlink().toString().padStart(3, ' ');
            stringHTML += " " + filenode.getOwner().padEnd(maxUsername_length, ' ');
            stringHTML += " " + filenode.getSize().toString().padStart(4, ' ');
            if (filenode instanceof Directory)
                stringHTML += ` <span class="terminal-directory">${filenode.getName()}</span>`;
            else 
                (customized_name) ? stringHTML += ` ${customized_name}` : stringHTML += ` ${filenode.getName()}`;

            return stringHTML;
        }
        //ls
        function printFilenodeInfoList(cur_dir, option) {
            let stringHTML = '';
            if (option.length > 3) { // only support up to '-la'
                stringHTML += `<span>ls: unrecognized option '${option}'</span>`;
                return;
            }
            let total_size = 0;
            for (let i = 0; i < cur_dir.getChildren().length; i++) {
                const filenode = cur_dir.getChildren()[i];
                if (filenode.getName()[0] != '.' || option.includes('a')) {
                    total_size += filenode.getSize();
                }
            }

            TERMINAL_CONSOLE.innerHTML += `<br><span>total ${Math.floor(total_size/1024)}</span><br>`;
            for (let i = 0; i < cur_dir.getChildren().length; i++) {
                const filenode = cur_dir.getChildren()[i];
                if (filenode.getName()[0] != '.' || option.includes('a')) {
                    stringHTML += `<span>${printFilenodeInfo(filenode)}</span><br>`;
                }
            }
            TERMINAL_CONSOLE.innerHTML += stringHTML;
        }

        function printHistory(line=HISTORY_COMMAND.length) {
            let span = HISTORY_COMMAND.length.toString().length;
            for (let i = HISTORY_COMMAND.length - line; i < HISTORY_COMMAND.length; i++) {
                TERMINAL_CONSOLE.innerHTML += `<br><span>  ${(i+1).toString().padStart(span, ' ')}  ${HISTORY_COMMAND[i]}</span>`;
            }
        }

        // man //
        function allAvailableSupportedCommands() {
            const manual = []
            manual.push({'help': `<br><span>--help: add anywhere after the command to see available options`});
            manual.push({'pwd':`<br><span>pwd: print name of current/working directory`});
            manual.push({'whoami':`<br><span>whoami: print effective user name`});
            manual.push({'clear':`<br><span>clear: clear the terminal screen`});
            manual.push({'ls':`<br><span>ls (-a, -l, -la): list directory contents (show hidden, show as list, show as both)`});
            manual.push({'mkdir':`<br><span>mkdir (-m ###): make directories (specify permission in octal)`});
            manual.push({'cd':`<br><span>cd: change the working directory`});
            manual.push({'history':`<br><span>history (-c, ##): GNU History Library (clear list, show amount from bottom up)`});

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
        root.addDirectory(new Directory('.', 'root', '755', root));
        root.addDirectory(new Directory('..', 'root', '755', root));
        root.addDirectory(new Directory('bin', 'root', '755', root));
        root.addDirectory(new Directory('home', 'root', '755', root));
        root.addDirectory(new Directory('home', 'root', '755', root)); // would not add
        root.addDirectory(new Directory('src', 'root', '755', root));
        root.getChildren('src').addDirectory(new Directory('.?', 'root', '755', root));
        root.getChildren('src').getChildren('.?').addFile(new File('trust_me_bro', 'root', '755', root));
        root.getChildren('src').getChildren('.?').getChildren('trust_me_bro').setFileContent('trust him bro', 'write');

        const home = root.getChildren('home');
        home.addDirectory(new Directory('vuila9', 'vuila9', '750', home));
        home.addDirectory(new Directory('ptkv', 'ptkv', '750', home));

        const vuila9 = home.getChildren('vuila9');
        vuila9.addDirectory(new Directory('code', 'vuila9', Dir_Perm, vuila9));
        vuila9.addDirectory(new Directory('this', 'vuila9', Dir_Perm, vuila9));
        vuila9.addDirectory(new Directory('..abc', 'vuila9', Dir_Perm, vuila9));
        vuila9.addDirectory(new Directory('fun', 'vuila9', Dir_Perm, vuila9));
        vuila9.addDirectory(new Directory('...is', 'vuila9', Dir_Perm, vuila9));
        vuila9.addDirectory(new Directory('just', 'vuila9', Dir_Perm, vuila9));
        vuila9.addDirectory(new Directory('..for', 'vuila9', Dir_Perm, vuila9));
        vuila9.addDirectory(new Directory('.-.for', 'vuila9', Dir_Perm, vuila9));
        vuila9.addDirectory(new Directory('.testing', 'vuila9', Dir_Perm, vuila9));
        vuila9.addDirectory(new Directory('I', 'vuila9', Dir_Perm, vuila9));
        vuila9.addDirectory(new Directory('.will', 'vuila9', Dir_Perm, vuila9));
        vuila9.addDirectory(new Directory('.delete', 'vuila9', Dir_Perm, vuila9));
        vuila9.addFile(new File('later', 'vuila9', File_Perm, vuila9));
        vuila9.addFile(new File('GitHub', 'vuila9', File_Perm, vuila9));
        vuila9.getChildren('GitHub').setFileContent("https://vuila9.github", 'write');
        vuila9.getChildren('GitHub').setFileContent(".io/", 'append');

        const ptkv = home.getChildren('ptkv');
        ptkv.addDirectory(new Directory('ex', 'ptkv', Dir_Perm, ptkv));
        ptkv.getChildren('ex').addDirectory(new Directory('me', 'ptkv', Dir_Perm, ptkv.getChildren('ex')));
        ptkv.addFile(new File('MKNQ', 'ptkv', File_Perm, ptkv));
        ptkv.getChildren('MKNQ').setFileContent("still a mystery...", 'write');

        const code = vuila9.getChildren('code');
        code.addDirectory(new Directory('is', 'vuila9', Dir_Perm, code));
        code.addDirectory(new Directory('is', 'vuila9', Dir_Perm, code)); // would not add
        code.addFile(new File('goal', 'vuila9', File_Perm, code));
        code.addFile(new File('goal', 'vuila9', File_Perm, code));         // would not add
        code.getChildren('goal').setFileContent("need to ace the Google Interview", 'write');

        return root;
    }
}