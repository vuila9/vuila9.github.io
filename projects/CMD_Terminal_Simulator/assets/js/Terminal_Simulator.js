function START_UBUNTU_TERMINAL() {
    const TERMINAL_CONSOLE = document.getElementById('terminal-body');
    const USERS = InitUser();          // Initialize some users
    const ROOT_DIR = InitFileSystem(); // Initialize pre-built file structure that starts at root directory
    let CURRENT_USER = USERS[1];       // default user, vuila9
    let DIR = `/home/${CURRENT_USER.getUsername()}`; // default current directory, pwd
    let HOME_DIR = `/home/${CURRENT_USER.getUsername()}`;
    let DOMAIN = 'github.io';
    let THE_PROMPT = `${CURRENT_USER.getUsername()}@${DOMAIN}:~$`; // need to make a function to assign this automatically
    let COMMAND = '';
    let CURSOR_POS = 0;    // track where the cursor is
    let HISTORY_POS = 0;   
    let HISTORY_COMMAND = [];

    addTitleBar();
    addThePrompt();
    appendCursor('last');

    TERMINAL_CONSOLE.focus();

    TERMINAL_CONSOLE.addEventListener('keydown', (event) => {
        let arrow_keys = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'];
        removeCursor();

        if (event.key === 'Enter') { // Extract the user input
            
            const userInput = COMMAND.trim();
            if (COMMAND.length)
                HISTORY_COMMAND.push(COMMAND);
            console.log('User Input:', userInput);  // Do something with the input

            // THIS IS WHERE YOU DO YOUR COMMAND HANDLER
            command_handler(userInput);

            // Append the user input and move to the next line
            if (TERMINAL_CONSOLE.innerHTML.length > 0) 
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

        else if (event.key === 'Tab') { // will need to come back to this eventually
            event.preventDefault(); // Prevent the default action (switch focus field)
        }
        else if (event.key === 'ArrowUp') {
            event.preventDefault(); // Prevent the default action (scrolling up)
            const inputLine = TERMINAL_CONSOLE.querySelectorAll("span");
            HISTORY_POS--;
            HISTORY_POS = (HISTORY_POS < 0) ? 0 : HISTORY_POS;
            COMMAND = HISTORY_COMMAND[HISTORY_POS];
            CURSOR_POS = COMMAND.length;
            inputLine[inputLine.length - 1].innerText = `${COMMAND}`;
            appendCursor('last');
        }
        else if (event.key === 'ArrowDown') {
            event.preventDefault(); // Prevent the default action (scrolling down)
            const inputLine = TERMINAL_CONSOLE.querySelectorAll("span");
            HISTORY_POS++;
            HISTORY_POS = (HISTORY_POS >= HISTORY_COMMAND.length) ? (HISTORY_COMMAND.length) : HISTORY_POS;
            COMMAND = HISTORY_COMMAND[HISTORY_POS];
            if (typeof COMMAND !== 'undefined') {
                CURSOR_POS = 0;
                inputLine[inputLine.length - 1].innerText = `${COMMAND}`;
            }
            else {
                CURSOR_POS = 0;
                COMMAND = '';
                inputLine[inputLine.length - 1].innerText = '';
            }
            appendCursor('last');
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
        if (DIR.split('').every(char => char === '/')) // if dir is string of '/'s, treat as '/' aka root
            return '/';
        if (DIR === `/home/${CURRENT_USER.getUsername()}`)
            return `~`
        else if (DIR.includes(`/home/${CURRENT_USER.getUsername()}`, 0))
            return `~${DIR.slice(HOME_DIR.length)}`;
        else 
            return (DIR[DIR.length - 1] == "/") ? DIR.slice(0, DIR.length - 1) : DIR;
        
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

    function command_handler(command) {
        if (command.split(' ')[0] != 'echo' && !command.split(' ').includes(">>"))
            command = command.replace(/ {2,}/g, ' '); // replace any excess amount for every " " occurence
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
                else if (command_components[0] == '-a') { // ls -a 
                    if (!command_components.slice(1).length)
                        printFileNodeName(cur_dir, '-a');
                    else
                        printFileNodeNameMulti(command_components.slice(1), '-a');
                }
                else if (command_components[0] == null || command_components[0][0] != '-') { // ls - naked command with no option included
                    if (!command_components.length) 
                        printFileNodeName(cur_dir);
                    else
                        printFileNodeNameMulti(command_components);
                }
                else if (command_components[0].includes('-l')) { // ls - list all visible directories in pwd in a list
                    TERMINAL_CONSOLE.innerHTML += '<br>';
                    if (command_components.length > 1) { // ls - handle when 'ls -l' is used on a directory or a file
                        let stringHTML = '';
                        for (let i = 1; i < command_components.length; i++) {
                            const filenode = cur_dir.getChildren(command_components[i]);
                            if (!filenode)
                                stringHTML += `<span>${command_name}: cannot access '${command_components[i]}': No such file or directory</span>`;
                            else {
                                if (filenode instanceof Directory)
                                    stringHTML += `<span>Feature not supported, to view content of a directory, cd into it</span>`;
                                else if (filenode instanceof File) {
                                    stringHTML += `<span>${printFilenodeInfo(filenode)}</span>`;
                                }
                            }
                            TERMINAL_CONSOLE.innerHTML += stringHTML;
                            if (i < command_components.length - 1) // print newline <br> for every item except the last one
                                TERMINAL_CONSOLE.innerHTML += `<br>`;
                        }
                    }
                    else 
                        printFilenodeInfoList(cur_dir, command_components[0]); // list all available directories in pwd in a list
                }
                else if (command_components[0].includes('-')) { // all invalid options
                    TERMINAL_CONSOLE.innerHTML += `<br><span>${command_name}: unrecognized option '${command_components[0]}'</span>`;
                }
                else { // handle when 'ls' is used on a directory or a file
                    TERMINAL_CONSOLE.innerHTML += '<br>';
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
                    TERMINAL_CONSOLE.innerHTML += `<br><span>${command_name}: -m ### (perm) dir</span>`;
                }
                else if (command_components.length == 3 && command_components[0] == '-m' && /^[0-7]{3}$/.test(command_components[1])) { // checking for -m ### form
                    if (!cur_dir.addDirectory(new Directory(command_components[2], CURRENT_USER.getUsername(), command_components[1], cur_dir)))
                        TERMINAL_CONSOLE.innerHTML += `<br><span>${command_name}: cannot create directory '${command_components[i]}': File eixists'</span>`;
                }
                else {
                    for (let i = 0; i < command_components.length; i++) {
                        if (command_components[i][0] == '-') continue;
                        if (command_components[i].includes("/")){
                            TERMINAL_CONSOLE.innerHTML += `<br><span>${command_name}: cannot create nested directories</span>`;
                            continue
                        }
                        if (!cur_dir.addDirectory(new Directory(command_components[i], CURRENT_USER.getUsername(), '775', cur_dir)))
                            TERMINAL_CONSOLE.innerHTML += `<br><span>${command_name}: cannot create directory '${command_components[i]}': File eixists'</span>`;
                    }
                }
                break;

            case 'cd':
                if (command_components.includes('--help')) {
                    TERMINAL_CONSOLE.innerHTML += `<br><span>${command_name}: does not support any options</span>`;
                }
                else if (command_components.length > 1) {
                    TERMINAL_CONSOLE.innerHTML += `<br><span>bash: ${command_name}: too many arguments</span>`;
                }
                else if (command.length == command_name.length) // aka just cd
                    DIR = HOME_DIR;
                else {
                    const filtered_command_components = command_components[0].replace(/\/{2,}/g, '/'); // replace any excess amount for every "/" occurence
                    if (filtered_command_components == '/') 
                        DIR = "/";
                    else if (command_components[0] == ".") 
                        break;
                    else if (command_components[0] == "..") {
                        if (DIR != "/")
                            DIR = cur_dir.getParentPath();
                    }
                    else if (command_components[0] == "~")
                        DIR = HOME_DIR;
                    else if (command_components[0][0] != '/'){
                        if (goToDir(DIR + "/" + filtered_command_components))
                            DIR += (DIR == "/") ? filtered_command_components : "/" + filtered_command_components;
                        else 
                            TERMINAL_CONSOLE.innerHTML += `<br><span>bash: ${command_name}: ${command_components[0]}: No such file or directory</span>`;
                    }
                    else if (cur_dir.getChildren(command_components[0]))    // cd in a dir in current directory 
                        DIR += (DIR == "/") ? filtered_command_components : "/" + filtered_command_components;
                    else if (!goToDir(filtered_command_components)) // path/to/dir but not exist
                        TERMINAL_CONSOLE.innerHTML += `<br><span>bash: ${command_name}: ${command_components[0]}: No such file or directory</span>`;
                    else if (goToDir(filtered_command_components) instanceof File) // path/to/file but it's a file
                        TERMINAL_CONSOLE.innerHTML += `<br><span>bash: ${command_name}: ${command_components[0]}: Not a directory</span>`;
                    else  // absolute path
                        DIR = filtered_command_components;
                }
                break

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
            console.log(cur_dir)
            var stringHTML = '';
            for (let i = 0; i < cur_dir.getChildren().length; i++) {
                const filenode = cur_dir.getChildren()[i];
                if (option != '-a' && filenode.getName()[0] == ".") continue
                if (filenode instanceof File)
                    stringHTML += `<span>${filenode.getName()}</span></span><span>  </span>`;
                else if (filenode instanceof Directory)
                    stringHTML += `<span class="terminal-directory">${filenode.getName()}</span><span>  </span>`;
            }
            if (stringHTML) {
                TERMINAL_CONSOLE.innerHTML += '<br>';
            }
            TERMINAL_CONSOLE.innerHTML += stringHTML;
        }

        function printFileNodeNameMulti(dir_arr, option='') {
            const bad_dir = [];
            const good_dir_obj = [];
            const good_dir_name = [];
            for (let i = 0; i < dir_arr.length; i++) {
                if (dir_arr[i] == '.') {
                    good_dir_obj.push(goToDir(DIR));
                    good_dir_name.push(dir_arr[i]);
                }
                else if (dir_arr[i] == '~') {
                    good_dir_obj.push(goToDir(HOME_DIR));
                    good_dir_name.push(HOME_DIR);
                }
                else if (dir_arr[i][0] == '/') {
                    const temp_dir = goToDir(dir_arr[i]);
                    (temp_dir) ? (good_dir_obj.push(temp_dir),  good_dir_name.push(dir_arr[i])): bad_dir.push(dir_arr[i]);
                }
                else {
                    if (dir_arr[i].includes('/')) {
                        const temp_dir = goToDir(DIR + '/' + dir_arr[i]);
                        (temp_dir) ? (good_dir_obj.push(temp_dir), good_dir_name.push(dir_arr[i])) : bad_dir.push(dir_arr[i]);
                    }
                    else {
                        console.log("hello world")
                        const temp_dir = goToDir(DIR).getChildren(dir_arr[i]);
                        (temp_dir) ? (good_dir_obj.push(temp_dir), good_dir_name.push(dir_arr[i])) : bad_dir.push(dir_arr[i]);
                    }
                }
            }
            for (let i = 0; i < bad_dir.length; i++) {
                TERMINAL_CONSOLE.innerHTML += `<br><span>ls: cannot access '${bad_dir[i]}': No such file or directory</span>`;
            }
            let flag = (good_dir_obj.length > 1);
            for (let i = 0; i < good_dir_obj.length; i++) {
                if (flag) TERMINAL_CONSOLE.innerHTML += `<br><span>${good_dir_name[i]}:<span>`;
                printFileNodeName(good_dir_obj[i], option);
                if (flag && i != good_dir_obj.length - 1) TERMINAL_CONSOLE.innerHTML += `<br>`;
            }
        }

        function printFilenodeInfo(filenode, option=[]){
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
                stringHTML += " " + "?".toString().padStart(3, ' ');  // I'm so done with this hardlink bs
            else
                stringHTML += " " + filenode.getHardlink().toString().padStart(3, ' ');
            stringHTML += " " + filenode.getOwner().padEnd(maxUsername_length, ' ');
            stringHTML += " " + filenode.getSize().toString().padStart(4, ' ');
            if (filenode instanceof Directory)
                stringHTML += " " + `<span class="terminal-directory">${filenode.getName()}</span>`;
            else 
                stringHTML += ` ${filenode.getName()}`;

            return stringHTML;
        }

        function printFilenodeInfoList(cur_dir, option) {
            if (option.length > 3) {
                TERMINAL_CONSOLE.innerHTML += `<span>ls: unrecognized option '${option}'</span>`;
                return;
            }
            let total_size = 0;
            for (let i = 0; i < cur_dir.getChildren().length; i++) {
                const filenode = cur_dir.getChildren()[i];
                if (filenode.getName()[0] != '.' || option.includes('a')) {
                    total_size += filenode.getSize();
                }
            }

            TERMINAL_CONSOLE.innerHTML += `<span>total ${Math.floor(total_size/1024)}</span><br>`;
            for (let i = 0; i < cur_dir.getChildren().length; i++) {
                const filenode = cur_dir.getChildren()[i];
                if (filenode.getName()[0] != '.' || option.includes('a')) {
                    TERMINAL_CONSOLE.innerHTML += `<span>${printFilenodeInfo(filenode)}</span><br>`;

                }
            }
            TERMINAL_CONSOLE.removeChild(TERMINAL_CONSOLE.lastChild); // remove extra <br> tag at the end
        }

        function printHistory(line=HISTORY_COMMAND.length) {
            let span = HISTORY_COMMAND.length.toString().length;
            for (let i = HISTORY_COMMAND.length - line; i < HISTORY_COMMAND.length; i++) {
                TERMINAL_CONSOLE.innerHTML += `<br><span>  ${(i+1).toString().padStart(span, ' ')}  ${HISTORY_COMMAND[i]}</span>`;
            }
        }

        // man //
        function allAvailableSupportedCommands() {
            let manual = []
            manual.push({'help': `<br><span>--help: add anywhere after the command to see available options`});
            manual.push({'pwd':`<br><span>pwd: print name of current/working directory`});
            manual.push({'whoami':`<br><span>whoami: print effective user name`});
            manual.push({'ls':`<br><span>ls (-a, -l, -la): list directory contents`});
            manual.push({'clear':`<br><span>clear: clear the terminal screen`});
            manual.push({'mkdir':`<br><span>mkdir (-m ###): make directories`});
            manual.push({'cd':`<br><span>cd: change the working directory`});
            manual.push({'history':`<br><span>history (-c, ##): GNU History Library`});

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