class PlayField {
    constructor(gameinterface, gridsize) {
        this.gameinterface = gameinterface;
        this.max_playfield_width = gameinterface.offsetWidth;
        this.max_playfield_height = gameinterface.offsetHeight;
        this.gridsize = gridsize;
        this.rows = Math.floor(this.max_playfield_height / gridsize);
        this.cols = Math.floor(this.max_playfield_width / gridsize);
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

    placeSnake(snake) {
        const part_snake = snake.getPartAt(0);
        const part_x = part_snake['position'][0];
        const part_y = part_snake['position'][1];
        part_snake['div'].style.left = this.gridsize * part_x + 'px';
        part_snake['div'].style.top = this.gridsize * part_y + 'px';
        part_snake['div'].style.backgroundColor = part_snake['color'];
    }

}

class Snake {
    constructor(x, y, direction='left',color='rgb(0,0,0)') {
        const snake_div = document.createElement('div');
        snake_div.className = 'snake-part';
        document.getElementById('game-interface').appendChild(snake_div);
        this.direction = direction;
        this.body = [{'div': snake_div, 'position': [x,y], 'color': color}];
        this.tail_x = x;
        this.tail_y = y;
        this.color = color;
        //this.speed = speed;
        this.direction = direction;
        this.length = 1;
    }

    setDirection(direction) {
        this.direction = direction;
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

    grow(position, color='rgb(255,0,0)') {
        const x = position.split(',')[0];
        const y = position.split(',')[1];
        const snake_div = document.createElement('div');
        snake_div.className = 'snake-part';
        document.getElementById('game-interface').appendChild(snake_div);
        this.body.push([{'div': snake_div, 'position': [x,y], 'color': color}]);
    }

}

class Apple {
    
}