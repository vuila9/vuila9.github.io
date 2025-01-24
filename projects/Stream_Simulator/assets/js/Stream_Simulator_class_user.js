class User {
    constructor(username, followSince, usernameColor='green') {
        this.username = username;
        this.followSince = followSince;
        this.chatHistory = [];
        this.messageCount = 0;
        this.sub_tier = null;
        this.subAge = 0;
        this.isSubbed = false;
        this.avatar = `assets/img/user_avatar${Math.floor(Math.random() * 31)}.png`;
        this.usernameColor = usernameColor;
    }

    setUsername(name) { this.username = name;}

    getUsername() { return this.username; }

    getFollowDate() { return this.followSince; }

    addChatHistory(message) { 
        this.chatHistory.push(message);
    }

    getDateCreate() { return null; }

    getAvatar() { return this.avatar; }

    getChatHistory() { return this.chatHistory; }

    getMessageCount() { return this.messageCount; }

    getSubAge() { return this.subAge; }

    getSubTier() { return this.sub_tier; }

    isSub() { return this.isSubbed; }

    getUsernameColor() { return this.usernameColor; }
}