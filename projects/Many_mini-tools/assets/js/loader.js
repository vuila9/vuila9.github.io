// Array of script paths to load
const scripts = [
    './assets/js/text-encrypt-decrypt.js',
    './assets/js/regex-comparison.js',
    './assets/js/calendar-date-teller.js',
    './assets/js/microphone_audio_tester_helper.js', './assets/js/microphone_audio_tester.js'
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
