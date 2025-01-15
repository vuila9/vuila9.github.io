function Stream_Simulator()  {
    const chatInput = document.getElementById('chat-input');
    const sendButton = document.getElementById('send-button');
    const startChatButton = document.getElementById('start-chat-button');

    const USERS = [];
    const CHAT_LOG = [];

    const CHAT_DELAY = 500;

    const CHAT_DISPLAY = new ChatDisplay(limit=150);
    
    (async () => {
        await CHAT_DISPLAY.populateUser(USERS); // Wait for populateUser() to finish
        USERS.push(new User('Vuila9_', 'May 14 2019', '#394678'));
        startChatButton.disabled = false;
        //console.log(USERS);
    })();

    (async () => {
        await CHAT_DISPLAY.populateChat(CHAT_LOG); // Wait for populateUser() to finish
        //console.log(CHAT_LOG);
        let counter = 0;
        while (counter < 100) {
            CHAT_DISPLAY.addMessage(new ChatMessage(USERS[getRand(USERS.length)], CHAT_LOG[getRand(CHAT_LOG.length)]));
            counter +=1 ;
        }
    })();

    sendButton.addEventListener('click', (event) => {
        sendMessage();
    });

    chatInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') 
            sendMessage();
    });

    startChatButton.addEventListener('click', async (event) => {
        CHAT_DISPLAY.toggleChat();
        if (CHAT_DISPLAY.isPaused()) {
            startChatButton.textContent = 'Start Chat';
            clearInterval(CHAT_DISPLAY.getChatIntervalID());
            CHAT_DISPLAY.setChatIntervalID(null);
            return;
        }
        startChatButton.textContent = 'Pause Chat';
        CHAT_DISPLAY.setChatIntervalID(setInterval(() => {
            CHAT_DISPLAY.addMessage(new ChatMessage(USERS[getRand(USERS.length)], CHAT_LOG[getRand(CHAT_LOG.length)]));
        }, CHAT_DELAY));

        CHAT_DISPLAY.autoPopulate(USERS);
    });

    function getRand(size) {
        return Math.floor(Math.random() * size);
    }

    function sendMessage() {
        const message = chatInput.value.trim();
        if (!message) return;
        CHAT_DISPLAY.addMessage(new ChatMessage(USERS.at(-1), chatInput.value.trim()))
        chatInput.value = '';
        //CHAT_DISPLAY.getDiv().scrollTop = CHAT_DISPLAY.getDiv().scrollHeight;
    }
}

Stream_Simulator();

