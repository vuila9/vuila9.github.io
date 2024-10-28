function START_UBUNTU_TERMINAL() {
    const TERMINAL_CONSOLE = document.getElementById('terminal-body');
    const UMASK = '0002'               // default umask
    const DEFAULT_DIR_PERMISSION  =  777 - Number(UMASK);
    const DEFAULT_FILE_PERMISSION =  666 - Number(UMASK);
    const USERS = InitUser();          // Initialize some users dict {}
    const ROOT_DIR = InitFileSystem(); // Initialize pre-built file structure that starts at root directory
    let CURRENT_USER = USERS['vuila9'];       // {root:root, vuila9:vuila9, ptkv:ptkv}
    let DIR = (CURRENT_USER.getUsername() == 'root') ? `/` : `/home/${CURRENT_USER.getUsername()}`; // default current directory, pwd
    let HOME_DIR = (CURRENT_USER.getUsername() == 'root') ? `/` : `/home/${CURRENT_USER.getUsername()}`;
    let DOMAIN = 'github.io';
    let SUDO = false || (CURRENT_USER.getUsername() == 'root');
    
    let THE_PROMPT = `${CURRENT_USER.getUsername()}@${DOMAIN}:~$`; // need to make a function to assign this automatically
    let COMMAND = '';
    let CURSOR_POS = 0;    // track where the cursor is
    let HISTORY_POS = 0;   
    let HISTORY_COMMAND = [];

    let PASSWORD_IN_PROGRESS = false;
    let SELF_DESTRUCT = false;
    let SU_TARGET = '';

    addTitleBar();
    addThePrompt();
    appendCursor();

    TERMINAL_CONSOLE.focus();

    TERMINAL_CONSOLE.addEventListener('keydown', (event) => {
        let arrow_keys = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'];
        removeCursor();

        if (event.key === 'Enter') { // Extract the user input
            event.preventDefault(); // Prevent default "Enter" behavior
            
            const userInput = COMMAND.trim();
            if (COMMAND.length)
                HISTORY_COMMAND.push(COMMAND);
            //console.log('User Input:', userInput);  // Do something with the input

            // THIS IS WHERE YOU DO YOUR COMMAND HANDLER
            if (!PASSWORD_IN_PROGRESS)
                command_handler(userInput);
            else {
                if (COMMAND === USERS[SU_TARGET].getPassword()) {
                    if (SELF_DESTRUCT) {
                        TERMINAL_CONSOLE.remove(); 
                        addTitleBar("Look at what you have done 💀");
                        return;
                    }
                    CURRENT_USER = USERS[SU_TARGET];
                    HOME_DIR = (CURRENT_USER.getUsername() == 'root') ? `/` : `/home/${CURRENT_USER.getUsername()}`;
                    HOME_DIR = (goToDir(HOME_DIR)) ? HOME_DIR : '/'
                }
                else {
                    if (SELF_DESTRUCT)  {
                        TERMINAL_CONSOLE.innerHTML += '<br><span>*gulp*</span>';
                        SELF_DESTRUCT = false;
                    }
                    else
                        TERMINAL_CONSOLE.innerHTML += '<br><span>su: Authentication failure</span>';
                }
                PASSWORD_IN_PROGRESS = false;
            }

            // Append the user input and move to the next line
            if (TERMINAL_CONSOLE.lastElementChild && TERMINAL_CONSOLE.lastElementChild.tagName != 'BR')
                TERMINAL_CONSOLE.innerHTML += `<br>`;

            if (PASSWORD_IN_PROGRESS) 
                TERMINAL_CONSOLE.innerHTML += '<span>Password: </span><span></span>';
            else 
                addThePrompt();

            // Clear the current command
            COMMAND = '';
            CURSOR_POS = 0;
            HISTORY_POS = HISTORY_COMMAND.length;
            addTitleBar(); // change title bar if pwd is changed
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
        else if (event.key === 'Delete' && !PASSWORD_IN_PROGRESS) { // Handle delete
            let flag = true;
            if (COMMAND.length <= 0)
                flag = false;

            if (flag) {
                COMMAND = COMMAND.slice(0, CURSOR_POS) +  COMMAND.slice(CURSOR_POS+1);
                CURSOR_POS = (CURSOR_POS <= 0) ? 0 : CURSOR_POS;
            }
        }
        else if (event.key === 'Home' && !PASSWORD_IN_PROGRESS) {
            event.preventDefault(); // Prevent the default action (whatever it is)
            CURSOR_POS = 0;
        }
        else if (event.key === 'End' && !PASSWORD_IN_PROGRESS) {
            event.preventDefault(); // Prevent the default action (whatever it is)
            CURSOR_POS = COMMAND.length;
        }
        else if (event.key === 'Tab') {
            event.preventDefault(); // Prevent the default action (whatever it is)
        }
        else if (event.key === 'ArrowUp' && !PASSWORD_IN_PROGRESS) {
            event.preventDefault(); // Prevent the default action (scrolling up)
            if (HISTORY_COMMAND.length == 0){
                appendCursor();
                return;
            }
            const inputLine = TERMINAL_CONSOLE.querySelectorAll("span");
            HISTORY_POS--;
            HISTORY_POS = (HISTORY_POS <= 0) ? 0 : HISTORY_POS;
            COMMAND = (HISTORY_COMMAND[HISTORY_POS]) ? HISTORY_COMMAND[HISTORY_POS] : '';
            CURSOR_POS = COMMAND.length;
            inputLine[inputLine.length - 1].innerText = `${COMMAND}`;
            appendCursor();
        }
        else if (event.key === 'ArrowDown' && !PASSWORD_IN_PROGRESS) {
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
        else if (event.key === 'ArrowLeft' && !PASSWORD_IN_PROGRESS) {
            if (COMMAND.length == 0) {
                appendCursor();
                return;
            }
            CURSOR_POS --;
            CURSOR_POS = (CURSOR_POS < 0) ? 0 : CURSOR_POS;
            if (CURSOR_POS >= 0)
                appendCursor('middle');
        }
        else if (event.key === 'ArrowRight' && !PASSWORD_IN_PROGRESS) {
            CURSOR_POS ++;
            if (CURSOR_POS < COMMAND.length) 
                appendCursor('middle');
            else {
                CURSOR_POS = COMMAND.length;
                appendCursor();
            }
        }
        else if (event.key.length === 1) {  // Capture typed characters
            if (PASSWORD_IN_PROGRESS)
                COMMAND += event.key;
            else if (CURSOR_POS == COMMAND.length){
                COMMAND += event.key;
            }
            else {
                COMMAND = COMMAND.slice(0, CURSOR_POS) + event.key + COMMAND.slice(CURSOR_POS);
            }
            CURSOR_POS ++;
        }

        if (!arrow_keys.includes(event.key) ) { // Update the current input line
            const inputLine = TERMINAL_CONSOLE.querySelectorAll("span");
            if (!PASSWORD_IN_PROGRESS)
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

    function addTitleBar(custom_text='') {
        const terminal_bar = document.getElementById('terminal-bar');
        document.getElementById("terminal-title")?.remove();
        if (custom_text.length == 0)
            terminal_bar.innerHTML += `<span id="terminal-title" style="position: absolute; left: 50%; transform: translateX(-50%); margin-top: 8px; font-weight: bold; font-size: 16.5px">${CURRENT_USER.getUsername()}@${DOMAIN}:` + directoryPromptHandler() + `</span>`;
        else
            terminal_bar.innerHTML += `<span id="terminal-title" style="position: absolute; left: 50%; transform: translateX(-50%); margin-top: 8px; font-weight: bold; font-size: 16.5px">${custom_text}</span>`;

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

    function setSUDO(flag=false) {
        SUDO = flag || (CURRENT_USER.getUsername() == 'root');
    }

    // This replaces all occurrences of two or more repeated 'character' with a single 'character'.
    function filterExcessiveCharacter(string, character) {
        let regex = new RegExp(character + '{2,}', 'g'); // Dynamically create the regex
        string = string.replace(regex, character);  
        return string; 
    }

    function permissionCheck(filenode, type='') {
        if (CURRENT_USER.getUsername() == 'root') return true;
        let perm = octalToReadable(filenode.getPermission());

        if (CURRENT_USER.getUsername() == filenode.getOwner())
            return perm.slice(0,3).includes(type);    // check for owner permission (first 3 digits)

        // check for others permisison (last 3 digits)
        return perm.slice(-3).includes(type); 
        //return perm.slice(-3).includes(type) && (filenode.getOwner() == CURRENT_USER.getUsername() || filenode.getOwner() == 'root');   
    }

    function command_handler(command) {
        if (/^sudo/.test(command)) {
            setSUDO(true);
            command = command.replace(/^sudo /, '');
        }
        else 
            setSUDO();

        if (command.split(' ')[0] != 'echo' && !command.split(' ').includes(">>"))
            command = filterExcessiveCharacter(command, ' ');

        const command_components = command.split(" ").slice(1);
        const command_name = command.split(" ")[0];
        const cur_dir = goToDir(DIR);
        switch (command_name){
            case '':
                break;

            case 'ls':
                if (command_components.includes('--help')) {
                    TERMINAL_CONSOLE.innerHTML += `<br><span>${command_name}: options supported -l, -a, -la; syntax: ls -l|-a|-la dir/file_name</span>`;
                    TERMINAL_CONSOLE.innerHTML += `<br><span>${command_name}: use this command with any path/to/dir/file</span>`;
                    break;
                }
                if (command_components[0] == '-a') {           // ls -a 
                    if (!command_components.slice(1).length) { // use on self
                        if (SUDO || permissionCheck(goToDir(DIR), 'r'))
                            printFileNodeName(cur_dir, '-a');
                        else
                            TERMINAL_CONSOLE.innerHTML += `<br><span>ls: cannot access '.': Permission denied</span>`;
                    }
                    else                                       // use on a target(s)
                        printAnyFileNodeInfo(command_components.slice(1), '-a');
                    break;
                }
                else if (command_components[0] == null || command_components[0][0] != '-') { // ls - naked command with no option included
                    if (!command_components.length) {          // use on self
                        if (SUDO || permissionCheck(goToDir(DIR), 'r'))
                            printFileNodeName(cur_dir);
                        else
                            TERMINAL_CONSOLE.innerHTML += `<br><span>ls: cannot access '.': Permission denied</span>`;
                    }
                    else                                       // use on a target(s)
                        printAnyFileNodeInfo(command_components);
                }
                else if (command_components[0].includes('-l') || command_components[0].includes('-a')) { // ls - list all visible directories in pwd in a list
                    if (!command_components.slice(1).length) { // use on self
                        if (SUDO || permissionCheck(goToDir(DIR), 'r'))
                            printFilenodeInfoList(cur_dir, command_components[0]);
                        else
                            TERMINAL_CONSOLE.innerHTML += `<br><span>ls: cannot access '.': Permission denied</span>`;
                    }
                    else                                       // use on a target(s)
                        printAnyFileNodeInfo(command_components.slice(1), command_components[0]);
                }
                else if (command_components[0].includes('-'))  // all invalid options
                    TERMINAL_CONSOLE.innerHTML += `<br><span>${command_name}: unrecognized option '${command_components[0]}'</span>`;
                break;
            
            case 'cd':
                if (command_components[0] == '--help') {
                    TERMINAL_CONSOLE.innerHTML += `<br><span>${command_name}: does not support any options; syntax: cd path/to/dir_name</span>`;
                }
                else if (command_components.length > 1) {
                    TERMINAL_CONSOLE.innerHTML += `<br><span>bash: ${command_name}: too many arguments</span>`;
                }
                else if (command.length == command_name.length || command_components[0] == '~') // aka just cd
                    DIR = HOME_DIR;
                else { 
                    let temp_filenode;
                    let temp_path;
                    // any path that starts with . or .. and doesnt include any . or .. in the middle
                    if (/^(\.\.?)$|^(\.\.?)\/[^\.]*$/.test(command_components[0]) && command_components[0] != '/') {
                        temp_path = pathInterpreter(DIR, command_components[0]);
                        temp_filenode = goToDir(temp_path);
                    }
                    // any absolute path or path starts with '~', doesnt matter if . or .. is in the middle
                    else if (command_components[0][0] == '/' || command_components[0][0] == '~') {        
                        temp_path = absolutePathInterpreter(command_components[0]);
                        temp_filenode = goToDir(temp_path);
                    }
                    // any path that starts at the current directory, could also start with . or ..
                    else {                                                                                
                        temp_path = absolutePathInterpreter(DIR + '/' + command_components[0]);
                        temp_filenode = goToDir(temp_path);
                    }
                    if (temp_filenode){
                        if (temp_filenode instanceof File)
                            TERMINAL_CONSOLE.innerHTML += `<br><span>bash: ${command_name}: ${command_components[0]}: Not a directory</span>`;
                        else {
                            if (SUDO || permissionCheck(temp_filenode, 'x'))
                                DIR = temp_path;
                            else 
                                TERMINAL_CONSOLE.innerHTML += `<br><span>bash: ${command_name}: ${command_components[0]}: Permission denied</span>`;

                        }
                    }
                    else 
                        TERMINAL_CONSOLE.innerHTML += `<br><span>bash: ${command_name}: ${command_components[0]}: No such file or directory</span>`;
                }
                break;

            case 'touch':
                if (command_components.includes('--help')) {
                    TERMINAL_CONSOLE.innerHTML += `<br><span>${command_name}: does not support any options; syntax: touch file_name</span>`;
                    TERMINAL_CONSOLE.innerHTML += `<br><span>${command_name}: can only create files in the current/working directory, no nesting allowed</span>`;
                    break;
                }
                let forbidden_characters = ['~', '-', '/', '$'];
                for (let i = 0; i < command_components.length; i++) {
                    if (forbidden_characters.includes(command_components[i][0])) continue;
                    if (command_components[i].includes("/")){
                        TERMINAL_CONSOLE.innerHTML += `<br><span>${command_name}: cannot touch nested files</span>`;
                        continue
                    }
                    if (SUDO || permissionCheck(cur_dir, 'w')) {
                        let owner = (SUDO) ? 'root' : CURRENT_USER.getUsername();
                        cur_dir.addFile(new File(command_components[i], owner, DEFAULT_FILE_PERMISSION, cur_dir));
                    }
                    else
                        TERMINAL_CONSOLE.innerHTML += `<br><span>${command_name}: cannot touch '${command_components[i]}': Permission denied'</span>`;
                }
                break;
    
            case 'echo':
                if (command_components.includes('--help')) {
                    TERMINAL_CONSOLE.innerHTML += `<br><span>${command_name}: does not support any options; syntax: echo text</span>`;
                    TERMINAL_CONSOLE.innerHTML += `<br><span>${command_name}: '>'|'>>' add-on is supported; syntax: echo text >|>> file</span>`;
                    break;
                }
                if (!command_components.includes('>') && !command_components.includes('>>')) {
                    TERMINAL_CONSOLE.innerHTML += `<br><span>${command_components.join(' ')}</span>`;
                    break;
                }
                else if (/> >>/g.test(command_components.join(' '))) {
                    TERMINAL_CONSOLE.innerHTML += `<br><span>bash: syntax error near unexpected token '>>'</span>`;
                    break;
                }
                else if (/>> >/g.test(command_components.join(' '))) {
                    TERMINAL_CONSOLE.innerHTML += `<br><span>bash: syntax error near unexpected token '>'</span>`;
                    break
                }
                let single_occurence = 0;
                for (let i = 0; i < command_components.length; i++) {
                    if (command_components[i] == '>' || command_components[i] == '>>')
                        single_occurence ++;
                }
                if (single_occurence > 1)
                    TERMINAL_CONSOLE.innerHTML += `<br><span>bash: multiple occurrences of '>' or '>>' are not supported</span>`;

                else {
                    let mode = (command_components.includes('>')) ? 'w' : 'a';
                    let text = [];
                    let path;
                    for (let i = 1; i < command_components.length; i++) {
                        if (command_components[i-1] == '>>' || command_components[i-1] == '>') {
                            path = command_components[i];
                            break;
                        }
                        else
                            text.push(command_components[i-1]);
                    }
                    text = text.join(' ').trim();
                    let temp_file;
                    // any path that starts with . or .. and doesnt include any . or .. in the middle
                    if (/^(\.\.?)$|^(\.\.?)\/[^\.]*$/.test(path) && path[0] != '/') 
                        temp_file = goToDir(pathInterpreter(DIR, path));
                    // any absolute path or path starts with '~', doesnt matter if . or .. is in the middle
                    else if (path[0] == '/' || path[0] == '~')           
                        temp_file = goToDir(absolutePathInterpreter(path));
                    // any path that starts at the current directory, could also start with . or ..
                    else                                                             
                        temp_file = goToDir(absolutePathInterpreter(DIR + '/' + path));
                    if (temp_file) {
                        if (temp_file instanceof File) {
                            if (SUDO || permissionCheck(temp_file, 'r')) 
                                temp_file.setFileContent(text, mode);
                            else 
                                TERMINAL_CONSOLE.innerHTML += `<br><span>bash: ${path}: Permission denied</span>`;
                        }
                        else 
                            TERMINAL_CONSOLE.innerHTML += `<br><span>bash: ${path}: Is a directory</span>`;
                    }
                    else 
                        TERMINAL_CONSOLE.innerHTML += `<br><span>bash: ${path}: No such file or directory</span>`;
                }
                break;

            case 'cat':
                if (command_components.includes('--help')) {
                    TERMINAL_CONSOLE.innerHTML += `<br><span>${command_name}: does not support any options; syntax: cat file_name</span>`;
                    break;
                }
                let stringHTML = ''
                for (let i = 0; i < command_components.length; i++) {
                    if (command_components[i] == '~') {
                        stringHTML += `<br><span>${command_name}: ${HOME_DIR}: Is a directory</span>`;
                        continue;
                    }
                    let temp_file;
                    // any path that starts with . or .. and doesnt include any . or .. in the middle
                    if (/^(\.\.?)$|^(\.\.?)\/[^\.]*$/.test(command_components[i]) && command_components[i][0] != '/')
                        temp_file = goToDir(pathInterpreter(DIR, command_components[i]));
                    // any absolute path or path starts with '~', doesnt matter if . or .. is in the middle
                    else if (command_components[i][0] == '/' || command_components[i][0] == '~')           
                        temp_file = goToDir(absolutePathInterpreter(command_components[i]));
                    // any path that starts at the current directory, could also start with . or ..
                    else                                                             
                        temp_file = goToDir(absolutePathInterpreter(DIR + '/' + command_components[i]));
                    
                    if (temp_file) {
                        if (temp_file instanceof File) {
                            if (SUDO || permissionCheck(temp_file, 'r')) 
                                stringHTML += (temp_file.getSize()) ? `<br><span>${temp_file.getFileContent()}</span>` : '';
                            else 
                                stringHTML += `<br><span>${command_name}: ${command_components[i]}: Permission denied</span>`;
                        }
                        else 
                            stringHTML += `<br><span>${command_name}: ${command_components[i]}: Is a directory</span>`;
                    }
                    else 
                        stringHTML += `<br><span>${command_name}: ${command_components[i]}: No such file or directory</span>`;
                }
                TERMINAL_CONSOLE.innerHTML += stringHTML;
                break;    

            case 'mkdir':
                if (command_components.includes('--help')) {
                    TERMINAL_CONSOLE.innerHTML += `<br><span>${command_name}: option supported: -m; syntax: ${command_name} -m 777 dir_name</span>`;
                    TERMINAL_CONSOLE.innerHTML += `<br><span>${command_name}: can only create directories in the current/working directory, no nesting allowed</span>`;
                    break;
                }
                if (command_components[0] == '-m' && /^[0-7]{3}$/.test(command_components[1])) { // checking for -m ### form
                    if (command_components.length > 3) break;
                    if (SUDO || permissionCheck(cur_dir, 'w')) {
                        let owner = (SUDO) ? 'root' : CURRENT_USER.getUsername();
                        if (!cur_dir.addDirectory(new Directory(command_components[2], owner, command_components[1], cur_dir)))
                            TERMINAL_CONSOLE.innerHTML += `<br><span>${command_name}: cannot create directory '${command_components[i]}': File eixists'</span>`;
                    }
                    else
                        TERMINAL_CONSOLE.innerHTML += `<br><span>${command_name}: cannot create directory '${command_components[i]}': Permission denied'</span>`;
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
                        if (SUDO || permissionCheck(cur_dir, 'w')) {
                            let owner = (SUDO) ? 'root' : CURRENT_USER.getUsername();
                            if (!cur_dir.addDirectory(new Directory(command_components[i], owner, DEFAULT_DIR_PERMISSION, cur_dir)))
                               TERMINAL_CONSOLE.innerHTML += `<br><span>${command_name}: cannot create directory '${command_components[i]}': File eixists'</span>`;
                        }
                        else
                            TERMINAL_CONSOLE.innerHTML += `<br><span>${command_name}: cannot create directory '${command_components[i]}': Permission denied'</span>`;
                    }
                }
                break;

            case 'rmdir':
                if (command_components.includes('--help')) {
                    TERMINAL_CONSOLE.innerHTML += `<br><span>${command_name}: does not support any options; syntax: rmdir dir_name</span>`;
                    TERMINAL_CONSOLE.innerHTML += `<br><span>${command_name}: can only remove directory(ies) in the current/working directory, no nesting allowed</span>`;
                    break;
                }
                else if (command_components[0] == "~") {
                    TERMINAL_CONSOLE.innerHTML += `<br><span>${command_name}: failed to remove '${HOME_DIR}': No nesting allowed</span>`;
                }
                else if (command_components.includes('.') || command_components.includes('..'))
                    TERMINAL_CONSOLE.innerHTML += `<br><span>${command_name}: failed to remove '.' or '..': Invalid argument</span>`;

                else {
                    for (let i = 0; i < command_components.length; i++) {
                        if (command_components[i].includes("/")){
                            TERMINAL_CONSOLE.innerHTML += `<br><span>${command_name}: failed to remove '${command_components[i]}': No nesting allowed</span>`;
                            continue
                        }
                        if (cur_dir.getChildren(command_components[i]) instanceof File)
                            TERMINAL_CONSOLE.innerHTML += `<br><span>${command_name}: failed to remove '${command_components[i]}': Not a directory</span>`;
                        else if (cur_dir.getChildren(command_components[i]).getChildren().length > 2)
                            TERMINAL_CONSOLE.innerHTML += `<br><span>${command_name}: failed to remove '${command_components[i]}': Directory not empty</span>`;

                        else if (!SUDO && !permissionCheck(cur_dir, 'w')) 
                            TERMINAL_CONSOLE.innerHTML += `<br><span>${command_name}: failed to remove '${command_components[i]}': Permission denied</span>`;
                            
                        else if (!cur_dir.removeFilenode(command_components[i]))
                               TERMINAL_CONSOLE.innerHTML += `<br><span>${command_name}: failed to remove '${command_components[i]}': No such file or directory</span>`;
                    }
                }
                break;

            case 'rm':
                if (command_components.includes('--help')) {
                    TERMINAL_CONSOLE.innerHTML += `<br><span>${command_name}: option supported -r -f -rf; syntax: rm -r|-f|-rf dir/file_name</span>`;
                    TERMINAL_CONSOLE.innerHTML += `<br><span>${command_name}: can only remove file(s) or directory(ies) in the current/working directory, no nesting allowed</span>`;
                    break;
                }
                let f_flag = command_components[0].includes('-') && command_components[0].includes('f');
                let r_flag = command_components[0].includes('-') && command_components[0].includes('r');
                let com_compo = (r_flag || f_flag) ? command_components.slice(1) : command_components;
                let og_size = cur_dir.getChildren().length;
                if (com_compo[0] == "~") {
                    TERMINAL_CONSOLE.innerHTML += `<br><span>${command_name}: cannot remove '${HOME_DIR}': No nesting allowed</span>`;
                }
                else if (com_compo.includes('.') || com_compo.includes('..'))
                    TERMINAL_CONSOLE.innerHTML += `<br><span>${command_name}: cannot remove '.' or '..': Invalid argument</span>`;
                else if (r_flag && f_flag && com_compo[0] == '/') {
                    TERMINAL_CONSOLE.innerHTML += `<br><span>${command_name}: it is dangerous to operate recursively on '/'</span>`;
                    TERMINAL_CONSOLE.innerHTML += `<br><span>${command_name}: use --no-preserve-root to override this failsafe</span>`;
                }
                else if (r_flag && f_flag && com_compo.includes('--no-preserve-root') && com_compo.includes('/')) {   // 👀
                    if (!SUDO) {
                        TERMINAL_CONSOLE.innerHTML += `<br><span>Only root may execute such a devastating command...</span>`;
                        break;
                    }
                    TERMINAL_CONSOLE.innerHTML += `<br><span><img src="../../assets/img/whatmini.gif" alt=""/> DON'T DO IT!</span>`;
                    SU_TARGET = 'root';
                    PASSWORD_IN_PROGRESS = true;
                    SELF_DESTRUCT = true;
                }
                else {
                    for (let i = 0; i < com_compo.length; i++) {
                        if (com_compo[i].includes("/")){
                            TERMINAL_CONSOLE.innerHTML += `<br><span>${command_name}: cannot remove '${com_compo[i]}': No nesting allowed</span>`;
                            continue
                        }
                        if (cur_dir.getChildren(com_compo[i]) instanceof Directory){
                            if (!f_flag && !r_flag) {
                                TERMINAL_CONSOLE.innerHTML += `<br><span>${command_name}: cannot remove '${com_compo[i]}': Is a directory</span>`;
                            }
                            if (!r_flag)
                                continue;
                        }
                        if (!SUDO && !permissionCheck(cur_dir, 'w')) 
                            TERMINAL_CONSOLE.innerHTML += `<br><span>${command_name}: cannot remove '${com_compo[i]}': Permission denied</span>`;
                            
                        else if (!cur_dir.removeFilenode(com_compo[i]) && !f_flag)
                               TERMINAL_CONSOLE.innerHTML += `<br><span>${command_name}: cannot remove '${com_compo[i]}': No such file or directory</span>`;
                    }
                }
                if (og_size > cur_dir.getChildren().length) {
                    if (!goToDir(HOME_DIR))
                        HOME_DIR = DIR;
                }
                break;

            case 'su':
                if (command_components.includes('--help')) {
                    TERMINAL_CONSOLE.innerHTML += `<br><span>${command_name}: does not support any option; syntax: su username</span>`;
                    break;
                }
                if (!USERS[command_components[0]]) 
                    TERMINAL_CONSOLE.innerHTML += `<br><span>${command_name}: user ${command_components[0]} does not exist or the user entry does not contain all the required fields</span>`;
                else {
                    PASSWORD_IN_PROGRESS = true;
                    SU_TARGET = command_components[0];
                }
                break;

            case 'adduser':
                if (command_components.includes('--help')) {
                    TERMINAL_CONSOLE.innerHTML += `<br><span>${command_name}: does not support any option; syntax: sudo adduser username</span>`;
                    break;
                }
                if (!SUDO) {
                    TERMINAL_CONSOLE.innerHTML += `<br><span>fatal: Only root may add a user to the system.</span>`;
                }
                else if (command_components.length > 1)
                    TERMINAL_CONSOLE.innerHTML += `<br><span>fatal: Only one name is allowed.</span>`;
                else if (USERS[command_components[0]])
                    TERMINAL_CONSOLE.innerHTML += `<br><span>fatal: The user \`${command_components[0]}' already exists.</span>`;
                else if (/^\./.test(command_components[0]))
                    TERMINAL_CONSOLE.innerHTML += `<br><span>fatal: The name must not start with '.' character.</span>`;
                else {
                    let username = command_components[0];
                    USERS[username] = new User(username);
                    ROOT_DIR.getChildren('home').addDirectory(new Directory(username, username, '750', ROOT_DIR.getChildren('home')));
                }
                break;

            case 'deluser':
                if (command_components.includes('--help')) {
                    TERMINAL_CONSOLE.innerHTML += `<br><span>${command_name}: does not support any option; syntax: sudo deluser username</span>`;
                    break;
                }
                if (!SUDO) {
                    TERMINAL_CONSOLE.innerHTML += `<br><span>fatal: Only root may remove a user to the system.</span>`;
                }
                else if (command_components[0] == 'root') {
                    TERMINAL_CONSOLE.innerHTML += `<br><span>fatal: WARNING: You are just about to delete the root account (uid 0). Usually this is never required as it may render the whole system unsuable. If you really want this, call deluser with parameter --no-preserve-root. Stopping now without having performed any action</span>`;
                }
                else if (command_components.includes('root') && command_components.includes('--no-preserve-root')){
                    TERMINAL_CONSOLE.innerHTML += `<br><span><img src="../../assets/img/whatmini.gif" alt=""/> DON'T DO IT!</span>`;
                    SU_TARGET = 'root';
                    PASSWORD_IN_PROGRESS = true;
                    SELF_DESTRUCT = true;
                }
                else if (command_components.length > 1)
                    TERMINAL_CONSOLE.innerHTML += `<br><span>fatal: Only one name is allowed.</span>`;
                else if (!USERS[command_components[0]])
                    TERMINAL_CONSOLE.innerHTML += `<br><span>fatal: The user \`${command_components[0]}' does not exist.</span>`;
                else if (CURRENT_USER.getUsername() == command_components[0]) 
                    TERMINAL_CONSOLE.innerHTML += `<br><span>fatal: The user \`${command_components[0]}' is currently logged in.</span>`;
                else {
                    const home_dir = ROOT_DIR.getChildren('home');
                    home_dir.removeFilenode(command_components[0]);
                    delete USERS[command_components[0]];
                    DIR = HOME_DIR;
                }
                break;
               
            case 'chmod':
                if (command_components.includes('--help')) {
                    TERMINAL_CONSOLE.innerHTML += `<br><span>${command_name}: does not support any option; syntax: chmod ### filenode</span>`;
                    TERMINAL_CONSOLE.innerHTML += `<br><span>${command_name}: only one target filenode is allowed</span>`;
                    break;
                }
                else if (command_components.length > 2) {
                    TERMINAL_CONSOLE.innerHTML += `<br><span>${command_name}: too many arguments</span>`;
                }
                else if ((command_components.length < 2))
                    break;
                else {
                    let temp_filenode;
                    let temp_path;
                    let perm = command_components[0];
                    let filenode_name = command_components[1]
                    if (!/^[0-7]{3}$/.test(perm) || perm.length != 3) {
                        TERMINAL_CONSOLE.innerHTML += `<br><span>${command_name}: invalid mode: '${perm}'</span>`;
                        break;
                    }
                    // any path that starts with . or .. and doesnt include any . or .. in the middle
                    if (/^(\.\.?)$|^(\.\.?)\/[^\.]*$/.test(filenode_name) && filenode_name != '/') {
                        temp_path = pathInterpreter(DIR, filenode_name);
                        temp_filenode = goToDir(temp_path);
                    }
                    // any absolute path or path starts with '~', doesnt matter if . or .. is in the middle
                    else if (filenode_name[0] == '/' || filenode_name[0] == '~') {        
                        temp_path = absolutePathInterpreter(filenode_name);
                        temp_filenode = goToDir(temp_path);
                    }
                    // any path that starts at the current directory, could also start with . or ..
                    else {                                                                                
                        temp_path = absolutePathInterpreter(DIR + '/' + filenode_name);
                        temp_filenode = goToDir(temp_path);
                    }
                    if (temp_filenode){
                        if (temp_filenode.getParent() == null || temp_filenode.getName() == 'root') {
                            TERMINAL_CONSOLE.innerHTML += `<br><span>${command_name}: changing permissions of '${filenode_name}': Operation not permitted</span>`;
                            break;
                        }
                        if (!SUDO && !permissionCheck(temp_filenode.getParent(), 'w'))
                            TERMINAL_CONSOLE.innerHTML += `<br><span>${command_name}: changing permissions of '${filenode_name}': Operation not permitted</span>`;
                        else 
                            temp_filenode.setPermission(perm);
                    }
                    else 
                        TERMINAL_CONSOLE.innerHTML += `<br><span>${command_name}: cannot access '${filenode_name}': No such file or directory</span>`;
                }
                
                break;

            case 'clear':
                if (command_components.includes('--help')) {
                    TERMINAL_CONSOLE.innerHTML += `<br><span>${command_name}: does not support any options; syntax: clear</span>`;
                    break;
                }
                else if (command.length > command_name.length) {
                    TERMINAL_CONSOLE.innerHTML += `<br><span>${command_name}: extra operand '${command_components[0]}'</span>`;
                    break;
                }
                TERMINAL_CONSOLE.innerHTML = '';
                CURSOR_POS == 0;
                break;

            case 'history':
                if (command_components[0] == '--help') {
                    TERMINAL_CONSOLE.innerHTML += `<br><span>${command_name}: option supported -c, ##; syntax: history -c|##</span>`;
                }
                else if (command_components[0] == '-c') { // delete history 👀
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
                if (command_components[0] == '--help') {
                    TERMINAL_CONSOLE.innerHTML += `<br><span>${command_name}: does not support any options; syntax: pwd</span>`;
                }
                else
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

            case 'umask':
                if (command_components[0] == '--help') {
                    TERMINAL_CONSOLE.innerHTML += `<br><span>${command_name}: does not support any options; syntax: umask</span>`;
                    break;
                }
                else if (command.length > command_name.length) {
                    TERMINAL_CONSOLE.innerHTML += `<br><span>bash: ${command_name}: '${command_components[0][0]}': invalid symbolic mode operator</span>`;
                    break;
                }
                TERMINAL_CONSOLE.innerHTML += `<br><span>${UMASK}</span>`;
                break;
                
            case 'man':
                if (command_components[0] == '--help') {
                    TERMINAL_CONSOLE.innerHTML += `<br><span>${command_name}: does not support any options; syntax: man command_name</span>`;
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
                    for (let i = 0; i < command_components.length; i++) {
                        let found = false;
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
                if (SUDO)
                    TERMINAL_CONSOLE.innerHTML += `<br><span>sudo: ${command_name}: command not found</span>`;
                else
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
                if (filenode instanceof File) {
                    if (/x$/.test(octalToReadable(filenode.getPermission())))
                        stringHTML += `<span class="terminal-file-exec">${filenode.getName()}</span><span>  </span>`;
                    else
                        stringHTML += `<span>${filenode.getName()}</span><span>  </span>`;
                }
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
            const denied_dir = [];
            const good_dir_obj = [];
            const good_dir_name = [];
            for (let i = 0; i < dir_arr.length; i++) {
                if (dir_arr[i] == '~') {
                    good_dir_obj.push(goToDir(HOME_DIR));
                    good_dir_name.push(HOME_DIR);
                    continue;
                }
                let temp_dir;
                // any path that starts with . or .. and doesnt include any . or .. in the middle
                if (/^(\.\.?)$|^(\.\.?)\/[^\.]*$/.test(dir_arr[i]) && dir_arr[i][0] != '/') 
                    temp_dir = goToDir(pathInterpreter(DIR, dir_arr[i]));
                // any absolute path or path starts with '~', doesnt matter if . or .. is in the middle
                else if (dir_arr[i][0] == '/' || dir_arr[i][0] == '~')           
                    temp_dir = goToDir(absolutePathInterpreter(dir_arr[i]));
                // any path that starts at the current directory, could also start with . or ..
                else                                                             
                    temp_dir = goToDir(absolutePathInterpreter(DIR + '/' + dir_arr[i]));
                
                if (temp_dir) {
                    if (SUDO || permissionCheck(temp_dir, 'r')) 
                        good_dir_obj.push(temp_dir), good_dir_name.push(dir_arr[i]);
                    else 
                        denied_dir.push(dir_arr[i]);
                }
                else
                    bad_dir.push(dir_arr[i]);
            }
            for (let i = 0; i < bad_dir.length; i++) 
                TERMINAL_CONSOLE.innerHTML += `<br><span>ls: cannot access '${bad_dir[i]}': No such file or directory</span>`;
            
            for (let i = 0; i < denied_dir.length; i++) 
                TERMINAL_CONSOLE.innerHTML += `<br><span>ls: cannot access '${denied_dir[i]}': Permission denied</span>`;
            
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
                        if (flag_file && bad_dir.length == 0 && good_dir_obj.length > 1 && i == 0) 
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
            for (let username in USERS) {
                if (USERS.hasOwnProperty(username)) {
                    if (username.length > maxUsername_length) 
                        maxUsername_length = username.length;
                }
            }
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
            else {
                if (/x$/.test(octalToReadable(filenode.getPermission())))
                    (customized_name) ? stringHTML += ` <span class="terminal-file-exec">${customized_name}</span>` : stringHTML += ` <span class="terminal-file-exec">${filenode.getName()}</span>`;
                else
                    (customized_name) ? stringHTML += ` ${customized_name}` : stringHTML += ` ${filenode.getName()}`;

            }
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
            manual.push({'help': `<br><span>--help: add anywhere after the command to see available options and short guide`});
            manual.push({'ls':`<br><span>ls (-a, -l, -la): list directory contents (show hidden, show as list, show as both)`});
            manual.push({'cd':`<br><span>cd: change the working directory`});
            manual.push({'touch':`<br><span>touch: change file timestamps`});
            manual.push({'echo':`<br><span>echo: display a line of text`});
            manual.push({'cat':`<br><span>cat: concatenate files and print on the standard output`});
            manual.push({'rm':`<br><span>rm: (-r, -f, -rf) remove files or directories (remove directory, ignore nonexistent filenode, both)`});
            manual.push({'mkdir':`<br><span>mkdir (-m ###): make directories (specify permission in octal)`});
            manual.push({'rmdir':`<br><span>rmdir: remove the directory(ies), if they are empty`});
            manual.push({'sudo':`<br><span>sudo: a powerful command add-on that lets you bypass almost any restriction (use with caution)`});
            manual.push({'su':`<br><span>su: simply change to another available user`});
            manual.push({'adduser':`<br><span>adduser: add users, must be used with sudo`});
            manual.push({'deluser':`<br><span>delsuer: remove a user, must be used with sudo`});
            manual.push({'chmod':`<br><span>chmod: change file mode bits`});
            manual.push({'pwd':`<br><span>pwd: print name of current/working directory`});
            manual.push({'whoami':`<br><span>whoami: print effective user name`});
            manual.push({'umask':`<br><span>umask: display file mode creation mask`});
            manual.push({'clear':`<br><span>clear: clear the terminal screen`});
            manual.push({'history':`<br><span>history (-c, ##): GNU History Library (clear list, show amount from bottom up)`});

            manual.push({'man':`<br><span>man: print the system reference manuals`});
            return manual;
        }
    }

    // INITIALIZE //
    function InitUser() {
        return {'root': new User('root'), 'vuila9': new User('vuila9'), 'ptkv': new User('ptkv')};
    }

    function InitFileSystem() {
        const root = new Directory('/', 'root', DEFAULT_DIR_PERMISSION);
        root.addDirectory(new Directory('.', 'root', DEFAULT_DIR_PERMISSION, root));
        root.addDirectory(new Directory('..', 'root', DEFAULT_DIR_PERMISSION, root));
        root.addDirectory(new Directory('bin', 'root', DEFAULT_DIR_PERMISSION, root));
        root.addDirectory(new Directory('home', 'root', DEFAULT_DIR_PERMISSION, root));
        root.addDirectory(new Directory('home', 'root', DEFAULT_DIR_PERMISSION, root)); // would not add
        root.addDirectory(new Directory('src', 'root', DEFAULT_DIR_PERMISSION, root));
        root.getChildren('src').addDirectory(new Directory('.?', 'root', DEFAULT_DIR_PERMISSION, root));
        root.getChildren('src').getChildren('.?').addFile(new File('trust_me_bro', 'root', DEFAULT_DIR_PERMISSION, root.getChildren('src').getChildren('.?')));
        root.getChildren('src').getChildren('.?').getChildren('trust_me_bro').setFileContent('trust him bro');

        const home = root.getChildren('home');
        home.addDirectory(new Directory('vuila9', 'vuila9', DEFAULT_DIR_PERMISSION, home));
        home.addDirectory(new Directory('ptkv', 'ptkv', DEFAULT_DIR_PERMISSION, home));

        const vuila9 = home.getChildren('vuila9');
        vuila9.addDirectory(new Directory('code', 'vuila9', DEFAULT_DIR_PERMISSION, vuila9));
        vuila9.addDirectory(new Directory('this', 'vuila9', DEFAULT_DIR_PERMISSION, vuila9));
        vuila9.addDirectory(new Directory('fun', 'vuila9', DEFAULT_DIR_PERMISSION, vuila9));
        vuila9.addDirectory(new Directory('...is', 'vuila9', DEFAULT_DIR_PERMISSION, vuila9));
        vuila9.addDirectory(new Directory('just', 'vuila9', DEFAULT_DIR_PERMISSION, vuila9));
        vuila9.addDirectory(new Directory('..for', 'vuila9', DEFAULT_DIR_PERMISSION, vuila9));
        vuila9.addDirectory(new Directory('.-.for', 'vuila9', DEFAULT_DIR_PERMISSION, vuila9));
        vuila9.addDirectory(new Directory('.testing', 'vuila9', DEFAULT_DIR_PERMISSION, vuila9));
        vuila9.addDirectory(new Directory('I', 'vuila9', DEFAULT_DIR_PERMISSION, vuila9));
        vuila9.addDirectory(new Directory('.will', 'vuila9', DEFAULT_DIR_PERMISSION, vuila9));
        vuila9.addDirectory(new Directory('.delete', 'vuila9', DEFAULT_DIR_PERMISSION, vuila9));
        vuila9.addFile(new File('later', 'vuila9', DEFAULT_FILE_PERMISSION, vuila9));
        vuila9.addFile(new File('GitHub', 'vuila9', '007', vuila9));
        vuila9.getChildren('GitHub').setFileContent("https://vuila9.github");
        vuila9.getChildren('GitHub').setFileContent(".io/", 'a');
        vuila9.addFile(new File('.hidden', 'vuila9', DEFAULT_FILE_PERMISSION, vuila9));
        vuila9.getChildren('.hidden').setFileContent("you cant possibly read this, or can you 👀");

        const ptkv = home.getChildren('ptkv');
        ptkv.addDirectory(new Directory('ex', 'ptkv', DEFAULT_DIR_PERMISSION, ptkv));
        ptkv.getChildren('ex').addDirectory(new Directory('me', 'ptkv', DEFAULT_DIR_PERMISSION, ptkv.getChildren('ex')));
        ptkv.addFile(new File('MKNQ', 'ptkv', DEFAULT_FILE_PERMISSION, ptkv));
        ptkv.getChildren('MKNQ').setFileContent("still a mystery...");

        const code = vuila9.getChildren('code');
        code.addDirectory(new Directory('is', 'vuila9', DEFAULT_DIR_PERMISSION, code));
        code.addDirectory(new Directory('is', 'vuila9', DEFAULT_DIR_PERMISSION, code));  // would not add
        code.getChildren('is').addFile(new File('fun', 'vuila9', DEFAULT_FILE_PERMISSION, code.getChildren('is')));
        code.getChildren('is').getChildren('fun').setFileContent("code is fun");

        code.addFile(new File('goal', 'vuila9', DEFAULT_FILE_PERMISSION, code));
        code.addFile(new File('goal', 'vuila9', DEFAULT_FILE_PERMISSION, code));         // would not add
        code.getChildren('goal').setFileContent("need to ace the Google Interview");

        return root;
    }
}
