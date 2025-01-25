class User {
    constructor(username, followSince, usernameColor='green', dateCreated=null, isSubbed=false, subAge=0, sub_tier=null) {
        this.username = username;
        this.followSince = followSince;
        this.dateCreated = dateCreated;
        this.chatHistory = [];
        this.messageCount = 0;
        this.sub_tier = sub_tier;
        this.subAge = subAge;
        this.isSubbed = isSubbed;
        if (username === 'Vuila9_')
            this.avatar = `assets/img/default_user_avatar.png`;
        else
            this.avatar = `assets/img/user_avatar${Math.floor(Math.random() * 30 + 1)}.png`;
        this.usernameColor = usernameColor;
    }

    setUsername(name) { this.username = name;}

    getUsername() { return this.username; }

    getFollowDate() { return this.followSince; }

    addChatHistory(message) { 
        this.chatHistory.push(message);
    }

    getDateCreate() { return this.dateCreated; }

    getAvatar() { return this.avatar; }

    getChatHistory() { return this.chatHistory; }

    getMessageCount() { return this.messageCount; }

    getSubAge() { return this.subAge; }

    getSubTier() { return this.sub_tier; }

    isSub() { return this.isSubbed; }

    getUsernameColor() { return this.usernameColor; }
}