class ChatDisplay {

    #anyEmoteMapContainer;
    //#anyEmoteArrayContainer;
    #viewersMap;

    constructor(streamer, limit=200) {
        this.chatSize = 0;
        this.isPause = true;
        this.chatSizeLimit = limit;
        this.chatIntervalID = null;
        this.streamIntervalID = null;
        this.scrollUp = false;
        this.chatMessageDiv = document.getElementById('chat-messages');
        this.chatRate = 0;
        this.fakeViewCount = Math.floor(Math.random() * 100000);
        document.getElementById('channel-viewer-count').lastChild.nodeValue = this.fakeViewCount.toLocaleString();

        this.subCount = 0;

        this.STREAMER = streamer;

        this.#viewersMap = new Map();
        this.#anyEmoteMapContainer = new Map();
        this.anyEmoteArrayContainer = [];
        this.command = new Set(['/ban', '/unban', '/title', '/username', '/yt', '/spam', '/category', '/viewcount', '/mod', '/unmod', '/vip', '/unvip', '/founder', '/gift', '/giftrandom', '/start', '/pause', '/clear', '/clearpopup', '/command']);
    }

    toggleChat() { this.isPause = !this.isPause; }

    pauseChat() { this.isPause = false; }

    isPaused() { return this.isPause; }

    setScrollUp(bool) { this.scrollUp = bool; }

    isScrollUp() { return this.scrollUp; }

    getSubCount() { return this.subCount; }

    setChatRate(chatRate) { this.chatRate = chatRate;}

    getChatRate() { return this.chatRate; }

    setFakeViewCount(count) { this.fakeViewCount = count; }

    getFakeViewCount() { return this.fakeViewCount; }

    incFakeViewCount(change) {
        if (this.fakeViewCount > 5)
            this.fakeViewCount += change; 
        else {
            this.fakeViewCount += Math.abs(change);
        }
    }

    verifyCommand(command) { return this.command.has(command); }

    setChatIntervalID(intervalID) { this.chatIntervalID = intervalID; }

    getChatIntervalID() { return this.chatIntervalID; }

    setStreamIntervalID(intervalID) { this.streamIntervalID = intervalID; }

    getStreamIntervalID() { return this.streamIntervalID; }

    getAnyEmoteArray() { return this.anyEmoteArrayContainer; }

    addMessage(message) { 
        const USER = message.getUser();
        if (USER.isBanned()) { //dead man dont talk
            this.addSystemMessage(`"${USER.getUsername()}" tried to chat but was banned.`)
            return; 
        }
        const messageElement = document.createElement('p');
        messageElement.setAttribute('user', USER.getUsername());

        const badgesUserName = document.createElement('span');
        badgesUserName.className = 'user-message-badges';
        const badges_limit = (USER.isStreamer()) ? 3 : 2;
        for (let i = 0; i < USER.getBadges().length; i++) {
            if (i == badges_limit) break;
            const img_badge = document.createElement('img');
            img_badge.src = `./assets/img/badges/${USER.getBadges()[i]}.png`;
            img_badge.title = (USER.getBadges()[i].includes('Sub')) ? 'Subscriber' : USER.getBadges()[i];
            img_badge.className = 'user-badge';
            badgesUserName.appendChild(img_badge);
        }
        if (badgesUserName.hasChildNodes())
            messageElement.appendChild(badgesUserName);

        const messageUserName = document.createElement('span');
        messageUserName.className = 'user-message';
        messageUserName.textContent = `${USER.getUsername()}`;
        messageUserName.style.fontWeight = "bold";
        messageUserName.style.fontSize = "13.5px";
        messageUserName.style.color = USER.getUsernameColor();
        messageUserName.addEventListener(('click'), (event) => {
            this.#userProfile(USER, event.clientX, event.clientY);
        });
        messageElement.appendChild(messageUserName);

        const messageContent = document.createElement('span');
        if (this.#processMessageContent(message.getContent(), messageContent)) {
            messageElement.style.backgroundColor = '#2c1a1d';
            messageElement.style.borderLeft  = '3px solid #e13232';
            messageElement.style.borderRight = '3px solid #e13232';
        }

        USER.addChatHistory(message.getContent());
        messageElement.appendChild(messageContent);

        this.chatMessageDiv.appendChild(messageElement);
        this.chatSize += 1;
        if (this.chatSize > this.chatSizeLimit) {
            this.chatMessageDiv.removeChild(this.chatMessageDiv.firstElementChild);
            this.chatSize -= 1;
        }
        const images = messageContent.querySelectorAll('img');
        if (images.length > 0) {
            // Wait for all images to load, then scroll
            Promise.all(
                Array.from(images).map(img => img.complete ? Promise.resolve() : new Promise(resolve => img.onload = resolve))
            ).then(() => {
                this.chatMessageDiv.scrollTop = this.chatMessageDiv.scrollHeight;
            });
        } 
        else 
            this.chatMessageDiv.scrollTop = this.chatMessageDiv.scrollHeight;
    }

