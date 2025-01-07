class Timer {
    constructor (duration, startTime, endTime, id=0, pause=false) {
        this.duration = duration;
        this.startTime = startTime;
        this.endTime = endTime;
        this.id = id;
        this.pause = pause;
    }

    setDuration(duration) { this.duration = duration; }

    setStartTime(start) { this.startTime = start; }

    setEndTime(end) { this.endTime = end; }

    setID(id) { this.id = id; }

    getDuration() { return this.duration; }

    getStartTime() { return this.startTime; }

    getEndTime() { return this.endTime; }

    getTimerID() { return this.id; }

    isPause() { return this.pause; }
}