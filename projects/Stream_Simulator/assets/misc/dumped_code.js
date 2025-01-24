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