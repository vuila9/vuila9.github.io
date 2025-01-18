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
        await CHAT_DISPLAY.populateData("VIEWER", VIEWERS, './assets/misc/random_users.csv');
        startChatButton.disabled = false;
        await CHAT_DISPLAY.populateData("EMOTE", null, "./assets/img/emotes/ANY");
        await CHAT_DISPLAY.populateData("CHAT", CHAT_LOG, "./assets/misc/chatlogs.txt");

        let counter = 0;
        while (counter < 100) {
            CHAT_DISPLAY.addMessage(new ChatMessage(VIEWERS[getRand(VIEWERS.length)], CHAT_LOG[getRand(CHAT_LOG.length)]));
            counter +=1 ;
        }
    })();

    sendButton.addEventListener('click', (event) => {
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

    let matchIndex = -1;
    let currentMatches = [];
    let currentPrefix = "";

    chatInput.addEventListener("keydown", (event) => {
        if (event.key === "Enter") {
            sendMessage();
            currentPrefix = "";
            matchIndex = -1;
            currentMatches = [];
        } else if (event.key === "Tab") {
            event.preventDefault();
            if (currentPrefix.length == 0)
                return;
            autoComplete(); 
        } else if (event.key === " ") { // Reset the currentPrefix when Spacebar is pressed
            currentPrefix = "";
            matchIndex = -1;
            currentMatches = [];
        } else if (event.key === "Backspace" || event.key === 'Delete') { // Adjust the currentPrefix when Backspace or Delete key is pressed
            const inputValue = chatInput.value;
            const cursorPosition = chatInput.selectionStart;
            const wordInfo = getWordBeforeCursor(inputValue, cursorPosition);
            if (wordInfo.word) {
                currentPrefix = wordInfo.word; // Update the current prefix based on the word before the cursor
                currentMatches = [];
            }
        }
    });

    // Event listener for input events to reset match state
    chatInput.addEventListener("input", () => {
        const inputValue = chatInput.value;
        const cursorPosition = chatInput.selectionStart;

        // Get the word before the cursor
        const wordInfo = getWordBeforeCursor(inputValue, cursorPosition);
        if (!wordInfo.word) return; // No valid word to process

        const { word } = wordInfo;

        // Update the current prefix as you type
        currentPrefix = word;
    });

    // Autocomplete function
    function autoComplete() {
        const inputValue = chatInput.value;
        const cursorPosition = chatInput.selectionStart;

        // Find all words that start with the currentPrefix (case-insensitive)
        if (!currentMatches.length || !currentMatches[0].toLowerCase().startsWith(currentPrefix.toLowerCase())) {
            currentMatches = CHAT_DISPLAY.getAnyEmoteArray().filter((keyword) => 
                keyword.toLowerCase().startsWith(currentPrefix.toLowerCase())
            );
            matchIndex = -1; // Reset match index
        }

        // Cycle through the matching words
        if (currentMatches.length > 0) {
            matchIndex = (matchIndex + 1) % currentMatches.length; // Increment and cycle index
            const replacementWord = currentMatches[matchIndex];

            // Get the word before the cursor to replace
            const wordInfo = getWordBeforeCursor(inputValue, cursorPosition);
            const { startIndex } = wordInfo;

            // Replace the word before the cursor with the current match
            const updatedValue = inputValue.slice(0, startIndex) + replacementWord + inputValue.slice(cursorPosition);

            // Update the input field and set the cursor position
            chatInput.value = updatedValue;
            chatInput.selectionStart = chatInput.selectionEnd = startIndex + replacementWord.length;
        }
    }

    // Helper: Get the word immediately before the cursor
    function getWordBeforeCursor(text, cursorPosition) {
        const leftPart = text.slice(0, cursorPosition); // Text up to the cursor
        const match = leftPart.match(/\b\w+$/); // Find the last word using regex
        if (!match) return { word: null, startIndex: cursorPosition }; // No match

        const word = match[0]; // Extracted word
        const startIndex = cursorPosition - word.length; // Start index of the word
        return { word, startIndex };
    }
    
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
    }
}

Stream_Simulator();

