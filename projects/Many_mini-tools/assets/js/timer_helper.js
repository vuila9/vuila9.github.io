class Timer {
    constructor (duration, startTime, endTime, pause=false) {
        this.duration = duration;
        this.startTime = startTime;
        this.endTime = endTime;
        this.pause = pause;
    }

    setDuration(duration) { this.duration = duration; }

    setStartTime(start) { this.startTime = start; }

    setEndTime(end) { this.endTime = end; }

    getDuration() { return this.duration; }

    getStartTime() { return this.startTime; }

    getEndTime() { return this.endTime; }

    isPause() { return this.pause; }
}