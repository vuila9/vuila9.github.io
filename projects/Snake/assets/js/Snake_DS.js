class PlayField {
    constructor(gameinterface, gridsize) {
        this.gameinterface = gameinterface;
        this.max_playfield_width = gameinterface.offsetWidth;
        this.max_playfield_height = gameinterface.offsetHeight;
        this.gridsize = gridsize;
        this.rows = Math.floor(this.max_playfield_height / gridsize);
        this.cols = Math.floor(this.max_playfield_width / gridsize);
        this.occupiedGrid = new Set();
        this.score_ratio = Math.floor(45 / gridsize);
    }

    init() {
        this.gameinterface.style.gridTemplateRows = `repeat(${this.rows}, ${this.gridsize}px)`
        this.gameinterface.style.gridTemplateColumns = `repeat(${this.cols}, ${this.gridsize}px)`;

        for (let y = 0; y < this.rows; y++) {
            for (let x = 0; x < this.cols; x++) {
                const box = document.createElement("div");
                box.classList.add("grid-box");
                box.id = `grid-${x},${y}`; // Assign an ID based on coordinates
                box.style.width = this.gridsize + 'px';
                box.style.height = this.gridsize + 'px';
                this.gameinterface.appendChild(box);
            }
        }
    }

    reset() {
        const snake_parts = document.querySelectorAll('.snake-part');
        snake_parts.forEach(part => part.remove());
        document.getElementById('apple').remove();
    }

    plainMode() {
        for (let coor of this.occupiedGrid) {
            document.getElementById(`grid-${coor}`).style.backgroundColor = '#fff9e1';
        }
        this.occupiedGrid.clear();
        this.setScoreRatio(1)
    }

    borderMode() {
        this.plainMode();
        for (let y = 0; y < this.rows; y++) {
            for (let x = 0; x < this.cols; x++) { 
                if ((x != 0 && x != this.cols - 1) && (y != 0 && y != this.rows - 1)) continue;
                const div_grid = document.getElementById(`grid-${x},${y}`);
                div_grid.style.backgroundColor = 'rgb(255,69,0)';
                this.occupiedGrid.add(`${x},${y}`);
            }
        }
        this.setScoreRatio(2)
    }

    cornersMode() {
        this.plainMode();
        for (let y = 0; y < this.rows; y++) {
            for (let x = 0; x < this.cols; x++) { 
                if ((x != 0 && x != this.cols - 1) && (y != 0 && y != this.rows - 1)) continue;
                if (!(x < Math.floor(this.cols/4) || x > Math.floor(this.cols * 3/4)) || !(y < Math.floor(this.rows /4) || y > Math.floor(this.rows * 3/4))) continue;
                const div_grid = document.getElementById(`grid-${x},${y}`);
                div_grid.style.backgroundColor = 'rgb(255,69,0)';
                this.occupiedGrid.add(`${x},${y}`);
            }
        }
        this.setScoreRatio(1.5)
    }

    semiWallMode() {
        this.plainMode();
        for (let y = 0; y < this.rows; y++) {
            for (let x = 0; x < this.cols; x++) { 
                if ((x != 0 && x != this.cols - 1) && (y != 0 && y != this.rows - 1)) continue;
                if ((x < Math.floor(this.cols/4) || x > Math.floor(this.cols * 3/4)) && (y < Math.floor(this.rows /4) || y > Math.floor(this.rows * 3/4))) continue;
                const div_grid = document.getElementById(`grid-${x},${y}`);
                div_grid.style.backgroundColor = 'rgb(255,69,0)';
                this.occupiedGrid.add(`${x},${y}`);
            }
        }
        this.setScoreRatio(1.5)
    }

    heartMode() {
        this.plainMode();
        const centerX = this.cols / 2;
        const centerY = this.rows / 2;
        for (let x = 0; x < this.cols; x++) {
            for (let y = 0; y < this.rows; y++) { 
                const xPos = (x - centerX) / (this.cols / 4); // Normalize X to scale
                const yPos = -(y - centerY) / (this.rows / 4); // Normalize Y to scale

                // Hollow Heart shape formula: (x² + y² - 1)³ - x²y³ > 0
                if (Math.pow(xPos * xPos + yPos * yPos - 1, 3) - xPos * xPos * Math.pow(yPos, 3) > 0) {
                    const div_grid = document.getElementById(`grid-${x},${y}`);
                    div_grid.style.backgroundColor = 'rgb(255,69,0)';
                    this.occupiedGrid.add(`${x},${y}`);
                }
            }
        }
        this.setScoreRatio(3)
    }

    setScoreRatio(value) {
        this.score_ratio =  Math.floor(45 / this.gridsize) * value;
    }

    getScoreRatio() {
        return this.score_ratio;
    }

    setGridSize(size) {
        this.gridsize = size;
    }

    getOccupiedGrid() {
        return this.occupiedGrid;
    }

    getRowsNum() {
        return this.rows;
    }

    getColsNum() {
        return this.cols;
    }

    getMaxWidth() {
        return this.max_playfield_width;
    }

    getMaxHeight() {
        return this.max_playfield_height;
    }

    getGameInterface() {
        return this.gameinterface;
    }

    spawnSnake(snake) {
        const snake_head = snake.getHead();
        const part_x = snake_head['position'][0];
        const part_y = snake_head['position'][1];
        snake_head['div'].style.left = this.gridsize * part_x + 'px';
        snake_head['div'].style.top = this.gridsize * part_y + 'px';
        snake_head['div'].style.backgroundColor = snake_head['color'];
        snake_head['div'].style.width = this.gridsize + "px";
        snake_head['div'].style.height = this.gridsize + "px";
    }

    spawnApple(apple, snake_occupiedgrid=new Set()) {
        const apple_div = document.getElementById('apple');
        apple.spawn(this.rows, this.cols, snake_occupiedgrid, this.occupiedGrid);
        const [x,y] = apple.getApplePosition();
        apple_div.style.left = this.gridsize * x + 'px';
        apple_div.style.top = this.gridsize * y + 'px';
        apple_div.style.visibility = 'visible';
    }
}

