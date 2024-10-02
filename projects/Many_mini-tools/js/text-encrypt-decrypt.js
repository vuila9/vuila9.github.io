async function encryptMessage(message, key) {
    const encoder = new TextEncoder();
    const iv = crypto.getRandomValues(new Uint8Array(12)); // 12 bytes IV for AES-GCM
    
    const cryptoKey = await window.crypto.subtle.importKey(
        'raw',
        encoder.encode(key),
        { name: 'AES-GCM' },
        false,
        ['encrypt']
    );

    const encrypted = await window.crypto.subtle.encrypt(
        {
            name: 'AES-GCM',
            iv: iv
        },
        cryptoKey,
        encoder.encode(message)
    );

    // Combine the IV and encrypted message
    const combined = new Uint8Array(iv.length + encrypted.byteLength);
    combined.set(iv);
    combined.set(new Uint8Array(encrypted), iv.length);

    // Convert to base64 for easier storage/transmission
    return btoa(String.fromCharCode(...combined));
}

async function decryptMessage(encryptedMessage, key) {
    const decoder = new TextDecoder();
    const encodedKey = new TextEncoder().encode(key);
    
    // Convert the base64 encoded message back to a Uint8Array
    const combined = Uint8Array.from(atob(encryptedMessage), c => c.charCodeAt(0));

    // Extract the IV and ciphertext
    const iv = combined.slice(0, 12); // First 12 bytes are the IV
    const ciphertext = combined.slice(12); // Remainder is the ciphertext

    // Import the key for AES decryption
    const cryptoKey = await window.crypto.subtle.importKey(
        'raw',
        encodedKey,
        { name: 'AES-GCM' },
        false,
        ['decrypt']
    );

    // Decrypt the message
    try {
        const decrypted = await window.crypto.subtle.decrypt(
            {
                name: 'AES-GCM',
                iv: iv
            },
            cryptoKey,
            ciphertext
        );

        // Convert the decrypted message back to a string
        return decoder.decode(decrypted);
    } catch (error) {
        console.error("Decryption failed:", error);
        return null; // Return null or handle the error as appropriate
    }
}

async function hashKey(key) {
    const encoder = new TextEncoder();
    const encodedKey = encoder.encode(key);

    // Hash the key using SHA-256
    const hashBuffer = await window.crypto.subtle.digest('SHA-256', encodedKey);

    // Convert the hash buffer to a hexadecimal string
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(byte => byte.toString(16).padStart(2, '0')).join('');

    return hashHex.slice(0,16); // 128-bit or 16 char length key
}

async function EncryptDecrypt(option, message, hashedKey) {
    switch (option) {
        case "encrypt": // Encrypt
            return encryptMessage(message, hashedKey).then(encryptedMessage => {
                return encryptedMessage;
            }).catch(error => {
                console.error("Encryption failed:", error);
                return "";
            });
        
        case "decrypt": // Decrypt
            return decryptMessage(message, hashedKey).then(decryptedMessage => {
                return decryptedMessage;
            }).catch(error => {
                console.error("Decryption failed:", error);
                return "";
            });

        default: // Default
            console.log("It should be impossible to get here but if you somehow make it, you might be a wizzard");
            return Promise.resolve(""); // Return a resolved empty string in case of invalid option
    }
}

// JavaScript to handle the button click
document.getElementById("TED-button-submit").onclick = function() {
    const MAX_STR_LENGTH = 80;
    var option = document.getElementById("TED-select-prompt").value;
    var message = document.getElementById("TED-input-message").value;
    var key = document.getElementById("TED-input-key").value;
    document.getElementById("TED-text-result").innerHTML = `&nbsp;`;

    hashKey(key).then(hashedKey => {
        EncryptDecrypt(option, message, hashedKey).then(result => {
            if (result.length > MAX_STR_LENGTH) {
                document.getElementById("TED-text-result").innerHTML = `The message processed exceeds the display limit. Please open the console window by inspecting the page to view the full message.`;
                console.log(`Your ${option}ed message is: \n${result}`);
            }
            else {
                if (result.length != 0) 
                    document.getElementById("TED-text-result").innerHTML = `Your ${option}ed message is: ${result}`;
                else
                    document.getElementById("TED-text-result").innerHTML = `Your ${option}ed message is: null`;
            }
        });
    });
};