    addViewerSubscribeAlertMessage(user, sub_type, sub_tier=1) {

    }

    addGiftAlertAnnouncement(amount, gifter=this.STREAMER) {
        const giftAlertMessage = document.createElement('div');
        giftAlertMessage.className = 'sub-alert-message'; 
        giftAlertMessage.style.borderLeft = `4px solid ${gifter.getUsernameColor()}`;
        
        const giftIcon = document.createElement('span');
        giftIcon.className = 'fa fa-gift';
        giftIcon.style.color = 'white';
        giftIcon.style.marginTop = '3px';
        giftAlertMessage.appendChild(giftIcon);

        const gifterName = document.createElement('strong');
        gifterName.style.fontSize = '15px';
        gifterName.textContent = gifter.getUsername();
        gifterName.style.color = 'white';
        gifterName.style.marginLeft = "5px";
        gifterName.addEventListener(('click'), (event) => {
            this.#userProfile(gifter, event.clientX, event.clientY);
        });
        giftAlertMessage.appendChild(gifterName);

        const giftContext = document.createElement('div');
        gifter.incGiftSub(Number(amount));
        giftContext.textContent = `is gifting ${amount} Tier 1 Subs. They've gifted a total of ${gifter.getGiftSub()} Subs in the channel!`;
        giftAlertMessage.style.color = 'white';
        giftAlertMessage.appendChild(giftContext);

        this.chatMessageDiv.appendChild(giftAlertMessage);
        this.chatSize += 1;
        if (this.chatSize > this.chatSizeLimit) {
            this.chatMessageDiv.removeChild(this.chatMessageDiv.firstElementChild);
            this.chatSize -= 1;
        }
        if (!this.scrollUp)
            this.chatMessageDiv.scrollTop = this.chatMessageDiv.scrollHeight;
    }


    addGiftAlertMessage(gifter, sub_tier, receiver) {
        const giftAlertMessage = document.createElement('div');
        giftAlertMessage.className = 'sub-alert-message'; 
        giftAlertMessage.style.borderLeft = `4px solid ${gifter.getUsernameColor()}`;
        
        const giftIcon = document.createElement('span');
        giftIcon.className = 'fa fa-gift';
        giftIcon.style.color = '#a970ff';
        giftIcon.style.marginTop = '3px';
        giftAlertMessage.appendChild(giftIcon);

        const gifterName = document.createElement('strong');
        gifterName.textContent = gifter.getUsername();
        gifterName.style.color = '#a970ff';
        gifterName.style.marginLeft = "5px";
        gifterName.addEventListener(('click'), (event) => {
            this.#userProfile(gifter, event.clientX, event.clientY);
        });
        giftAlertMessage.appendChild(gifterName);

        const giftContext = document.createElement('div');
        giftContext.innerHTML = `Gifted a <span style="font-weight: 900">Tier ${sub_tier}</span> Sub to <span style="font-weight: 900">${receiver}</span>`;
        giftAlertMessage.style.color = 'white';
        giftAlertMessage.appendChild(giftContext);

        this.chatMessageDiv.appendChild(giftAlertMessage);
        this.chatSize += 1;
        if (this.chatSize > this.chatSizeLimit) {
            this.chatMessageDiv.removeChild(this.chatMessageDiv.firstElementChild);
            this.chatSize -= 1;
        }
        if (!this.scrollUp)
            this.chatMessageDiv.scrollTop = this.chatMessageDiv.scrollHeight;
    }

