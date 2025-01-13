class User {
    constructor(username, followSince) {
        this.username = username;
        this.followSince = followSince;
        this.chatHistory = [];
        this.messageCount = 0;
        this.sub_tier = null;
        this.subAge = 0;
        this.isSubbed = false;
    }


}