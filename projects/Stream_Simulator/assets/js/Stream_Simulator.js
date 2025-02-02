function Stream_Simulator()  {
    const chatInput = document.getElementById('chat-input');
    const sendButton = document.getElementById('send-button');
    const startChatButton = document.getElementById('start-chat-button');
    const emotePreview = document.getElementById('emote-preview');

    const ALL_VIEWERS = [];
    const RANDOM_VIEWERS = [];
    const ACTIVE_VIEWERS = [];
    const REGULAR_VIEWERS = [];
    const ALL_VIEWERS_NAME = [];
    const STREAMER = new User('Vuila9_', 'May 14 2019', 'May 14 2019', sub=true, subAge=69, sub_tier=3, prime=true, mod=false, turbo=false, founder=false, vip=false, verified=true, usernameColor='#394678', streamer=true);
    const CHAT_LOG = [];
    const CHAT_DISPLAY = new ChatDisplay(STREAMER, limit=150);

    let STREAM_STARTING = true;

    let user_chat_index = 0;

    (async () => {
        await CHAT_DISPLAY.populateData("VIEWER", ALL_VIEWERS, './assets/misc/random_viewers.csv', RANDOM_VIEWERS, ALL_VIEWERS_NAME);
        await CHAT_DISPLAY.populateData("VIEWER", ALL_VIEWERS, './assets/misc/active_viewers.csv', ACTIVE_VIEWERS, ALL_VIEWERS_NAME);
        startChatButton.disabled = false;
        await CHAT_DISPLAY.populateData("EMOTE", null, "./assets/img/emotes/ANY");
        await CHAT_DISPLAY.populateData("CHAT", CHAT_LOG, "./assets/misc/chatlogs.txt");
        CHAT_DISPLAY.addSystemMessage('Welcome to Stream Simulator!');
        CHAT_DISPLAY.addSystemMessage('Type /command to see useful commands');
        // let counter = 0;
        // while (counter < 150) {
        //     if (chance(90))
        //         CHAT_DISPLAY.addMessage(new ChatMessage(ACTIVE_VIEWERS[getRand(ACTIVE_VIEWERS.length)], CHAT_LOG[getRand(CHAT_LOG.length)]));
        //     else
        //         CHAT_DISPLAY.addMessage(new ChatMessage(RANDOM_VIEWERS[getRand(RANDOM_VIEWERS.length)], CHAT_LOG[getRand(CHAT_LOG.length)]));
        //     counter++;
        // }
    })();

    startChatButton.addEventListener('click', async (event) => {
        CHAT_DISPLAY.setChatRate(chatRate(CHAT_DISPLAY.getFakeViewCount()));
        if (!CHAT_DISPLAY.getStreamIntervalID()) {
            let startTime = Date.now();
            CHAT_DISPLAY.setStreamIntervalID(setInterval(() => {
                const totalElapsed = Date.now() - startTime;
                document.getElementById('channel-stream-time').textContent = timeConverter(Math.floor(totalElapsed/1000));
                if (chance(fluctuateChanceByViewerCount()())) {
                    random_change = Math.floor(Math.random() * CHAT_DISPLAY.getFakeViewCount() * 0.00005) + 1;
                    CHAT_DISPLAY.incFakeViewCount((chance(50) ? random_change : -random_change));
                    document.getElementById('channel-viewer-count').lastChild.nodeValue = CHAT_DISPLAY.getFakeViewCount().toLocaleString();
                }
            },100));
        }
        CHAT_DISPLAY.toggleChat();
        if (STREAM_STARTING) { // chat say hi when stream just starts
            //startChatButton.disabled = true;
            //CHAT_DISPLAY.spamChat(ACTIVE_VIEWERS, ['Hi', 'first', 'Hi hello', 'Hii', "Hii hiiiii", 'peepoArrive peepoArrive', 'docArrive'], duration=15000);
            STREAM_STARTING = false;
        }
        if (CHAT_DISPLAY.isPaused()) {
            startChatButton.textContent = 'Start Chat';
            clearInterval(CHAT_DISPLAY.getChatIntervalID());
            CHAT_DISPLAY.setChatIntervalID(null);
            return;
        }
        startChatButton.textContent = 'Pause Chat';
        CHAT_DISPLAY.setChatIntervalID(setInterval(() => {
            if (chance(10) && CHAT_DISPLAY.getFakeViewCount() > 1){
                let count = 0;
                while (count < getRand(5)) {
                    CHAT_DISPLAY.addMessage(new ChatMessage(RANDOM_VIEWERS[getRand(RANDOM_VIEWERS.length)], CHAT_LOG[getRand(CHAT_LOG.length)]));
                    count +=1;
                }
            }
            if (chance(90))
                CHAT_DISPLAY.addMessage(new ChatMessage(ACTIVE_VIEWERS[getRand(ACTIVE_VIEWERS.length)], CHAT_LOG[getRand(CHAT_LOG.length)]));
            else
                CHAT_DISPLAY.addMessage(new ChatMessage(RANDOM_VIEWERS[getRand(RANDOM_VIEWERS.length)], CHAT_LOG[getRand(CHAT_LOG.length)]));
        }, CHAT_DISPLAY.getChatRate()));
        //CHAT_DISPLAY.autoPopulate(ALL_VIEWERS);
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
                if (STREAMER.getChatHistory().at(user_chat_index) === undefined) {
                    user_chat_index = -STREAMER.getChatHistory().length;
                    return;
                }
                chatInput.value = STREAMER.getChatHistory().at(user_chat_index);
                break;

            case "ArrowDown":
                event.preventDefault();
                user_chat_index += 1;
                if (STREAMER.getChatHistory().at(user_chat_index) === undefined || user_chat_index >= 0) {
                    user_chat_index = 0;
                    chatInput.value = '';
                    return;
                }
                chatInput.value = STREAMER.getChatHistory().at(user_chat_index);
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

        let data;
        let type;
        if (currentPrefix.startsWith('@')) {
            data = ALL_VIEWERS_NAME;
            type = 'name';
        } else {
            data = CHAT_DISPLAY.getAnyEmoteArray();
            type = 'emote';
        }

        // Find all words that start with the currentPrefix (case-insensitive)
        if (!currentMatches.length || !currentMatches[0].toLowerCase().startsWith(currentPrefix.toLowerCase())) {
            currentMatches = data.filter((keyword) => 
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
            if (type == 'emote') {
                emotePreview.src = CHAT_DISPLAY.getEmoteSrc(replacementWord);
                emotePreview.style.visibility = 'visible';
            }
            // Get the word before the cursor to replace
            const wordInfo = getWordBeforeCursor(inputValue, cursorPosition);
            const { startIndex } = wordInfo;
            const updatedValue = inputValue.slice(0, startIndex) + replacementWord + inputValue.slice(cursorPosition);
            chatInput.value = updatedValue;
        }
    }

    // Helper: Get the word immediately before the cursor
    function getWordBeforeCursor(text, cursorPosition) {
        const leftPart = text.slice(0, cursorPosition); // Text up to the cursor
        const match = leftPart.match(/(?:^|\s)([@]?\w+)$/); // Find the last word or @word using regex
        if (!match) return { word: null, startIndex: cursorPosition }; // No match

        const word = match[1]; // Extracted word (including '@' if present)
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
                CHAT_DISPLAY.commandHandler(command, command_body, STREAMER, ALL_VIEWERS);
            }
            else
                CHAT_DISPLAY.addSystemMessage(`Invalid command: ${command}`);

            STREAMER.addChatHistory(chatInput.value.trim());
            chatInput.value = '';
            return;
        }
        CHAT_DISPLAY.addMessage(new ChatMessage(STREAMER, chatInput.value.trim()))
        chatInput.value = '';
    }

    function timeConverter(seconds) {
        const hour = String(Math.floor(seconds / 3600));
        const minute = String(Math.floor((seconds % 3600) / 60)).padStart(2, '0');
        const second = String(seconds % 60).padStart(2, '0');
        return `${hour}:${minute}:${second}`;
    }

    function fluctuateChanceByViewerCount() {
        const viewcount = CHAT_DISPLAY.getFakeViewCount();
        if (viewcount < 100) return 5;
        else if (viewcount < 1000) return 10
        else if (viewcount < 10000) return 15;
        else if (viewcount < 100000) return 25;
        else return 30;
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