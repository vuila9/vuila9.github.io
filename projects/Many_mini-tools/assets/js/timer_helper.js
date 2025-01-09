class Timer {
    constructor (duration, id=0, pause=true, sound=false, audio_source = './assets/misc/audio/mixkit-clock-countdown-bleeps-916.wav') {
        this.duration = (duration[0] * 3600 + duration[1] * 60 + duration[2]) * 1000 + 500; //+500 because setInterval() execute function right away so this would make it delay for 500ms when first start
        this.remaining = this.duration;
        this.startTime = 0;
        this.endTime = 0;
        this.intervalId = null;
        this.id = id;
        this.pause = pause;
        this.sound = sound;
        this.audio_source = new Audio(audio_source);
    }

    setDuration(duration) { this.duration = duration; }

    setStartTime(start) { this.startTime = start; }

    setEndTime(end) { this.endTime = end; }

    setRemaining(remaining) { this.remaining = remaining; }

    setTimerID(id) { this.id = id; }

    setIntervalID(intervalId) { this.intervalId = intervalId; }

    setPause(bool) { this.pause = bool; }

    setSound(bool) { this.sound = bool; }

    setNewAudio(source) { this.audio_source = new Audio(source); }

    playSound() { this.audio_source.play(); }

    pauseSound() { 
        this.audio_source.pause(); 
        this.audio_source.currentTime = 0;
    }

    togglePause() { this.pause = !this.pause; }

    toggleSound() { this.sound = !this.sound; }

    getDuration() { return this.duration; }

    getStartTime() { return this.startTime; }

    getEndTime() { return this.endTime; }

    getRemaining() { return this.remaining; }

    getTimerID() { return this.id; }

    getIntervalID() { return this.intervalId; }

    isPause() { return this.pause; }

    isSoundOn() { return this.sound; }
}