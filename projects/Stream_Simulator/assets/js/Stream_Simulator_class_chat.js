class ChatDisplay {

    #anyEmoteMapContainer;
    //#anyEmoteArrayContainer;

    constructor(limit=200) {
        this.chatSize = 0;
        this.isPause = true;
        this.chatSizeLimit = limit;
        this.chatIntervalID = null;
        this.streamIntervalID = null;
        this.scrollUp = false;
        this.chatMessageDiv = document.getElementById('chat-messages');

        this.fakeViewCount = 12124;
        this.#anyEmoteMapContainer = new Map();
        this.anyEmoteArrayContainer = [];
        this.command = new Set(['/ban', '/title', '/username', '/yt' , '/category', '/viewcount', '/start', '/pause', '/clear']);
    }

    toggleChat() { this.isPause = !this.isPause; }

    pauseChat() { this.isPause = false; }

    isPaused() { return this.isPause; }

    setScrollUp(bool) { this.scrollUp = bool; }

    isScrollUp() { return this.scrollUp; }

    setFakeViewCount(count) { this.fakeViewCount = count; }

    getFakeViewCount() { return this.fakeViewCount; }

    verifyCommand(command) { return this.command.has(command); }

    setChatIntervalID(intervalID) { this.chatIntervalID = intervalID; }

    getChatIntervalID() { return this.chatIntervalID; }

    setStreamIntervalID(intervalID) { this.streamIntervalID = intervalID; }

    getStreamIntervalID() { return this.streamIntervalID; }

    getAnyEmoteArray() { return this.anyEmoteArrayContainer; }

    addMessage(message) { 
        const messageElement = document.createElement('p');
        messageElement.setAttribute('user', message.getUser().getUsername());
        
        const messageUserElement = document.createElement('span');
        messageUserElement.className = 'user-message';
        messageUserElement.textContent = `${message.getUser().getUsername()}`;
        messageUserElement.style.fontWeight = "bold";
        messageUserElement.style.fontSize = "13.5px";

        messageUserElement.style.color = message.getUser().getUsernameColor();
        messageUserElement.addEventListener(('click'), (event) => {
            console.log(message.getUser().getUsername());
        });
        messageElement.appendChild(messageUserElement);

        const messageContent = document.createElement('span');
        messageContent.innerHTML = `: ${this.#emoteReader(message.getContent())}`;
        message.getUser().addChatHistory(message.getContent());
        messageElement.appendChild(messageContent);
        this.chatMessageDiv.appendChild(messageElement);
        this.chatSize += 1;
        if (this.chatSize > this.chatSizeLimit) {
            this.chatMessageDiv.removeChild(this.chatMessageDiv.firstElementChild);
            this.chatSize -= 1;
        }
        if (!this.scrollUp)
            this.chatMessageDiv.scrollTop = this.chatMessageDiv.scrollHeight;
    }

    addSystemMessage(message, color='#a4a4ae', backgroundColor='transparent') {
        const messageElement = document.createElement('p');
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

    #emoteReader(msg, theme = 'any') {
        const msg_parts = msg.trim().split(' '); // Split the message into words

        // Map each word to either <img> tag or keep it as is based on the Set
        const msg_arr = msg_parts.map(part => {
            if (this.#anyEmoteMapContainer.has(part)) {
                // If the word is in the Set, wrap it in <img>
                const imgUrl = this.getEmoteSrc(part);
                return `<img src='${imgUrl}' title='${part}'>`;
            }
            // Otherwise, keep the word as is
            return part;
        });
    
        // Join the processed parts into a single string and return
        return msg_arr.join(' ');
    }

    getEmoteSrc(name) {
        return `./assets/img/emotes/${name}.${this.#anyEmoteMapContainer.get(name)}`;
    }

    getDiv() { return this.chatMessageDiv; }

    async populateData(datatype, container, path) {
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
                    //const row = trimRow(line);
                    if (datatype === 'VIEWER') {
                        const row = line.split(',').map(value => value.trim());
                        container.push(new User(row[0], row[1], row[2]));
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

    commandHandler(command, command_body, USER) {
        switch (command) {
            case '/username':
                const old_name = USER.getUsername();
                USER.setUsername(command_body.split(' ')[0]);
                document.getElementById('channel-name').textContent = USER.getUsername();
                this.addSystemMessage(`Streamer has changed their name from ${old_name} to ${USER.getUsername()}.`);
                break;
            
            case '/viewcount':
                const count = command_body.split(' ')[0];
                if (isNaN(count) || count.length == 0) {
                    this.addSystemMessage(`Invalid syntax for /viewcount: ${count} is not a number.`);
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
                    this.addSystemMessage(`${USER.getUsername()} has changed the embedded Youtube video.`);
                };
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
            case '/clear':
                this.chatSize = 0;
                this.chatMessageDiv.innerHTML = '';
                break;
            default:
                break;
        }
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