function init() {
    const gridContainer = document.getElementById("game-interface");

    const rows = 35;
    const cols = 70;

    for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
            const box = document.createElement("div");
            box.classList.add("grid-box");
            box.id = `${x},${y}`; // Assign an ID based on coordinates
            gridContainer.appendChild(box);
        }
    }
}

window.onload = function() {
    init();
}