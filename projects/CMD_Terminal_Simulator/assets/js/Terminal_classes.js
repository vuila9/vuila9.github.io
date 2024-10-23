let USER_COUNT = 0;

class User {
    constructor(username, password=username) {
        this.username = username;
        this.password = password;
        this.uid   = '100' + (USER_COUNT - 1);
        this.gid   = '100' + (USER_COUNT - 1);
        this.group = '100' + (USER_COUNT - 1);
        if (USER_COUNT == 0) {
            this.uid = '0';
            this.gid = '0';``
            this.group = '0';
        }
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
    constructor(name, owner, permission, parent=null){
        this.name = name;
        this.owner = owner;
        this.content = "";
        this.permission = permission;
        this.hardlink = 1;
        this.size = 0;
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
    
    getSize() {
        return this.size;
    }

    setFileSize(size) {
        this.size = size;
    }

    setFileContent(content, type='w') {
        if (type == "w")
            this.content = content;
        else if (type == "a")
            this.content += content;
        if (this.content.length != '')
            this.setFileSize(this.content.length + 1);
        else
            this.setFileSize(0);

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

    setPermission(permission) {
        this.permission = permission;
    }
    
    getPermission() {
        return this.permission;
    }

    getHardlink() {
        return this.hardlink;
    }

    getOwner() {
        return this.owner;
    }
}

class Directory {
    constructor(name, owner, permission, parent=null){
        this.name = name;
        this.children = [];
        this.owner = owner;
        this.hardlink = (this.name == '/') ? 0 : 2;
        this.permission = permission;
        this.size = 4096;
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
            if (this.children[i].getName() === name)
                return this.children[i];
        }
        return null;
    }

    getParent() {
        return this.parent;
    }

    removeFile(file_name) {
        if (!this.hasChildren(directory_name)) {
            return false;
        }
        this.setChildren(this.getChildren().filter(filenode => filenode.getName() !== file_name));
        return true;
    }

    addFile(file) {
        if (this.hasChildren(file.getName())) {
            return false;
        }
        // insert in alphabetical order disregarding case sensitivity and any leading "."s
        const cleanedFile = file.getName().replace(/^[^a-zA-Z]*/, '').toLowerCase();
        let index = this.getChildren().slice(2).findIndex(item => item.getName().toLowerCase() > cleanedFile);
        if (index === -1) {
            this.getChildren().push(file);
        } else {
            this.getChildren().splice(index + 2, 0, file);
        }
        file.setParentName(this.name);
        if (file.getParentName() == '/') {
            file.setParentPath('/');
        }
        else
            file.setParentPath(this.getParentPath() + file.getParentPath());
        return true;
    }

    setChildren(children) {
        this.children = children;
    }

    removeFilenode(directory_name) {
        if (!this.hasChildren(directory_name)) {
            return false;
        }
        this.setChildren(this.getChildren().filter(filenode => filenode.getName() !== directory_name));
        return true;
    }

    addDirectory(directory) {
        if (this.hasChildren(directory.getName())) {
            return false;
        }
        directory.getChildren().push(new Directory('.', directory.getOwner(), directory.getPermission(), directory.getParent()));
        directory.getChildren().push(new Directory('..', directory.getParent().getOwner(), directory.getParent().getPermission(), directory.getParent().getParent()));
        directory.setDirectoryHardlink(2);
        directory.getChildren('..').setDirectoryHardlink(2);
        // insert in alphabetical order disregarding case sensitivity and any leading "."s
        const cleanedDirectory = directory.getName().replace(/^[^a-zA-Z]*/, '').toLowerCase();
        let index = this.getChildren().slice(2).findIndex(item => item.getName().toLowerCase() > cleanedDirectory);
        if (index === -1) {
            this.getChildren().push(directory);
        } else {
            this.getChildren().splice(index + 2, 0, directory);
        }

        directory.setParentName(this.name);
        if (directory.getParentName() == '/') {
            directory.setParentPath('/');
        }
        else
            directory.setParentPath(this.getParentPath() + directory.getParentPath());

        this.hardlink += 1;
        this.getChildren('.').setDirectoryHardlink(this.hardlink);
        return true;
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

    getSize() {
        return this.size;
    }

    setPermission(permission) {
        this.permission = permission;
    }

    getPermission() {
        return this.permission;
    }

    getOwner() {
        return this.owner;
    }

    getHardlink() {
        return this.hardlink;
    }

    setDirectoryHardlink(hardlinks) {
        this.hardlink = hardlinks;
    }
}