// Stream_Simulator_class_chat.js
function smartSplit(sentence) {
    const arr = [];
    let parts = '';
    let quotation = false;
    for (let char of sentence) {
        if (char == '"') {
            quotation = !quotation;
            continue
        }
        if (char === ' ' && !quotation) {
            arr.push(parts.trim());
            parts = '';
            continue;
        }
        parts += char;
    }
    arr.push(parts);
    return arr;
}

spamChat(VIEWERS, msg, duration_=null) {
    if (this.isPause) return;
    if (Number(this.fakeViewCount) < 50) return;
    document.getElementById('start-chat-button').disabled = true;
    const spam_chat = this.#spamVariation(msg);
    const chat_rate = Math.min(this.chatRate/2, 800);
    const intervalId = setInterval(() => {
        this.addMessage(new ChatMessage(VIEWERS[this.#getRand(VIEWERS.length)], spam_chat[this.#getRand(spam_chat.length)]));
    }, chat_rate);
    let duration = (duration_ === null) ? Math.max(Math.min(6900 * 500/this.chatRate, 13000), 5000) : duration_;
    setTimeout(() => {
        clearInterval(intervalId); 
        document.getElementById('start-chat-button').disabled = false;
    }, duration);
}