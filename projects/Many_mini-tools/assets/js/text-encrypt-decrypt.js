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
        //console.error(`Decryption failed: ${error}, likely wrong key`);
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
                //console.error("Encryption failed:", error);
                return "";
            });
        
        case "decrypt": // Decrypt
            return decryptMessage(message, hashedKey).then(decryptedMessage => {
                return decryptedMessage;
            }).catch(error => {
                //console.error("Decryption failed:", error);
                return "";
            });

        default: // Default
            console.log("It should be impossible to get here but if you somehow make it, you might be a wizzard");
            return Promise.resolve(""); // Return a resolved empty string in case of invalid option
    }
}

const TED_OUTPUT = document.getElementById("TED-output");
const TED_OUTPUT_TEXT = document.getElementById("TED-text-output");
const TED_COPY_BUTTON = document.getElementById("TED-button-copy");

// Show a status line, and optionally a copyable result box below it
function TED_showResult(status, output = "") {
    PRINT_TO_HTML("TED-text-result", status);
    TED_OUTPUT_TEXT.textContent = output; // textContent: decrypted text is never parsed as HTML
    TED_OUTPUT.hidden = output === "";
    TED_COPY_BUTTON.textContent = "Copy";
    REFIT_CONTENT("TED-body");
}

// Copy the result; falls back to execCommand where the Clipboard API is unavailable
async function TED_copyResult() {
    const text = TED_OUTPUT_TEXT.textContent;
    try {
        await navigator.clipboard.writeText(text);
    } catch (error) {
        const temp = document.createElement("textarea");
        temp.value = text;
        temp.setAttribute("readonly", "");
        temp.style.position = "fixed";
        temp.style.opacity = "0";
        document.body.appendChild(temp);
        temp.select();
        document.execCommand("copy");
        temp.remove();
    }
    TED_COPY_BUTTON.textContent = "Copied!";
    setTimeout(() => { TED_COPY_BUTTON.textContent = "Copy"; }, 1500);
}

TED_COPY_BUTTON.onclick = TED_copyResult;

// JavaScript to handle the button click
document.getElementById("TED-button-submit").onclick = async function() {
    const option = document.getElementById("TED-select-prompt").value;
    const message = document.getElementById("TED-input-message").value;
    const key = document.getElementById("TED-input-key").value;
    TED_showResult("&nbsp;");

    if (key == "") {
        TED_showResult("Please enter a key to use this feature");
        return;
    }

    const hashedKey = await hashKey(key);
    const result = await EncryptDecrypt(option, message, hashedKey);
    if (result == null)
        TED_showResult("Wrong key");
    else if (result.length == 0)
        TED_showResult(`Your ${option}ed message might be fake.`);
    else
        TED_showResult(`Your ${option}ed message is:`, result);
};

// Re-fit the panel if a rotation/resize changes how the result wraps
window.addEventListener("resize", () => REFIT_CONTENT("TED-body"));
