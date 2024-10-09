let USER_COUNT = 0

class User {
    constructor(username) {
        this.username = username;
        this.password = username;
        if (USER_COUNT == 0) {
            this.uid = '0';
            this.gid = '0';
            this.group = '0';
        }
        this.uid   = '100' + USER_COUNT;
        this.gid   = '100' + USER_COUNT;
        this.group = '100' + USER_COUNT;
        USER_COUNT++;
    }

    getUsername() {
        return this.username;
    }

    setUsername() {
        this.username = username;
    }

    getPassword() {
        return this.password;
    }

    setPassword(password) {
        this.password = password;
    }
}

class File {
    constructor(name, owner, permission = '744', parent=null){
        this.name = name;
        this.owner = owner;
        this.content = "";
        this.permission = permission;
        this.size = '?';
        this.parent = parent;
        this.parent_name = (parent) ? parent.getName() : null;
        this.parent_path = (this.parent_name) ? this.parent_name + "/" : null;
    }

    getName() {
        return this.name;
    }

    setName(name) {
        this.name = name;
    }
    
    setFileContent(content, type) {
        if (type == "write")
            this.content = content;
        else if (type == "append")
            this.content += content;
    }

    getFileContent() {
        return this.content;
    }

    getParent() {
        return this.parent;
    }

    getParentName() {
        return this.parent_name;
    }

    setParentName(parent_name) {
        this.parent_name = parent_name;
    }

    getParentPath() {
        return this.parent_path;
    }

    setParentPath(parent_path) {
        this.parent_path = parent_path;
    }

    getOwner() {
        return this.owner;
    }
}

class Directory {
    constructor(name, owner, permission = '744', parent=null){
        this.name = name;
        this.children = [];
        this.owner = owner;
        this.hardlink = 2;
        this.permission = permission;
        this.size = '?';
        this.parent = parent;
        this.parent_name = (parent) ? parent.getName() : null;
        this.parent_path = (this.parent_name) ? this.parent_name + "/" : null;
        //this.creation_time = '?';
        //this.modified_time = '?';
    }

    getName() {
        return this.name;
    }

    setName(name) {
        this.name = name;
    }

    hasChildren(name) {
        for (let i = 0; i < this.getChildren().length; i++) {
            if (name == this.getChildren()[i].getName())
                return true;
        }
        return false;
    }
    
    getChildren(name='') {
        if (!name)
            return this.children;
        for (let i = 0; i < this.children.length; i++) {
            if (this.children[i].getName() == name)
                return this.children[i];
        }
        return null;
    }

    getParent() {
        return this.parent;
    }

    addFile(file) {
        if (this.hasChildren(file.getName())) {
            return false;
        }
        this.children.push(file);
        file.setParentName(this.name);
        if (file.getParentName() == '/') {
            file.setParentPath('/');
        }
        else
            file.setParentPath(this.getParentPath() + file.getParentPath());
    }

    addDirectory(directory) {
        if (this.hasChildren(directory.getName())) {
            return false;
        }
        this.children.push(directory);
        directory.setParentName(this.name);
        if (directory.getParentName() == '/') {
            directory.setParentPath('/');
        }
        else
            directory.setParentPath(this.getParentPath() + directory.getParentPath());

        this.hardlink += 1;
    }

    getPath() {
        return this.path;
    }

    getParentName() {
        return this.parent_name;
    }

    setParentName(parent_name) {
        this.parent_name = parent_name;
    }

    getParentPath() {
        return this.parent_path;
    }

    setParentPath(parent_path) {
        this.parent_path = parent_path;
    }

    getOwner() {
        return this.owner;
    }

    getDirectoryHardlink() {
        return this.hardlink;
    }

    setDirectoryHardlink(hardlinks) {
        this.hardlink = hardlinks;
    }
}
// CREATE ROOT DIRECTORY AND ADD BIN, HOME, SRC DIR
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
    return recursive(root, dir_arr);
}
