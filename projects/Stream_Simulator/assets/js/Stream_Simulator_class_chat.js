class ChatDisplay {
    constructor(limit=200) {
        this.chatSize = 0;
        this.isPause = true;
        this.chatSizeLimit = limit;
        this.chatIntervalID = null;
        this.scrollUp = false;
        this.chatMessageDiv = document.getElementById('chat-messages');
    }

    toggleChat() { this.isPause = !this.isPause; }

    pauseChat() { this.isPause = false; }

    isPaused() { return this.isPause; }

    setScrollUp(bool) { this.scrollUp = bool; }

    isScrollUp() { return this.scrollUp; }

    getChatIntervalID() { return this.chatIntervalID; }

    setChatIntervalID(intervalID) { this.chatIntervalID = intervalID; }

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
        messageContent.textContent = `: ${message.getContent()}`;
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

    #emoteReader() {
    }

    getDiv() { return this.chatMessageDiv; }

    async populateUser(VIEWERS) {
        const csvFileUrl = './assets/misc/random_users.csv'; 
        try {
            const response = await fetch(csvFileUrl);
            if (!response.ok) throw new Error(`Error fetching CSV: ${response.statusText}`);

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
                    const row = trimRow(line);
                    VIEWERS.push(new User(row[0], row[1], row[2]));
                });

                // Read the next chunk
                ({ value, done } = await reader.read());
            }

            // Process the remaining buffer (last line)
            if (buffer) {
                const row = trimRow(buffer);
                VIEWERS.push(new User(row[0], row[1], row[2]));
            }

            //done here
            
        } catch (error) {
            console.error(error);
            alert('Failed to load Random_user.csv file.');
        }

        // Parse a single row of CSV
        function trimRow(row) {
            return row.split(',').map(value => value.trim());
        }
    }

    async populateChat(CHAT_LOG) {
        const csvFileUrl = './assets/misc/chatlogs.txt'; 
        try {
            const response = await fetch(csvFileUrl);
            if (!response.ok) throw new Error(`Error fetching TXT: ${response.statusText}`);

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
                    const row = trimRow(line);
                    //VIEWERS.push(new User(row[0], row[1], row[2]));
                    CHAT_LOG.push(row)
                });

                // Read the next chunk
                ({ value, done } = await reader.read());
            }

            // Process the remaining buffer (last line)
            if (buffer) {
                const row = trimRow(buffer);
                //VIEWERS.push(new User(row[0], row[1], row[2]));
                CHAT_LOG.push(row);
            }

            //done here
            
        } catch (error) {
            console.error(error);
            alert('Failed to load Random_user.csv file.');
        }

        // Parse a single row of CSV
        function trimRow(row) {
            return row.replace('\r', '');
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

