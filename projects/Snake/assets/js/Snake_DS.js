class Queue {
    constructor() {
        this.items = [];
    }

    getSize() {
        return this.items.length;
    }

    peek() {
        return this.items[0];
    }

    enqueue(item) {
        this.items.push(item); // Add item to the end of the queue
    }

    dequeue() {
        return this.items.shift(); // Remove and return the item from the front of the queue
    }

    isEmpty() {
        return this.items.length === 0; // Check if the queue is empty
    }
}