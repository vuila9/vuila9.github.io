function createGridPlayfield() {
    const gameinterface = document.getElementById("game-interface");
    const max_playfield_width = gameinterface.offsetWidth;
    const max_playfield_height = gameinterface.offsetHeight;
    const gridsize = 15;

    const rows = Math.floor(max_playfield_height / gridsize);
    const cols = Math.floor(max_playfield_width/ gridsize);

    gameinterface.style.gridTemplateRows = `repeat(${rows}, ${gridsize}px)`
    gameinterface.style.gridTemplateColumns = `repeat(${cols}, ${gridsize}px)`;

    for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
            const box = document.createElement("div");
            box.classList.add("grid-box");
            box.id = `${x},${y}`; // Assign an ID based on coordinates
            gameinterface.appendChild(box);
        }
    }
}

window.onload = function() {
    createGridPlayfield();
}