    addSubMessage(message, forcedInnerHTML=false, color='#a4a4ae', backgroundColor='transparent') {

    }

    addSystemMessage(message, forcedInnerHTML=false, color='#a4a4ae', backgroundColor='transparent') {
        const messageElement = document.createElement('p');
        if (forcedInnerHTML)
            messageElement.innerHTML = message;
        else
            messageElement.textContent = message;
        messageElement.style.fontSize = '13px';
        messageElement.style.fontFamily = 'Arial, Helvetica, sans-serif';
        messageElement.style.color = color;
        messageElement.style.backgroundColor = backgroundColor;
        this.chatMessageDiv.appendChild(messageElement);
        this.chatSize += 1;
        if (this.chatSize > this.chatSizeLimit) {
            this.chatMessageDiv.removeChild(this.chatMessageDiv.firstElementChild);
            this.chatSize -= 1;
        }
        if (!this.scrollUp)
            this.chatMessageDiv.scrollTop = this.chatMessageDiv.scrollHeight;
    }

    #userProfile(user, mouseX, mouseY) {
        if (document.getElementById(`popup-${user.getUsername()}`)) return;
        // Create the popup container
        const popup = document.createElement("div");
        popup.className = "popup-user-profile";
        popup.id = `popup-${user.getUsername()}`;
        popup.style.top = `${mouseY}px`;
        popup.style.left = `${mouseX - 340}px`;

        // Add the close button
        const closeButton = document.createElement("div");
        closeButton.className = "popup-user-profile-close";
        closeButton.textContent = "✖";
        closeButton.addEventListener("click", () => {
            popup.remove();
        });
        popup.appendChild(closeButton);

        // Add the viewer avatar
        if (user.getDateCreate()) {
            const viewerAvatar = document.createElement("img");
            viewerAvatar.src = user.getAvatar();
            viewerAvatar.className = "channel-user-avatar";
            viewerAvatar.title = `${user.getUsername()}'s avatar`;
            viewerAvatar.style.top = '5px';
            viewerAvatar.style.left = '5px';
            viewerAvatar.style.width = '50px';
            viewerAvatar.style.height = '50px';
            viewerAvatar.style.position = 'absolute';
            popup.appendChild(viewerAvatar);
        }

        // Add viewer username
        const username = document.createElement("div");
        username.textContent = user.getUsername();
        username.style.color = "white";
        username.style.fontSize = '17px'; 
        username.style.top = '5px';
        username.style.left = '60px';
        username.style.fontWeight = 'bold';
        username.style.position = 'absolute';
        popup.appendChild(username);

        // Add created date 🎂
        const created = document.createElement("div");
        if (user.getDateCreate())
            created.textContent = `🎂 Account created on ${user.getDateCreate()}`;
        else
            created.textContent = `⚠️ Unable to fetch account`;
        created.style.color = "white";
        created.style.fontSize = '14px'; 
        created.style.top = '27px';
        created.style.left = '60px';
        created.style.position = 'absolute';
        popup.appendChild(created);

        // Add follow date 🤍
        if (!user.isStreamer() && user.getDateCreate()) {
            const follow = document.createElement("div");
            follow.textContent = `❤️ Followed since ${user.getFollowDate()}`;
            follow.style.color = "white";
            follow.style.fontSize = '14px'; 
            follow.style.top = '46px';
            follow.style.left = '60px';
            follow.style.position = 'absolute';
            popup.appendChild(follow);
        }

