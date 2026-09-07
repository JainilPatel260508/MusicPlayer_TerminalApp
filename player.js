const fs = require('fs');
const process = require('process');
const { spawn } = require('child_process');

const progressBar = require('./progressBar');

// Selected song
let selected = 0;

// Songs folder
const path = './songs';

// Current player
let currentPlayer = null;

// Pause state
let isPaused = false;

// Current song
let currentSong = null;

// Current progress
let currentProgress = {
    bar: '[░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░] 0%',
    elapsed: '00:00',
    duration: '00:00'
};

// Get all MP3 files
const mp3Files = fs
    .readdirSync(path)
    .filter(file => file.toLowerCase().endsWith('.mp3'))
    .filter(file => progressBar.getDuration(`${path}/${file}`) > 0);

// Clear terminal
function clearConsole() {
    process.stdout.write('\x1Bc');
}

// Get song name
function getSongName(file) {
    return file.replace(/\.mp3$/i, '');
}

// Update progress
function updateProgress(progress) {

    currentProgress = progress;

    if (!currentPlayer) {
        return;
    }

    renderPlayer();
}

// Stop current player
function killCurrentPlayer() {

    if (!currentPlayer) {
        return;
    }

    const player = currentPlayer;

    try {

        if (isPaused) {
            process.kill(
                player.pid,
                'SIGCONT'
            );
        }

        process.kill(
            player.pid,
            'SIGTERM'
        );

    } catch (error) {
        // Ignore if process already stopped
    }

    if (currentPlayer === player) {

        currentPlayer = null;
        isPaused = false;
        currentSong = null;

        progressBar.stopProgress();

        currentProgress = {
            bar: '[░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░] 0%',
            elapsed: '00:00',
            duration: '00:00'
        };
    }
}

// Exit player
function exitPlayer() {

    killCurrentPlayer();

    process.stdin.setRawMode(false);
    process.stdin.pause();

    clearConsole();

    console.log(
        '\n👋 Exiting the Music Player. Goodbye!\n'
    );

    process.exit(0);
}

// Play song
function playSong(songPath, songName) {

    killCurrentPlayer();

    currentSong = songName;
    isPaused = false;

    // Get progress information first
    progressBar.startProgress(
        songPath,
        updateProgress
    );

    // Start afplay
    const player = spawn(
        'afplay',
        [songPath]
    );

    currentPlayer = player;

    // Display player
    renderPlayer();

    // Handle player error
    player.on('error', (error) => {

        progressBar.stopProgress();

        console.log(
            '\n❌ Error playing song:',
            error.message
        );

        if (currentPlayer === player) {
            currentPlayer = null;
            isPaused = false;
        }

        setTimeout(() => {
            renderMenu();
        }, 1000);
    });

    // Handle song completion
    player.on('close', (code) => {

        if (currentPlayer !== player) {
            return;
        }

        progressBar.stopProgress();

        currentPlayer = null;
        isPaused = false;

        if (code === 0) {

            console.log(
                '\n\n✅ Song finished.'
            );
        }

        setTimeout(() => {
            renderMenu();
        }, 1000);
    });
}

// Display player
function renderPlayer() {

    clearConsole();

    console.log('\n🎶 MUSIC PLAYER 🎶');
    console.log('==================\n');

    console.log(
        `🎧 Now playing: ${currentSong}\n`
    );

    console.log(
        `🎵 ${currentProgress.bar}`
    );

    console.log(
        `   ${currentProgress.elapsed} / ${currentProgress.duration}`
    );

    console.log('\n');

    if (isPaused) {
        console.log('⏸️  PAUSED');
    } else {
        console.log('▶️  PLAYING');
    }

    console.log('\n==================');

    console.log('🎮 Controls:');

    console.log('P → Pause');
    console.log('R → Resume');
    console.log('S → Stop');
    console.log('ESC → Exit');

    console.log('==================');
}

