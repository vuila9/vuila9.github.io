function Stream_Simulator()  {
    const chatInput = document.getElementById('chat-input');
    const sendButton = document.getElementById('send-button');

    const CHAT_DISPLAY = new ChatDisplay(limit=150);
    CHAT_DISPLAY.addMessage(new ChatMessage('User1', 'Hello everyone!'));
    CHAT_DISPLAY.addMessage(new ChatMessage('User2', 'Great stream!'));
    CHAT_DISPLAY.addMessage(new ChatMessage('User3', 'How are you doing today?'));

    sendButton.addEventListener('click', (event) => {
        sendMessage();
    });

    chatInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') 
            sendMessage();
    });

    function sendMessage() {
        const message = chatInput.value.trim();
        if (!message) return;
        CHAT_DISPLAY.addMessage(new ChatMessage('You', chatInput.value.trim()))
        chatInput.value = '';
        CHAT_DISPLAY.getDiv().scrollTop = CHAT_DISPLAY.getDiv().scrollHeight;
    }
}

Stream_Simulator();

