class ChatDisplay {

    #anyEmoteMapContainer;
    //#anyEmoteArrayContainer;

    constructor(limit=200) {
        this.chatSize = 0;
        this.isPause = true;
        this.chatSizeLimit = limit;
        this.chatIntervalID = null;
        this.scrollUp = false;
        this.chatMessageDiv = document.getElementById('chat-messages');

        this.#anyEmoteMapContainer = new Map();
        this.anyEmoteArrayContainer = [];
    }

    toggleChat() { this.isPause = !this.isPause; }

    pauseChat() { this.isPause = false; }

    isPaused() { return this.isPause; }

    setScrollUp(bool) { this.scrollUp = bool; }

    isScrollUp() { return this.scrollUp; }

    getChatIntervalID() { return this.chatIntervalID; }

    setChatIntervalID(intervalID) { this.chatIntervalID = intervalID; }

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

    #emoteReader(msg, theme = 'any') {
        const msg_parts = msg.trim().split(' '); // Split the message into words

        // Map each word to either <img> tag or keep it as is based on the Set
        const msg_arr = msg_parts.map(part => {
            if (this.#anyEmoteMapContainer.has(part)) {
                // If the word is in the Set, wrap it in <img>
                const imgUrl = `./assets/img/emotes/${part}.${this.#anyEmoteMapContainer.get(part)}`; // Construct the image path
                return `<img style='position:relative; top: 6px; height: 30px;' src='${imgUrl}' title='${part}'>`;
            }
            // Otherwise, keep the word as is
            return part;
        });
    
        // Join the processed parts into a single string and return
        return msg_arr.join(' ');
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