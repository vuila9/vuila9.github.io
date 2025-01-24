function Stream_Simulator()  {
    const chatInput = document.getElementById('chat-input');
    const sendButton = document.getElementById('send-button');
    const startChatButton = document.getElementById('start-chat-button');
    const emotePreview = document.getElementById('emote-preview');

    const VIEWERS = [];
    const USER = new User('Vuila9_', 'May 14 2019', '#394678');
    const CHAT_LOG = [];
    const CHAT_DISPLAY = new ChatDisplay(limit=150);

    let STREAM_STARTING = true;

    let user_chat_index = 0;

    (async () => {
        await CHAT_DISPLAY.populateData("VIEWER", VIEWERS, './assets/misc/random_users.csv');
        startChatButton.disabled = false;
        await CHAT_DISPLAY.populateData("EMOTE", null, "./assets/img/emotes/ANY");
        await CHAT_DISPLAY.populateData("CHAT", CHAT_LOG, "./assets/misc/chatlogs.txt");
    })();

    startChatButton.addEventListener('click', async (event) => {
        CHAT_DISPLAY.setChatRate(chatRate(CHAT_DISPLAY.getFakeViewCount()));
        if (!CHAT_DISPLAY.getStreamIntervalID()) {
            let startTime = Date.now();
            CHAT_DISPLAY.setStreamIntervalID(setInterval(() => {
                const totalElapsed = Date.now() - startTime;
                document.getElementById('channel-stream-time').textContent = timeConverter(Math.floor(totalElapsed/1000));
            },100));
        }
        if (STREAM_STARTING) { // chat say hi when stream just starts
            CHAT_DISPLAY.spamChat(VIEWERS, ['Hi', 'Hi hello', 'Hii', "Hii hiiiii", 'peepoArrive peepoArrive', 'docArrive'], duration=15000);
            STREAM_STARTING = false;
        }
        CHAT_DISPLAY.toggleChat();
        if (CHAT_DISPLAY.isPaused()) {
            startChatButton.textContent = 'Start Chat';
            clearInterval(CHAT_DISPLAY.getChatIntervalID());
            CHAT_DISPLAY.setChatIntervalID(null);
            return;
        }
        startChatButton.textContent = 'Pause Chat';
        CHAT_DISPLAY.setChatIntervalID(setInterval(() => {
            if (chance(10)){
                let count = 0;
                while (count <getRand(5)) {
                    CHAT_DISPLAY.addMessage(new ChatMessage(VIEWERS[getRand(VIEWERS.length)], CHAT_LOG[getRand(CHAT_LOG.length)]));
                    count +=1;
                }
            }
            CHAT_DISPLAY.addMessage(new ChatMessage(VIEWERS[getRand(VIEWERS.length - 1)], CHAT_LOG[getRand(CHAT_LOG.length)]));
        }, CHAT_DISPLAY.getChatRate()));
        CHAT_DISPLAY.autoPopulate(VIEWERS);
    });

    let matchIndex = -1;
    let currentMatches = [];
    let currentPrefix = "";

    chatInput.addEventListener("keydown", (event) => {
        switch (event.key) {
            case "Enter":
                sendMessage();
                currentPrefix = "";
                matchIndex = -1;
                currentMatches = [];
                user_chat_index = 0;
                break;
        
            case "Tab":
                event.preventDefault();
                if (currentPrefix.length === 0 || chatInput.value.length === 0) return;
                autoComplete(event.shiftKey);
                break;
        
            case " ":
            case "ArrowLeft":
            case "ArrowRight":
                // Reset the currentPrefix when Spacebar, ArrowLeft, or ArrowRight is pressed
                currentPrefix = "";
                matchIndex = -1;
                currentMatches = [];
                emotePreview.style.visibility = 'hidden';
                break;
            
            case "ArrowUp":
                event.preventDefault();
                user_chat_index -= 1;
                if (USER.getChatHistory().at(user_chat_index) === undefined) {
                    user_chat_index = -USER.getChatHistory().length;
                    return;
                }
                chatInput.value = USER.getChatHistory().at(user_chat_index);
                break;

            case "ArrowDown":
                event.preventDefault();
                user_chat_index += 1;
                if (USER.getChatHistory().at(user_chat_index) === undefined || user_chat_index >= 0) {
                    user_chat_index = 0;
                    chatInput.value = '';
                    return;
                }
                chatInput.value = USER.getChatHistory().at(user_chat_index);
                break;
        
            case "Backspace":
            case "Delete":
                // Adjust the currentPrefix when Backspace or Delete key is pressed
                const inputValue = chatInput.value;
                const cursorPosition = chatInput.selectionStart;
                const wordInfo = getWordBeforeCursor(inputValue, cursorPosition);
                if (wordInfo.word) {
                    currentPrefix = wordInfo.word; // Update the current prefix based on the word before the cursor
                    currentMatches = [];
                }
                emotePreview.style.visibility = 'hidden';
                break;
        
            default:
                break;
        }
    });

    sendButton.addEventListener('click', (event) => {
        sendMessage();
        currentPrefix = "";
        matchIndex = -1;
        currentMatches = [];
        user_chat_index = 0;
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
        emotePreview.style.visibility = 'hidden';
    });

    // Autocomplete function
    function autoComplete(shift=false) {
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
            if (shift) 
                matchIndex = (matchIndex == 0) ? (currentMatches.length - 1) : (matchIndex - 1);
            else 
                matchIndex = (matchIndex + 1) % currentMatches.length;
            const replacementWord = currentMatches[matchIndex];
            emotePreview.src = CHAT_DISPLAY.getEmoteSrc(replacementWord);
            emotePreview.style.visibility = 'visible';

            // Get the word before the cursor to replace
            const wordInfo = getWordBeforeCursor(inputValue, cursorPosition);
            const { startIndex } = wordInfo;

            // Replace the word before the cursor with the current match
            const updatedValue = inputValue.slice(0, startIndex) + replacementWord + inputValue.slice(cursorPosition);

            // Update the input field and set the cursor position
            chatInput.value = updatedValue;
            //chatInput.selectionStart = chatInput.selectionEnd = startIndex + replacementWord.length;
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
        emotePreview.style.visibility = 'hidden';
        const message = chatInput.value.trim();
        if (!message) return;
        if (message[0] === '/') {
            const command = message.split(' ')[0];
            const command_body = message.split(' ').slice(1).join(' ');
            if (CHAT_DISPLAY.verifyCommand(command)) {
                CHAT_DISPLAY.commandHandler(command, command_body, USER, VIEWERS);
            }
            else
                CHAT_DISPLAY.addSystemMessage(`Invalid command: ${command}`);

            USER.addChatHistory(chatInput.value.trim());
            chatInput.value = '';
            return;
        }
        CHAT_DISPLAY.addMessage(new ChatMessage(USER, chatInput.value.trim()))
        chatInput.value = '';
    }

    function timeConverter(seconds) {
        const hour = String(Math.floor(seconds / 3600)).padStart(2, '0');
        const minute = String(Math.floor((seconds % 3600) / 60)).padStart(2, '0');
        const second = String(seconds % 60).padStart(2, '0');
        return `${hour}:${minute}:${second}`;
    }

    function chatRate(viewerCount) {
        const v0 = 100000; 
        const k = 0.00001;

        const rate = 10* (1 + Math.exp(-k * (viewerCount - v0)));

        if (viewerCount < 1000 && viewerCount > 500) 
            return 4000; 
        else if (viewerCount < 500 && viewerCount > 100)
            return 7000;
        else if (viewerCount < 100)
            return 10000;

        return rate * 15;
    }

}

Stream_Simulator();

