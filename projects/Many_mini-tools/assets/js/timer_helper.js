class Timer {
    constructor (duration, id=0, pause=true) {
        this.duration = (duration[0] * 3600 + duration[1] * 60 + duration[2]) * 1000;
        this.remaining = this.duration;
        this.startTime = 0;
        this.endTime = 0;
        this.intervalId = null;
        this.id = id;
        this.pause = pause;
    }

    setDuration(duration) { this.duration = duration; }

    setStartTime(start) { this.startTime = start; }

    setEndTime(end) { this.endTime = end; }

    setRemaining(remaining) { this.remaining = remaining; }

    setTimerID(id) { this.id = id; }

    setIntervalID(intervalId) { this.intervalId = intervalId; }

    setPause(bool) { this.pause = bool; }

    togglePause() { this.pause = !this.pause; }

    getDuration() { return this.duration; }

    getStartTime() { return this.startTime; }

    getEndTime() { return this.endTime; }

    getRemaining() { return this.remaining; }

    getTimerID() { return this.id; }

    getIntervalID() { return this.intervalId; }

    isPause() { return this.pause; }
}