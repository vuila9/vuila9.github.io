class PlayField {
    constructor(gameinterface, gridsize) {
        this.gameinterface = gameinterface;
        this.max_playfield_width = gameinterface.offsetWidth;
        this.max_playfield_height = gameinterface.offsetHeight;
        this.gridsize = gridsize;
        this.rows = Math.floor(this.max_playfield_height / gridsize);
        this.cols = Math.floor(this.max_playfield_width / gridsize);
        this.occupiedGrid = new Set();
    }

    init() {
        this.gameinterface.style.gridTemplateRows = `repeat(${this.rows}, ${this.gridsize}px)`
        this.gameinterface.style.gridTemplateColumns = `repeat(${this.cols}, ${this.gridsize}px)`;

        for (let y = 0; y < this.rows; y++) {
            for (let x = 0; x < this.cols; x++) {
                const box = document.createElement("div");
                box.classList.add("grid-box");
                box.id = `grid-${x},${y}`; // Assign an ID based on coordinates
                this.gameinterface.appendChild(box);
            }
        }
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
        const part_snake = snake.getPartAt(0);
        const part_x = part_snake['position'][0];
        const part_y = part_snake['position'][1];
        part_snake['div'].style.left = this.gridsize * part_x + 'px';
        part_snake['div'].style.top = this.gridsize * part_y + 'px';
        part_snake['div'].style.backgroundColor = part_snake['color'];
    }

    spawnApple(apple) {
        const apple_div = document.getElementById('apple');
        apple.spawn(this.rows, this.cols);
        const [x,y] = apple.getApplePosition();
        apple_div.style.left = this.gridsize * x + 'px';
        apple_div.style.top = this.gridsize * y + 'px';
        apple_div.style.visibility = 'visible';
    }
}

class Snake {
    constructor(x, y, gridsize=15, direction='left',color='rgb(0,0,0)') {
        const snake_div = document.createElement('div');
        snake_div.className = 'snake-part';
        document.getElementById('game-interface').appendChild(snake_div);
        this.direction = direction;
        this.body = [{'div': snake_div, 'position': [x,y], 'color': color}];
        this.last_x = x;
        this.last_y = y;
        this.color = color;
        //this.speed = speed;
        this.direction = direction;
        this.length = 1;
        this.gridsize = gridsize;
    }

    setDirection(direction) {
        let current_direction = this.direction;
        let valid = false;
        if (current_direction == 'up' || current_direction == 'down')
            valid = direction == 'left' || direction == 'right';
        else if (current_direction == 'left' || current_direction == 'right')
            valid = direction == 'up' || direction == 'down';
        if (valid)
            this.direction = direction;
    }

    getDirection() {
        return this.direction;
    }

    eatenFood(apple) {
        const [apple_x, apple_y] = apple.getApplePosition();
        return this.body[0]['position'][0] == apple_x && this.body[0]['position'][1] == apple_y;
    }

    updateHeadPosition(max_row, max_col) {
        if (this.direction === 'up')
            this.body[0]['position'][1] -= 1;
        else if (this.direction === 'down') 
            this.body[0]['position'][1] += 1;
        else if (this.direction == 'left')
            this.body[0]['position'][0] -= 1;
        else if (this.direction == 'right')
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
    

    getSnakeDiv() {
        return this.snake_div;
    }

    getLength() {
        return this.length;
    }

    getHead() {
        return this.body[0];
    }

    getTail() {
        return this.body.at(-1);
    }

    getPartAt(index) {
        return this.body[index];
    }

    grow(color='rgb(255,0,0)') {
        const snake_div = document.createElement('div');
        snake_div.className = 'snake-part';
        snake_div.style.left = this.gridsize * this.last_x + 'px';
        snake_div.style.top = this.gridsize * this.last_y + 'px';
        snake_div.style.backgroundColor = color;

        document.getElementById('game-interface').appendChild(snake_div);
        this.body.push({'div': snake_div, 'position': [this.last_x, this.last_y], 'color': color});
        this.length++;
    }

}

class Apple {
    constructor(score=1, gridsize) {
        this.score = score;
        this.gridsize = gridsize;
        const apple_div = document.createElement('div');
        apple_div.id = 'apple';
        apple_div.style.visibility = 'hidden';
        document.getElementById('game-interface').appendChild(apple_div);
        this.apple_x = 0;
        this.apple_y = 0;
    }

    getApplePosition() {
        return [this.apple_x, this.apple_y];
    }

    spawn(rows, cols) {
        this.apple_x = Math.floor(Math.random() * cols);
        this.apple_y = Math.floor(Math.random() * rows);
        //will need to check for occupied grid
    }
}