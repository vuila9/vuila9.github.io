class ChatDisplay {
    constructor(limit=200) {
        this.chatSize = 0;
        this.isPause = true;
        this.chatSizeLimit = limit;
        this.chatMessageDiv = document.getElementById('chat-messages');
    }

    addMessage(message) { 
        const messageElement = document.createElement('p');
        messageElement.setAttribute('user', message.getUser());
        
        const messageUserElement = document.createElement('span');
        messageUserElement.className = 'user-message';
        messageUserElement.textContent = message.getUser();
        messageUserElement.style.fontWeight = "bold";
        messageUserElement.style.color = "green";
        messageUserElement.addEventListener(('click'), (event) => {
            console.log(message.getUser());
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

    autoPopulate() { return; }
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