        // Add sub date ⭐
        if (user.getSubAge() > 0) {
            const sub = document.createElement("div");
            if (user.isSub())
                sub.textContent = `⭐ Tier ${user.getSubTier()} - Subscribed for ${user.getSubAge()} Months`;
            else
                sub.textContent = `⭐ Previously subscribed for ${user.getSubAge()} Months`;
            sub.style.color = "white";
            sub.style.fontSize = '14px';
            sub.style.top = (user.isStreamer()) ? '46px': '65px';
            sub.style.left = '60px';
            sub.style.position = 'absolute';
            popup.appendChild(sub);
        }
        document.body.appendChild(popup);

        const badgesProfile = document.createElement('div');
        badgesProfile.className = 'user-profile-badges';
        for (let i = 0; i < user.getBadges().length; i++) {
            const img_badge = document.createElement('img');
            img_badge.src = `./assets/img/badges/${user.getBadges()[i]}.png`;
            img_badge.title = (user.getBadges()[i].includes('Sub')) ? 'Subscriber' : user.getBadges()[i];
            img_badge.className = 'user-badge';
            badgesProfile.appendChild(img_badge);
        }
        if (badgesProfile.hasChildNodes()) {
            badgesProfile.style.top = '89px';
            badgesProfile.style.left = '60px';
            badgesProfile.style.position = 'absolute';
            popup.appendChild(badgesProfile);
        }

        // Enable dragging
        let isDragging = false;
        let offsetX = 0, offsetY = 0;

        popup.addEventListener("mousedown", (e) => {
            isDragging = true;
            offsetX = e.clientX - popup.offsetLeft;
            offsetY = e.clientY - popup.offsetTop;
        });

        document.addEventListener("mousemove", (e) => {
            if (isDragging) {
                popup.style.left = `${e.clientX - offsetX}px`;
                popup.style.top = `${e.clientY - offsetY}px`;
            }
        });

