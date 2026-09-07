const { spawnSync } = require('child_process');

let duration = 0;
let elapsed = 0;
let timer = null;

// Get song duration
function getDuration(songPath) {
    const result = spawnSync('afinfo', [songPath]);

    if (result.error || result.status !== 0 || !result.stdout) {
        return 0;
    }

    const output = result.stdout.toString();

    const match = output.match(
        /estimated duration:\s*([\d.]+)\s*sec/
    );

    if (!match) {
        return 0;
    }

    return parseFloat(match[1]);
}

// Format seconds
function formatTime(seconds) {
    seconds = Math.floor(seconds);

    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;

    return `${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`;
}

// Create progress bar
function createProgressBar() {
    const barLength = 30;

    if (duration <= 0) {
        return `[${'░'.repeat(barLength)}] 0%`;
    }

    let progress = elapsed / duration;

    if (progress > 1) {
        progress = 1;
    }

    const filled = Math.floor(
        progress * barLength
    );

    const empty = barLength - filled;

    const bar =
        '█'.repeat(filled) +
        '░'.repeat(empty);

    const percentage =
        Math.floor(progress * 100);

    return `[${bar}] ${percentage}%`;
}

// Get current progress
function getProgress() {
    return {
        bar: createProgressBar(),
        elapsed: formatTime(elapsed),
        duration: formatTime(duration)
    };
}

// Start progress
function startProgress(songPath, onUpdate) {
    stopProgress();

    duration = getDuration(songPath);
    elapsed = 0;

    onUpdate(getProgress());

    timer = setInterval(() => {

        elapsed++;

        if (elapsed >= duration) {
            elapsed = duration;
        }

        onUpdate(getProgress());

    }, 1000);
}

// Pause progress
function pauseProgress() {
    if (timer) {
        clearInterval(timer);
        timer = null;
    }
}

// Resume progress
function resumeProgress(onUpdate) {
    if (timer || duration <= 0) {
        return;
    }

    onUpdate(getProgress());

    timer = setInterval(() => {

        elapsed++;

        if (elapsed >= duration) {
            elapsed = duration;
        }

        onUpdate(getProgress());

    }, 1000);
}

// Stop progress
function stopProgress() {

    if (timer) {
        clearInterval(timer);
        timer = null;
    }

    duration = 0;
    elapsed = 0;
}

// Export functions
module.exports = {
    getDuration,
    getProgress,
    startProgress,
    pauseProgress,
    resumeProgress,
    stopProgress
};
