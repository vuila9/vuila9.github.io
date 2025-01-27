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

        this.banned = false;
       
        if (streamer) {
            this.avatar = `assets/img/default_user_avatar.png`;
            this.prime = true;
            this.vip = false;
            this.founder = false;
            this.mod = false;
            this.turbo = false;
            this.verified = true;
        }
        else {
            this.avatar = `assets/img/user_avatar${Math.floor(Math.random() * 30 + 1)}.png`;
            this.prime = false;
            this.turbo = (Math.floor(Math.random()*100) < 1) ? true : false;
            this.mod = (Math.floor(Math.random()*100) < 1) ? true : false;
            this.founder = (Math.floor(Math.random()*100) < 1) ? true : false;
            this.vip = (Math.floor(Math.random()*100) < 1) ? true : false;
            this.verified = (Math.floor(Math.random()*100) < 1) ? true : false;
            this.prime = (Math.floor(Math.random()*100) < 30) ? true : false;
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

    banViewer() { this.banned = true; }

    isBanned() { return this.banned; }

    initBadges() {
        this.badges = [];
        if (this.streamer) this.badges.push('Broadcaster');
        if (this.founder) this.badges.push('Founder');
        if (this.vip) this.badges.push('VIP');
        if (this.mod) this.badges.push('Moderator');
        if (this.verified) this.badges.push('Verified');
        if (this.turbo) this.badges.push('Turbo');
        if (this.subAge > 0 && this.sub) {
            for (let i = this.#subBadges.length - 1; i >= 0; i--) {
                if (this.subAge >= this.#subBadges[i]) {
                    this.badges.push(`Subscriber_${this.#subBadges[i]}`);
                    break;
                }
            }
        }
        if (this.prime) this.badges.push('Prime Gaming');
    }

    modViewer() { 
        if (this.mod) return false; 
        this.mod = true;
        this.initBadges();
        return true;
    }

    unmodViewer() { 
        if (!this.mod) return false; 
        this.mod = false;
        this.initBadges();
        return true;
    }

    founderViewer() { 
        if (this.founder) return false;
        this.founder = true; 
        this.initBadges();
        return true;
    }

    vipViewer() { 
        if (this.vip) return false; 
        this.vip = true;
        this.initBadges();
        return true;
    }
    unvipViewer() { 
        if (!this.vip) return false; 
        this.vip = false; 
        this.initBadges();
        return true
    }

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