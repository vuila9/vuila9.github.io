function Stream_Simulator()  {
    const chatInput = document.getElementById('chat-input');
    const sendButton = document.getElementById('send-button');
    const startButton = document.getElementById('start-button');

    const USERS = [];
    //populateUser();

    const CHAT_DISPLAY = new ChatDisplay(limit=150);
    
    (async () => {
        await populateUser(); // Wait for populateUser() to finish
        USERS.push(new User('Vuila9_', 'May 14 2019', '#394678'));
        //console.log(USERS);
        CHAT_DISPLAY.addMessage(new ChatMessage(USERS[0], 'Hello everyone!'));
        CHAT_DISPLAY.addMessage(new ChatMessage(USERS[1], 'Great stream!'));
        CHAT_DISPLAY.addMessage(new ChatMessage(USERS[2], 'How are you doing today?'));
    })();

    sendButton.addEventListener('click', (event) => {
        sendMessage();
    });

    chatInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') 
            sendMessage();
    });


    startButton.addEventListener('click', async (event) => {
        populateUser();
    });

    function sendMessage() {
        const message = chatInput.value.trim();
        if (!message) return;
        CHAT_DISPLAY.addMessage(new ChatMessage(USERS.at(-1), chatInput.value.trim()))
        chatInput.value = '';
        CHAT_DISPLAY.getDiv().scrollTop = CHAT_DISPLAY.getDiv().scrollHeight;
    }

    async function populateUser() {
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
                    USERS.push(new User(row[0], row[1], row[2]));
                });

                // Read the next chunk
                ({ value, done } = await reader.read());
            }

            // Process the remaining buffer (last line)
            if (buffer) {
                const row = trimRow(buffer);
                USERS.push(new User(row[0], row[1], row[2]));
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
}

Stream_Simulator();

