class ChatDisplay {
    constructor(limit=200) {
        this.chatSize = 0;
        this.isPause = true;
        this.chatSizeLimit = limit;
        this.chatMessageDiv = document.getElementById('chat-messages');
    }

    toggleChat() { this.isPause = !this.isPause; }

    pauseChat() { this.isPause = false; }

    isPaused() { return this.isPause; }

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
    }

    getDiv() { return this.chatMessageDiv; }

    autoPopulate(USERS, chatlogs) { 

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