        document.addEventListener("mouseup", () => {
            isDragging = false;
        });
    }

    #processMessageContent(msg, element) { // return True if mentioning the Streamer, false otherwise
        const msg_parts = msg.trim().split(' ');
        element.appendChild(document.createTextNode(': '));
        let streamer = false;
        for (let part of msg_parts) {
            if (part == '${STREAMER}') {
                part = `@${this.STREAMER.getUsername()}`;
                streamer = true;
            }
            if (part == '${RANDOM_EMOTE}') part = `${this.anyEmoteArrayContainer[this.#getRand(this.anyEmoteArrayContainer.length)]}`;
            if (part[0] === '@') {
                const user_name = part.slice(1);
                const user_search = document.createElement('span');
                user_search.textContent = part;
                user_search.style.fontWeight = 'bold';
                user_search.style.cursor = 'pointer';
                user_search.style.color = '#efeff1';
                user_search.style.fontSize = '13.5px';
                user_search.addEventListener(('click'), (event) => {
                    if (this.#viewersMap.has(user_name))
                        this.#userProfile(this.#viewersMap.get(user_name), event.clientX, event.clientY);
                    else if (this.STREAMER.getUsername() == user_name)
                        this.#userProfile(this.STREAMER, event.clientX, event.clientY);
                    else
                        this.#userProfile(new User(user_name), event.clientX, event.clientY);
                });
                element.appendChild(user_search)
            }
            else if (this.#anyEmoteMapContainer.has(part)) {
                const imgElement = document.createElement('img');
                imgElement.src = this.getEmoteSrc(part);
                imgElement.title = part;
                element.appendChild(imgElement)
            }
            else {
                const textNode = document.createTextNode(` ${part} `);
                element.appendChild(textNode);
            }
        }
        return streamer;
    }

    getEmoteSrc(name) {
        return `./assets/img/emotes/${name}.${this.#anyEmoteMapContainer.get(name)}`;
    }

    getDiv() { return this.chatMessageDiv; }

    async populateData(datatype, container, path, sub_container=null, all_names=null) {
        try {
            const response = await fetch(path);
            if (!response.ok) throw new Error(`Error fetching ${path}: ${response.statusText}`);

            // Stream the response body
            const reader = response.body.getReader();
            const decoder = new TextDecoder('utf-8');
            let { value, done } = await reader.read();
            let buffer = '';

            while (!done) {
                // Decode and append the chunk
                buffer += decoder.decode(value, { stream: true });

                // Process completed lines
                let lines = buffer.split('\n');
                buffer = lines.pop(); // Save the last incomplete line for the next iteration

                // Process each complete line
                lines.forEach(line => {
                    if (datatype === 'VIEWER') {
                        const row = line.split(',').map(value => value.trim());
                        container.push(new User(row[0], row[1], row[2], (true == row[3]), row[4], row[5], (true == row[6]),
                                                (true == row[7]), (true == row[8]), (true == row[9]), (true == row[10]), (true == row[11]), row[12]));
                        this.#viewersMap.set(container.at(-1).getUsername(), container.at(-1));
                        sub_container.push(container.at(-1));
                        all_names.push(`@${container.at(-1).getUsername()}`);

                    } else if (datatype === 'CHAT') {
                        const row = line.replace('\r', '');
                        container.push(row);
                    } else if (datatype === 'EMOTE') {
                        const row = line.replace('\r', '').split('.');
                        this.anyEmoteArrayContainer.push(row[0]);
                        this.#anyEmoteMapContainer.set(row[0], row[1]);
                    }
                });

                // Read the next chunk
                ({ value, done } = await reader.read());
            }

            // Process the remaining buffer (last line)
            if (buffer) {
                if (datatype === 'VIEWER') {
                    const row = buffer.split(',').map(value => value.trim());
                    container.push(new User(row[0], row[1], row[2]));
                } else if (datatype === 'CHAT') {
                    const row = buffer.replace('\r', '');
                    container.push(row);
                } else if (datatype === 'EMOTE') {
                    const row = buffer.replace('\r', '').split('.');
                    this.anyEmoteArrayContainer.push(row[0]);
                    this.#anyEmoteMapContainer.set(row[0], row[1]);
                }
            }
            //done here
        } catch (error) {
            console.error(error);
            alert(`Failed to load ${path} file.`);
        }
    }

    autoPopulate(VIEWERS, chatlogs) { 
        return; 
    }

    #getYouTubeVideoId(url) {
        const regex = /(?:\?v=|\/embed\/|\/shorts\/|youtu\.be\/|\/v\/|\/watch\?v=|\/watch\?.+&v=)([a-zA-Z0-9_-]{11})/;
        const match = url.match(regex);
        return match ? match[1] : null;
    }

    #getRand(size) {
        return Math.floor(Math.random() * size); // excluding the last line of data files
    }

    #spamVariation(feed) {
        if (feed.length > 1) return feed;
        if (feed[0].length > 10) return feed;
        feed = feed[0];
        const spam_chat = [];
        spam_chat.push(feed);
        spam_chat.push(`${feed} ${feed}`);
        let counter = this.#getRand(5) + 1;
        let repeat = [];
        while (counter > 0) {
            repeat.push(feed);
            counter -= 1;
        }
        spam_chat.push(repeat.join(' '));
        spam_chat.push(`${feed}${feed}${feed}`);
        spam_chat.push(`${feed}${feed.at(-1)}`);
        spam_chat.push(`${feed}${feed.at(-1)}${feed.at(-1)}`);

        feed = feed.toLowerCase();
        spam_chat.push(feed);
        spam_chat.push(`${feed} ${feed}`);
        counter = this.#getRand(5) + 1;
        repeat = [];
        while (counter > 0) {
            repeat.push(feed);
            counter -= 1;
        }
        spam_chat.push(repeat.join(' '));
        spam_chat.push(`${feed}${feed}${feed}`);
        spam_chat.push(`${feed}${feed.at(-1)}`);
        spam_chat.push(`${feed}${feed.at(-1)}${feed.at(-1)}`);
        
        feed = feed.toUpperCase();
        spam_chat.push(feed);
        spam_chat.push(`${feed} ${feed}`);
        counter = this.#getRand(5) + 1;
        repeat = [];
        while (counter > 0) {
            repeat.push(feed);
            counter -= 1;
        }
        spam_chat.push(repeat.join(' '));
        spam_chat.push(`${feed}${feed}${feed}`);
        spam_chat.push(`${feed}${feed.at(-1)}`);
        spam_chat.push(`${feed}${feed.at(-1)}${feed.at(-1)}`);
        return spam_chat;
    }

    #smartSplit(sentence) {
        const regex = /"([^"]*)"|(\S+)/g;
        const result = [];
        let match;
        while ((match = regex.exec(sentence)) !== null) {
            // match[1] contains the quoted phrase, match[2] contains unquoted words
            result.push(match[1] || match[2]);
        }
        return result;
    }

    spamChat(VIEWERS, msg, duration_=null) {
        if (this.isPause) return;
        const spam_chat = this.#spamVariation(msg);
        const chat_rate = Math.min(this.chatRate/2, 800);
        const intervalId = setInterval(() => {
            this.addMessage(new ChatMessage(VIEWERS[this.#getRand(VIEWERS.length)], spam_chat[this.#getRand(spam_chat.length)]));
        }, chat_rate);
        let duration = (duration_ === null) ? Math.max(Math.min(6900 * 500/this.chatRate, 13000), 5000) : duration_;
        setTimeout(() => {
            clearInterval(intervalId); 
            document.getElementById('start-chat-button').disabled = false;
        }, duration);
    }

    subGifting(amount, VIEWERS, gifter=this.STREAMER) {
        const og_amount = amount;
        //if (amount > 5)
            this.addGiftAlertAnnouncement(amount, gifter);
        while (amount > 0) {
            const random_viewer = VIEWERS[this.#getRand(VIEWERS.length)];
            if (random_viewer.isSub()) {
                const user = VIEWERS[this.#getRand(VIEWERS.length)];
                const counter = 0;
                while (!user.isSub && counter < VIEWERS.length) {
                    user = VIEWERS[this.#getRand(VIEWERS.length)];
                    counter += 1;
                }
                this.addGiftAlertMessage(gifter, sub_tier=1, user.getUsername());
                user.giftViewer();
            }
            else {
                this.addGiftAlertMessage(gifter, sub_tier=1, random_viewer.getUsername());
                random_viewer.giftViewer();
            }
            amount -= 1;
        }
        if (og_amount >= 10) {
            const duration = Math.max(Math.min(6900 * 500/this.chatRate, 7000), 5000) * (1 + amount/100);
            this.spamChat(VIEWERS, ['where is my gifted sub Stare', "all these gifted subs and I dont still get it", 'EzDodge', 'EZdodge', 'EZdodge ez dodge', 'EZdodge', 'EZdodge', 'EZdodge EZdodge'], duration);
        }
    }

    commandHandler(command, command_body, STREAMER, VIEWERS) {
        switch (command) {
            case '/username':
                const old_name = STREAMER.getUsername();
                STREAMER.setUsername(command_body.split(' ')[0]);
                document.getElementById('channel-name').textContent = STREAMER.getUsername();
                this.addSystemMessage(`Streamer has changed their name from ${old_name} to ${STREAMER.getUsername()}.`);
                break;
            
            case '/viewcount':
                const count = command_body.split(' ')[0];
                if (isNaN(count) || count.length == 0) {
                    this.addSystemMessage(`Invalid syntax for /viewcount: ${count} is not a number.`);
                    return;
                }
                if (count < 1 || count.length > 6) {
                    this.addSystemMessage(`Invalid syntax for /viewcount: ${count} is out of bound.`);
                    return;
                }
                this.fakeViewCount = Number(count);
                this.addSystemMessage(`Fake view count is set to: ${count}`);
                document.getElementById('channel-viewer-count').lastChild.nodeValue = Number(this.fakeViewCount).toLocaleString();
                if (!this.isPause)
                    document.getElementById('start-chat-button').click();
                break;
            
            case '/yt':
                const YTCLIP = document.getElementById('video-player');
                const yt_id = this.#getYouTubeVideoId(command_body);
                if (command_body == 'remove') {
                    YTCLIP.src = '';
                    this.addSystemMessage('Current embedded Youtube video is removed.');
                    break;
                }
                if (yt_id === null) {
                    this.addSystemMessage('Invalid Youtube URL.');
                    break;
                }
                YTCLIP.src = `https://www.youtube.com/embed/${yt_id}`;
                YTCLIP.onload = () => {
                    this.addSystemMessage(`${STREAMER.getUsername()} has changed the embedded Youtube video.`);
                };
                break;

            case '/gift': 
                var username = command_body.split(' ')[0];
                if (username[0] == "@") username = username.slice(1);
                if (!this.#viewersMap.has(username))  {
                    this.addSystemMessage(`"${username}" is not a chatter in this community.`); 
                    break;
                }
                var sub_tier = command_body.split(' ')[1];
                if (isNaN(sub_tier)) sub_tier = 1;
                if (sub_tier > 3 || sub_tier < 1) sub_tier = 1;
                if (this.#viewersMap.get(username).giftViewer(sub_tier)) {
                    this.addGiftAlertMessage(STREAMER, sub_tier, username);
                    this.addMessage(new ChatMessage(this.#viewersMap.get(username), "Thanks for the gifted sub! ${STREAMER}"));
                }
                else {
                    var user = VIEWERS[this.#getRand(VIEWERS.length)];
                    var counter = 0;
                    while (!user.isSub && counter < VIEWERS.length) {
                        user = VIEWERS[this.#getRand(VIEWERS.length)];
                        counter += 1;
                    }
                    this.addGiftAlertMessage(STREAMER, sub_tier, username);
                    this.addSystemMessage(`${username} is already subbed and decides to pass the sub to ${user.getUsername()}`);
                    user.giftViewer(sub_tier);
                    this.addMessage(new ChatMessage(user, `Thanks for the gifted sub! @${username}`));
                }
                break;

            case '/giftrandom':
                var amount = command_body.split(' ')[0];
                if (isNaN(amount)) return;
                if (amount > 100 || amount < 1) return; 
                this.subGifting(amount, VIEWERS);
                break;

            case '/mod':
                var username = command_body.split(' ')[0];
                if (username[0] == "@") username = username.slice(1);
                if (this.#viewersMap.has(username) && this.#viewersMap.get(username).modViewer())  {
                    this.addSystemMessage(`${username} has been made a Moderator.`);
                    this.spamChat(VIEWERS, ['should have been me Saddies', 'did bro even sub??', 'how much for mod', `who is you  @${username}`, `never seen this guy before wtf`]);
                }
                break;

            case '/unmod':
                var username = command_body.split(' ')[0];
                if (username[0] == "@") username = username.slice(1);
                if (this.#viewersMap.has(username) && this.#viewersMap.get(username).unmodViewer()) {
                    this.addSystemMessage(`${username} is no longer a Moderator.`);
                    this.spamChat(VIEWERS, ['peepoL', 'deserved', 'good, now mod me Demanding', `what did you do??  @${username}`, `o7`, 'o7', ])
                }
                break;

            case '/vip':
                var username = command_body.split(' ')[0];
                if (username[0] == "@") username = username.slice(1);
                if (this.#viewersMap.has(username) && this.#viewersMap.get(username).vipViewer()) 
                    this.addSystemMessage(`${username} has been promoted to VIP.`);
                    this.spamChat(VIEWERS, ['should have been me Saddies', 'did bro even sub??', 'how much for VIP', `who is you  @${username}`, `never seen this guy before wtf`])
                break;

            case '/unvip':
                var username = command_body.split(' ')[0];
                if (username[0] == "@") username = username.slice(1);
                if (this.#viewersMap.has(username) && this.#viewersMap.get(username).unvipViewer()) 
                    this.addSystemMessage(`${username} is no longer a VIP.`);
                break;

            case '/founder':
                var username = command_body.split(' ')[0];
                if (username[0] == "@") username = username.slice(1);
                if (this.#viewersMap.has(username) && this.#viewersMap.get(username).founderViewer()) 
                    this.addSystemMessage(`${username} is now a channel founder.`);
                break;

            case '/ban':
                var username = command_body.split(' ')[0];
                if (username[0] == "@") username = username.slice(1);
                if (this.#viewersMap.has(username) && this.#viewersMap.get(username).banViewer()) {
                    this.addSystemMessage(`${username} is permanently banned.`);
                    this.spamChat(VIEWERS, [`@${username}  RIPBOZO `, "SCATTER", "SCATTER", `free @${username} right meow`, "o7", "o7", "o7 o7", "gg", "truth = banned", "banned o7", "RIPBOZO rip bozo", "why bro got banned?", `@${username} see you never`, "keep mess around and find out", `@${username}  welcome to the gulag o7`, 'deserved o7']);
                }
                break;

            case '/unban':
                var username = command_body.split(' ')[0];
                if (username[0] == "@") username = username.slice(1);
                if (username[0] == "@") username = username.slice(1);
                if (this.#viewersMap.has(username) && this.#viewersMap.get(username).unbanViewer()) {
                    this.addSystemMessage(`${username} is no longer banned.`);
                    this.spamChat(VIEWERS, ["???", "why free him?", "keem them banned wtf", "bro is free tf Aware", `welcome back @${username}`, `@${username} did you bribe the streamer??`]);
                }
                break;

            case '/spam':
                if (this.isPause) return;
                this.spamChat(VIEWERS, this.#smartSplit(command_body.trim()));
                break;

            case '/title':
                document.getElementById('channel-title').textContent = command_body;
                this.addSystemMessage(`Stream title is now set to "${command_body}".`);
                break;
            case '/category':
                document.getElementById('channel-category').textContent = command_body;
                this.addSystemMessage(`Stream category is now set to "${command_body}".`);
                break;
            case '/start':
                if (this.isPause)
                    document.getElementById('start-chat-button').click();
                break;
            case '/pause':
                if (!this.isPause)
                    document.getElementById('start-chat-button').click();
                break;
            case '/clearpopup':
                const elements = document.querySelectorAll(`.popup-user-profile`);
                elements.forEach(element => element.remove());
                this.addSystemMessage('All user profile popups are now removed.')
                break;
            case '/clear':
                this.chatSize = 0;
                this.chatMessageDiv.innerHTML = '';
                break;
            case '/command':
                this.#showCommands();
                break;
            default:
                break;
        }
    }

    #showCommands() {
        this.addSystemMessage(`
            /username name: change your user name<br>
            /viewcount number: set viewer count to any number from 1 - 999,999<br>
            /yt URL: change the embedded YouTube video<br>
            /spam word/"phrase" or both: trigger the chat to spam specified word(s) and/or phrase(s)<br>
            /title title: change stream title<br>
            /category category: change stream category<br>
            /mod name: make a viewer a moderator<br>
            /vip name: make a viewer a vip<br>
            /founder name: make a viewer a founder<br>
            /gift name: gift a sub to a viewer<br>
            /giftrandom number: gifting 1 - 100 subs to random viewers<br>
            /ban: ban any viewer<br>
            /clearpopup: remove all user profile popups<br>
            /clear: clear chat<br>
            *Note: some commands are only executable during pausing/running chat
        `,true);
    }
}

class ChatMessage {
    constructor(user, content, timestamp=null) {
        this.user = user;
        this.content = content;
        this.timestamp = timestamp;
    }

    getUser() { return this.user; }

    getContent() { return this.content; }

    getTimestamp() { return this.timestamp; }
}