class Snake {
    _initialize(x, y, gridsize=15, direction, color='rgb(0,0,0)') {
        const snake_div = document.createElement('div');
        snake_div.className = 'snake-part';
        document.getElementById('game-interface').appendChild(snake_div);
        this.body = [{'div': snake_div, 'position': [x,y], 'color': color}];
        this.last_x = x;
        this.last_y = y;
        this.color = color;
        this.confirmed_direction = direction;
        this.temp_direction = direction;
        this.length = 1;
        this.gridsize = gridsize;
        this.occupiedGrid = new Set();
        this.occupiedGrid.add(`${x},${y}`);
    }

    constructor(x, y, gridsize=15, direction, color='rgb(0,0,0)') {
        this._initialize(x, y, gridsize, direction, color);
    }

    reset(x, y, gridsize=15, direction, color='rgb(0,0,0)') {
        this._initialize(x, y, gridsize, direction, color);
    }

    setTempDirection(direction) {
        let current_direction = this.temp_direction;
        let valid = false;
        if (current_direction == 'up' || current_direction == 'down')
            valid = direction == 'left' || direction == 'right';
        else if (current_direction == 'left' || current_direction == 'right')
            valid = direction == 'up' || direction == 'down';
        if (valid)
            this.temp_direction = direction;
    }

    setConfirmedDirection() {
        const bool1 = !(this.confirmed_direction == 'left' && this.temp_direction == 'right');
        const bool2 = !(this.confirmed_direction == 'up' && this.temp_direction == 'down');
        const bool3 = !(this.confirmed_direction == 'right' && this.temp_direction == 'left');
        const bool4 = !(this.confirmed_direction == 'down' && this.temp_direction == 'up');
        if (bool1 && bool2 && bool3 && bool4)
            this.confirmed_direction = this.temp_direction;
    }

