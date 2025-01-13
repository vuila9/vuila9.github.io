class User {
    constructor(username, followSince, usernameColor='green') {
        this.username = username;
        this.followSince = followSince;
        this.chatHistory = [];
        this.messageCount = 0;
        this.sub_tier = null;
        this.subAge = 0;
        this.isSubbed = false;
        this.usernameColor = usernameColor;
    }

    getUsername() { return this.username; }

    getFollowDate() { return this.followSince; }

    getChatHistory() { return this.chatHistory; }

    getMessageCount() { return this.messageCount; }

    getSubAge() { return this.subAge; }

    getSubTier() { return this.sub_tier; }

    isSubbed() { return this.isSubbed; }

    getUsernameColor() { return this.usernameColor; }
}