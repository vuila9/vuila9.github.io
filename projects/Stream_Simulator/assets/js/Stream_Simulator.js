function Stream_Simulator()  {
    const chatInput = document.getElementById('chat-input');
    const sendButton = document.getElementById('send-button');
    const startChatButton = document.getElementById('start-chat-button');
    const emotePreview = document.getElementById('emote-preview');
    const chatMessageDiv = document.getElementById('chat-messages');

    const ALL_VIEWERS = [];
    const RANDOM_VIEWERS = [];
    const ACTIVE_VIEWERS = [];
    const REGULAR_VIEWERS = [];
    const ALL_VIEWERS_NAME = [];
    const STREAMER = new User('Vuila9_', 'May 14 2019', 'May 14 2019', sub=true, subAge=69, sub_tier=3, prime=true, mod=false, turbo=false, founder=false, vip=false, verified=true, gifted=1703, usernameColor='#394678', streamer=true);
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
                if (chance(fluctuateChanceByViewerCount())) {
                    random_change = Math.floor(Math.random() * CHAT_DISPLAY.getFakeViewCount() * 0.00005) + 1;
                    CHAT_DISPLAY.incFakeViewCount((chance(50) ? random_change : -random_change));
                    document.getElementById('channel-viewer-count').lastChild.nodeValue = CHAT_DISPLAY.getFakeViewCount().toLocaleString();
                }
                let gift_rate = (CHAT_DISPLAY.getFakeViewCount() / 10000000) * 1.15 * CHAT_DISPLAY.getGiftRate();
                if (chance(fluctuateChanceByViewerCount(gift_rate)) && !CHAT_DISPLAY.isPaused()) {
                    const randomGiftAmount = getRandomGiftAmount();
                    const gifter = (chance(80)) ? ACTIVE_VIEWERS[getRand(ACTIVE_VIEWERS.length)] : ALL_VIEWERS[getRand(ALL_VIEWERS.length)];
                    CHAT_DISPLAY.addGiftAlertOverlay(randomGiftAmount, gifter);
                    CHAT_DISPLAY.subGifting(randomGiftAmount, ALL_VIEWERS, gifter);
                }

                let sub_rate = (CHAT_DISPLAY.getFakeViewCount() / 10000000) * 1.8 * CHAT_DISPLAY.getGiftRate();
                if (chance(fluctuateChanceByViewerCount(sub_rate)) && !CHAT_DISPLAY.isPaused()) {
                    const subber = (chance(50)) ? ACTIVE_VIEWERS[getRand(ACTIVE_VIEWERS.length)] : ALL_VIEWERS[getRand(ALL_VIEWERS.length)];
                    if (!subber.isSub()) {
                        const sub_tier = getRandomSubTier();
                        const message = CHAT_LOG[getRand(CHAT_LOG.length)];
                        const prime = chance(60);
                        CHAT_DISPLAY.addSubAlertOverlay(subber, sub_tier, message, prime);
                        CHAT_DISPLAY.viewerSubsribe(subber, sub_tier, message, prime);
                    }
                }
            },200));
        }
        CHAT_DISPLAY.toggleChat();
        if (STREAM_STARTING) { // chat say hi when stream just starts
            CHAT_DISPLAY.spamChat(ACTIVE_VIEWERS, ['Hi', 'first', 'Hi hello', 'Hii', "Hii hiiiii", 'peepoArrive peepoArrive', 'docArrive'], duration=10000);
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

    let isMouseOver = false;
    chatMessageDiv.addEventListener('mouseenter', () => {
        isMouseOver = true;
    });
    chatMessageDiv.addEventListener('mouseleave', () => {
        isMouseOver = false;
    });
    chatMessageDiv.addEventListener('wheel', (event) => {
        if (isMouseOver) {
            if (event.deltaY < 0 && !CHAT_DISPLAY.isPaused()) 
                startChatButton.click(); // Call your custom function here
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
        return Math.floor(Math.random() * size);
    }

    function chance(percent) {
        return (Math.random() * 101) <= percent;
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

    function fluctuateChanceByViewerCount(rate=1) {
        const viewcount = CHAT_DISPLAY.getFakeViewCount();
        if (viewcount < 100) {
            if (rate != 1)
                return viewcount/1000;
            else
                return 5;
        }
        else if (viewcount < 1000) return 10 * rate;
        else if (viewcount < 10000) return 15 * rate;
        else if (viewcount < 100000) return 25 * rate;
        else return 30 * rate;
    }

    function getRandomGiftAmount() {
        const items = [1, 5, 10, 20, 50, 100];
        const weights = [0.04, 0.35, 0.25, 0.2, 0.15, 0.01];
        const totalWeight = weights.reduce((acc, weight) => acc + weight, 0);

        // Generate a random number between 0 and the total weight
        const randomNum = Math.random() * totalWeight;

        // Iterate through the items and accumulate weights
        let accumulatedWeight = 0;
        for (let i = 0; i < items.length; i++) {
            accumulatedWeight += weights[i];
            if (randomNum <= accumulatedWeight) {
                return items[i];
            }
        }
    }

    function getRandomSubTier() {
        const tiers = [1,2,3];
        const weights = [99, 0.9, 0.1];
        const totalWeight = weights.reduce((acc, weight) => acc + weight, 0);

        const randomNum = Math.random() * totalWeight;
        let accumulatedWeight = 0;
        for (let i = 0; i < tiers.length; i++) {
            accumulatedWeight += weights[i];
            if (randomNum <= accumulatedWeight) {
                return tiers[i];
            }
        }
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