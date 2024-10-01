// Array of script paths to load
const scripts = [
    './js/text-encrypt-decrypt.js',
    './js/regex-comparison.js',
    './js/calendar-date-teller.js'
];

// Function to dynamically load each script
function loadScripts(scripts, callback) {
    let index = 0;

    function loadNextScript() {
        if (index < scripts.length) {
            const script = document.createElement('script');
            script.src = scripts[index];  // No folder prefix
            script.onload = () => {
                console.log(`${scripts[index]} loaded`);
                index++;
                loadNextScript();  // Load the next script after the current one is done
            };
            script.onerror = () => console.error(`Failed to load ${scripts[index]}`);
            document.head.appendChild(script);
        } else if (callback) {
            callback();  // All scripts are loaded, call the callback
        }
    }

    loadNextScript();
}

// Start loading the scripts
loadScripts(scripts, () => {
    console.log('All scripts loaded');
});