    resetOccupiedGrid() {
        this.occupiedGrid.clear();
    }

    updateOccupiedGrid(position) {
        this.occupiedGrid.add(position);
    }

    getOccupiedGrid() {
        return this.occupiedGrid;
    }

    collideSelf() {
        const head_x = this.body[0]['position'][0];
        const head_y = this.body[0]['position'][1];
        return this.occupiedGrid.has(`${head_x},${head_y}`);
    }

    collideObstacle(field_occupiedgrid) {
        const head_x = this.body[0]['position'][0];
        const head_y = this.body[0]['position'][1];
        return field_occupiedgrid.has(`${head_x},${head_y}`);
    }

    eatenFood(apple) {
        const [apple_x, apple_y] = apple.getApplePosition();
        return this.body[0]['position'][0] == apple_x && this.body[0]['position'][1] == apple_y;
    }

    updateHeadPosition(max_row, max_col) {
        const direction = this.confirmed_direction;
        if (direction === 'up')
            this.body[0]['position'][1] -= 1;
        else if (direction === 'down') 
            this.body[0]['position'][1] += 1;
        else if (direction == 'left')
            this.body[0]['position'][0] -= 1;
        else if (direction == 'right')
            this.body[0]['position'][0] += 1;

        if (this.body[0]['position'][1] < 0)
            this.body[0]['position'][1] = max_row-1;
        else if (this.body[0]['position'][1] >= max_row)
            this.body[0]['position'][1] = 0;
        if (this.body[0]['position'][0] < 0)
            this.body[0]['position'][0] = max_col-1;
        else if (this.body[0]['position'][0] >= max_col)
            this.body[0]['position'][0] = 0;
    }

    updateLastPosition() {
        this.last_x = this.body.at(-1)['position'][0];
        this.last_y = this.body.at(-1)['position'][1];
    }

    getLastPosition() {
        return [this.last_x, this.last_y];
    }

    getLength() {
        return this.length;
    }

    getHead() {
        return this.body[0];
    }

    getPartAt(index) {
        return this.body[index];
    }

    grow(color='rgb(255,0,0)') {
        const snake_div = document.createElement('div');
        snake_div.className = 'snake-part';
        snake_div.style.left = this.gridsize * this.last_x + 'px';
        snake_div.style.top = this.gridsize * this.last_y + 'px';
        snake_div.style.width = this.gridsize + 'px';
        snake_div.style.height = this.gridsize + 'px';
        snake_div.style.backgroundColor = color;

        document.getElementById('game-interface').appendChild(snake_div);
        this.body.push({'div': snake_div, 'position': [this.last_x, this.last_y], 'color': color});
        this.length++;
    }
}

class Apple {
    _initialize(gridsize) {
        this.gridsize = gridsize;
        const apple_div = document.createElement('div');
        apple_div.id = 'apple';
        apple_div.style.visibility = 'hidden';
        apple_div.style.width = gridsize + 'px';
        apple_div.style.height = gridsize + 'px';
        document.getElementById('game-interface').appendChild(apple_div);
        this.apple_x = 0;
        this.apple_y = 0;
    }

    constructor(gridsize) {
        this._initialize(gridsize)
    }

    reset(gridsize) {
        this._initialize(gridsize)
    }

    getApplePosition() {
        return [this.apple_x, this.apple_y];
    }

    spawn(rows, cols, snake_occupiedgrid=new Set(), field_occupiedgrid=new Set()) {
        this.apple_x = Math.floor(Math.random() * cols);
        this.apple_y = Math.floor(Math.random() * rows);
        while (snake_occupiedgrid.has(`${this.apple_x},${this.apple_y}`) || field_occupiedgrid.has(`${this.apple_x},${this.apple_y}`)) {
            this.apple_x = Math.floor(Math.random() * cols);
            this.apple_y = Math.floor(Math.random() * rows);
        }
    }
}