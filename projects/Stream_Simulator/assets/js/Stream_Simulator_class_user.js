class User {
    #subBadges = [1,2,3,6,9,12,18,24,30,36];
    constructor(username, dateCreated=null, followSince=null, sub=false, subAge=0, sub_tier=null, usernameColor='white', streamer=false) {
        this.username = username;
        this.followSince = followSince;
        this.dateCreated = dateCreated;
        this.chatHistory = [];
        this.messageCount = 0;
        this.sub_tier = sub_tier;
        this.subAge = subAge;
        this.badges = [];
        this.streamer = streamer;
        this.sub = sub;
       
        if (streamer) {
            this.avatar = `assets/img/default_user_avatar.png`;
            this.prime = true;
            this.vip = false;
            this.founder = false;
            this.mod = false;
        }
        else {
            this.avatar = `assets/img/user_avatar${Math.floor(Math.random() * 30 + 1)}.png`;
            this.prime = false;
            this.mod = (Math.floor(Math.random()*100) < 1) ? true : false;;
            this.founder = (Math.floor(Math.random()*100) < 1) ? true : false;
            this.vip = (Math.floor(Math.random()*100) < 1) ? true : false;
            if (this.sub_tier == 1 && this.sub)
                this.prime = (Math.floor(Math.random()*100) < 70) ? true : false;
        }
        this.usernameColor = usernameColor;
        this.initBadges();
    }

    setUsername(name) { this.username = name;}

    getUsername() { return this.username; }

    getFollowDate() { return this.followSince; }

    addChatHistory(message) { 
        this.chatHistory.push(message);
    }

    initBadges() {
        if (this.streamer) this.badges.push('broadcaster');
        if (this.vip) this.badges.push('vip');
        if (this.prime) this.badges.push('prime');
        if (this.mod) this.badges.push('mod');
        if (this.founder) this.badges.push('founder');

        if (this.subAge == 0) return;
        if (!this.sub) return;
        for (let i = this.#subBadges.length - 1; i >= 0; i--) {
            if (this.subAge >= this.#subBadges[i]) {
                this.badges.push(`sub_${this.#subBadges[i]}`);
                return;
            }
        }
    }

    addBadge(badge) { this.badges.push(badge); }

    getBadges() { return this.badges; }

    isStreamer() { return this.streamer; }

    getDateCreate() { return this.dateCreated; }

    getAvatar() { return this.avatar; }

    getChatHistory() { return this.chatHistory; }

    getMessageCount() { return this.messageCount; }

    getSubAge() { return this.subAge; }

    getSubTier() { return this.sub_tier; }

    isSub() { return this.sub; }

    getUsernameColor() { return this.usernameColor; }
}