// Pause song
function pauseSong() {

    if (!currentPlayer) {

        console.log(
            '\n❌ No song is currently playing.'
        );

        return;
    }

    if (isPaused) {

        console.log(
            '\n⚠️ Song is already paused.'
        );

        return;
    }

    try {

        process.kill(
            currentPlayer.pid,
            'SIGSTOP'
        );

        isPaused = true;

        progressBar.pauseProgress();

        renderPlayer();

    } catch (error) {

        console.log(
            '\n❌ Unable to pause song:',
            error.message
        );
    }
}

// Resume song
function resumeSong() {

    if (!currentPlayer) {

        console.log(
            '\n❌ No song is currently playing.'
        );

        return;
    }

    if (!isPaused) {

        console.log(
            '\n⚠️ Song is already playing.'
        );

        return;
    }

    try {

        process.kill(
            currentPlayer.pid,
            'SIGCONT'
        );

        isPaused = false;

        progressBar.resumeProgress(
            updateProgress
        );

        renderPlayer();

    } catch (error) {

        console.log(
            '\n❌ Unable to resume song:',
            error.message
        );
    }
}

// Stop song
function stopSong() {

    if (!currentPlayer) {

        console.log(
            '\n❌ No song is currently playing.'
        );

        return;
    }

    killCurrentPlayer();

    renderMenu();
}

// Display menu
function renderMenu() {

    clearConsole();

    console.log(
        '\n🎶 Welcome to the Music Player! 🎶'
    );

    console.log(
        '===================================\n'
    );

    console.log(
        'Use ↑ ↓ to select a song'
    );

    console.log(
        'Press ENTER to play\n'
    );

    for (let i = 0; i < mp3Files.length; i++) {

        const songName =
            getSongName(mp3Files[i]);

        if (i === selected) {

            // Highlight selected song
            process.stdout.write(
                `\x1b[7m  ❯ ${i + 1}. ${songName}  \x1b[0m\n`
            );

        } else {

            console.log(
                `    ${i + 1}. ${songName}`
            );
        }
    }

    console.log(
        '\n==================================='
    );

    console.log('🎮 Controls:');

    console.log('↑ ↓ → Select song');
    console.log('ENTER → Play selected song');
    console.log('P → Pause');
    console.log('R → Resume');
    console.log('S → Stop');
    console.log('ESC → Exit');

    console.log(
        '==================================='
    );
}

// Handle keyboard
function handleKey(key) {

    // ESC
    if (key === '\x1b') {

        exitPlayer();

        return;
    }

    // Up arrow
    if (key === '\x1b[A') {

        selected--;

        if (selected < 0) {
            selected = mp3Files.length - 1;
        }

        renderMenu();

        return;
    }

    // Down arrow
    if (key === '\x1b[B') {

        selected++;

        if (selected >= mp3Files.length) {
            selected = 0;
        }

        renderMenu();

        return;
    }

    // Enter
    if (
        key === '\r' ||
        key === '\n'
    ) {

        const selectedSong =
            mp3Files[selected];

        const songPath =
            `${path}/${selectedSong}`;

        playSong(
            songPath,
            getSongName(selectedSong)
        );

        return;
    }

    // Lowercase input
    const input = key.toLowerCase();

    // Pause
    if (input === 'p') {

        pauseSong();

        return;
    }

    // Resume
    if (input === 'r') {

        resumeSong();

        return;
    }

    // Stop
    if (input === 's') {

        stopSong();

        return;
    }

    // Number selection
    const userInput = Number(input);

    if (
        Number.isInteger(userInput) &&
        userInput >= 1 &&
        userInput <= mp3Files.length
    ) {

        selected = userInput - 1;

        const selectedSong =
            mp3Files[selected];

        const songPath =
            `${path}/${selectedSong}`;

        playSong(
            songPath,
            getSongName(selectedSong)
        );
    }
}

// Check songs
if (mp3Files.length === 0) {

    console.log(
        '❌ No MP3 files found inside the songs folder.'
    );

    process.exit(0);
}

// Display menu
renderMenu();

// Enable keyboard input
process.stdin.setRawMode(true);
process.stdin.resume();
process.stdin.setEncoding('utf8');

// Listen for keyboard input
process.stdin.on(
    'data',
    handleKey
);

// Handle Ctrl + C
process.on('SIGINT', () => {
    exitPlayer();
});
