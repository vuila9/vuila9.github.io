document.addEventListener('DOMContentLoaded', () => {
    const chatMessages = document.getElementById('chat-messages');
    const chatInput = document.getElementById('chat-input');
    const sendButton = document.getElementById('send-button');
    const recommendedChannels = document.getElementById('recommended-channels');

    // Sample chat messages
    const sampleMessages = [
        { user: 'User1', message: 'Hello everyone!' },
        { user: 'User2', message: 'Great stream!' },
        { user: 'User3', message: 'How are you doing today?' }
    ];

    // Sample recommended channels
    const sampleChannels = [
        { name: 'Channel1', game: 'Game1', viewers: 1000 },
        { name: 'Channel2', game: 'Game2', viewers: 2000 },
        { name: 'Channel3', game: 'Game3', viewers: 3000 }
    ];

    // Populate chat messages
    sampleMessages.forEach(msg => {
        const messageElement = document.createElement('p');
        messageElement.innerHTML = `<strong>${msg.user}:</strong> ${msg.message}`;
        chatMessages.appendChild(messageElement);
    });

    // Populate recommended channels
    sampleChannels.forEach(channel => {
        const channelElement = document.createElement('div');
        channelElement.className = 'channel';
        channelElement.innerHTML = `
            <img src="https://via.placeholder.com/40" alt="${channel.name} avatar">
            <div>
                <p><strong>${channel.name}</strong></p>
                <p>${channel.game}</p>
                <p>${channel.viewers} viewers</p>
            </div>
        `;
        recommendedChannels.appendChild(channelElement);
    });

    // Send message functionality
    function sendMessage() {
        const message = chatInput.value.trim();
        if (message) {
            const messageElement = document.createElement('p');
            messageElement.innerHTML = `<strong>You:</strong> ${message}`;
            chatMessages.appendChild(messageElement);
            chatInput.value = '';
            chatMessages.scrollTop = chatMessages.scrollHeight;
        }
    }

    sendButton.addEventListener('click', sendMessage);
    chatInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            sendMessage();
        }
    });

    // Toggle like button
    const likeButton = document.getElementById('like-button');
    likeButton.addEventListener('click', () => {
        likeButton.classList.toggle('active');
        likeButton.setAttribute('aria-pressed', likeButton.classList.contains('active'));
    });

    // Toggle follow button
    const followButton = document.getElementById('follow-button');
    followButton.addEventListener('click', () => {
        followButton.classList.toggle('following');
        followButton.textContent = followButton.classList.contains('following') ? 'Following' : 'Follow';
    });
});

