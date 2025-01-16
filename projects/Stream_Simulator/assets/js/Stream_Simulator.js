function Stream_Simulator()  {
    const chatInput = document.getElementById('chat-input');
    const sendButton = document.getElementById('send-button');
    const startChatButton = document.getElementById('start-chat-button');

    const VIEWERS = [];
    const USER = new User('Vuila9_', 'May 14 2019', '#394678');
    const CHAT_LOG = [];

    const CHAT_DELAY = 500;

    const CHAT_DISPLAY = new ChatDisplay(limit=150);

    (async () => {
        await CHAT_DISPLAY.populateUser(VIEWERS); // Wait for populateUser() to finish
        startChatButton.disabled = false;
        await CHAT_DISPLAY.populateEmote();
        await CHAT_DISPLAY.populateChat(CHAT_LOG); // Wait for populateUser() to finish
        let counter = 0;
        while (counter < 100) {
            CHAT_DISPLAY.addMessage(new ChatMessage(VIEWERS[getRand(VIEWERS.length)], CHAT_LOG[getRand(CHAT_LOG.length)]));
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
            if (chance(30)){
                CHAT_DISPLAY.addMessage(new ChatMessage(VIEWERS[getRand(VIEWERS.length)], CHAT_LOG[getRand(CHAT_LOG.length)]));
            }
            CHAT_DISPLAY.addMessage(new ChatMessage(VIEWERS[getRand(VIEWERS.length - 1)], CHAT_LOG[getRand(CHAT_LOG.length)]));
        }, CHAT_DELAY));

        CHAT_DISPLAY.autoPopulate(VIEWERS);
    });

    function getRand(size) {
        return Math.floor(Math.random() * size); // excluding the last line of data files
    }

    function chance(percent) {
        return Math.floor(Math.random() * 101) <= percent;
    }

    function sendMessage() {
        const message = chatInput.value.trim();
        if (!message) return;
        CHAT_DISPLAY.addMessage(new ChatMessage(USER, chatInput.value.trim()))
        chatInput.value = '';
        //CHAT_DISPLAY.getDiv().scrollTop = CHAT_DISPLAY.getDiv().scrollHeight;
    }
}

Stream_Simulator();

