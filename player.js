const fs = require('fs');
const path = require('path');
const os = require('os');
const net = require('net');
const process = require('process');

const { spawn } = require('child_process');

const progressBar = require('./progressBar.js');

// Selected song index
let selected = 0;

// Songs folder
const songsPath = path.join(__dirname, 'songs');

// Current audio player
let currentPlayer = null;

// Current song
let currentSong = null;

// Pause state
let isPaused = false;

// Current screen
let currentScreen = 'menu';

// Audio player socket
let currentSocketPath = null;

// Unique socket counter
let playerSequence = 0;

// Prevent simultaneous pause/resume commands
let controlPending = false;

// Current progress
let currentProgress = progressBar.getProgress();

// Get all valid MP3 files
if (!fs.existsSync(songsPath)) {
    console.log('❌ Songs folder not found.');
    process.exit(1);
}

const mp3Files = fs
    .readdirSync(songsPath)
    .filter(file =>
        file.toLowerCase().endsWith('.mp3')
    )
    .filter(file =>
        progressBar.getDuration(
            path.join(songsPath, file)
        ) > 0
    );

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

    if (
        currentPlayer &&
        currentScreen === 'player'
    ) {
        renderPlayer();
    }
}

// Send commands to mpv using its IPC socket
function sendPauseCommand(shouldPause, onSuccess) {

    if (
        !currentPlayer ||
        !currentSocketPath ||
        controlPending
    ) {
        return;
    }

    const player = currentPlayer;
    const socketPath = currentSocketPath;

    controlPending = true;

    // Retry because mpv needs a short time
    // to create its control socket.
    function connectToPlayer(attemptNumber = 0) {

        if (currentPlayer !== player) {
            controlPending = false;
            return;
        }

        const socket = net.createConnection(socketPath);

        let responseBuffer = '';

        socket.on('connect', () => {

            const command = {
                command: [
                    'set_property',
                    'pause',
                    shouldPause
                ]
            };

            socket.write(
                JSON.stringify(command) + '\n'
            );
        });

        socket.on('data', chunk => {

            responseBuffer += chunk.toString();

            const lines = responseBuffer.split('\n');

            responseBuffer = lines.pop();

            for (const line of lines) {

                if (!line.trim()) {
                    continue;
                }

                let response;

                try {
                    response = JSON.parse(line);
                } catch (error) {
                    continue;
                }

                if (!('error' in response)) {
                    continue;
                }

                socket.end();

                if (currentPlayer !== player) {
                    return;
                }

                controlPending = false;

                if (response.error === 'success') {

                    onSuccess();

                } else {

                    console.log(
                        '\n❌ Playback command failed:',
                        response.error
                    );
                }

                return;
            }
        });

        socket.on('error', error => {

            // The socket might not be ready yet.
            if (
                currentPlayer === player &&
                attemptNumber < 15 &&
                (
                    error.code === 'ENOENT' ||
                    error.code === 'ECONNREFUSED'
                )
            ) {

                setTimeout(() => {

                    connectToPlayer(
                        attemptNumber + 1
                    );

                }, 100);

                return;
            }

            if (currentPlayer === player) {

                controlPending = false;

                console.log(
                    '\n❌ Audio control error:',
                    error.message
                );
            }
        });
    }

    connectToPlayer();
}

// Stop current player
function killCurrentPlayer() {

    if (!currentPlayer) {
        return;
    }

    const player = currentPlayer;

    // Reset player state
    currentPlayer = null;
    currentSong = null;
    currentSocketPath = null;

    isPaused = false;
    controlPending = false;

    // Stop progress timer
    progressBar.stopProgress();

    currentProgress = progressBar.getProgress();

    // Terminate mpv
    try {

        player.kill('SIGTERM');

    } catch (error) {

        // Ignore if the player has already stopped.

    }
}

// Exit player
function exitPlayer() {

    killCurrentPlayer();

    if (process.stdin.isTTY) {
        process.stdin.setRawMode(false);
    }

    process.stdin.pause();

    clearConsole();

    console.log(
        '\n👋 Exiting the Music Player. Goodbye!\n'
    );

    process.exit(0);
}

// Play selected song
function playSong(songPath, songName) {

    // Stop previous song
    killCurrentPlayer();

    currentSong = songName;
    isPaused = false;
    currentScreen = 'player';

    // Start progress tracking
    progressBar.startProgress(
        songPath,
        updateProgress
    );

    // Create a unique socket for mpv
    const socketPath = path.join(
        os.tmpdir(),
        `music-player-${process.pid}-${++playerSequence}.sock`
    );

    currentSocketPath = socketPath;

    // Start mpv audio player
    const player = spawn('mpv', [

        '--no-config',

        '--no-video',

        '--really-quiet',

        `--input-ipc-server=${socketPath}`,

        songPath

    ], {
        stdio: ['ignore', 'ignore', 'pipe']
    });

    currentPlayer = player;

    // Display player
    renderPlayer();

    // Handle playback errors
    player.on('error', error => {

        if (currentPlayer !== player) {
            return;
        }

        progressBar.stopProgress();

        currentPlayer = null;
        currentSong = null;
        currentSocketPath = null;

        isPaused = false;
        controlPending = false;

        currentScreen = 'menu';

        console.log(
            '\n❌ Error playing song:',
            error.message
        );

        if (error.code === 'ENOENT') {

            console.log(
                '\nPlease install mpv using: brew install mpv'
            );
        }

        setTimeout(() => {
            renderMenu();
        }, 1000);
    });

    // Handle song completion
    player.on('close', (code, signal) => {

        // Remove the old socket if it still exists
        fs.unlink(socketPath, () => {});

        // Ignore events from an old player
        if (currentPlayer !== player) {
            return;
        }

        progressBar.stopProgress();

        currentPlayer = null;
        currentSong = null;
        currentSocketPath = null;

        isPaused = false;
        controlPending = false;

        currentScreen = 'menu';

        renderMenu();

        if (code === 0 && signal === null) {

            console.log('\n✅ Song finished.');

        } else {

            console.log('\n⏹️ Playback stopped.');

        }
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

    console.log('🎮 Controls:\n');

    console.log('P → Pause');
    console.log('R → Resume');
    console.log('S → Stop');

    console.log('↑ ↓ → Select another song');
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

    if (isPaused || controlPending) {
        return;
    }

    // Pause using mpv's native pause property
    sendPauseCommand(true, () => {

        isPaused = true;

        progressBar.pauseProgress();

        if (currentScreen === 'player') {
            renderPlayer();
        }
    });
}

// Resume song
function resumeSong() {

    if (!currentPlayer) {

        console.log(
            '\n❌ No song is currently playing.'
        );

        return;
    }

    if (!isPaused || controlPending) {
        return;
    }

    // Resume using mpv's native pause property
    sendPauseCommand(false, () => {

        isPaused = false;

        progressBar.resumeProgress(
            updateProgress
        );

        if (currentScreen === 'player') {
            renderPlayer();
        }
    });
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

    currentScreen = 'menu';

    renderMenu();
}

// Display song menu
function renderMenu() {

    currentScreen = 'menu';

    clearConsole();

    console.log(
        '\n🎶 Welcome to the Music Player! 🎶'
    );

    console.log(
        '===================================\n'
    );

    console.log('Use ↑ ↓ to select a song');

    console.log('Press ENTER to play\n');

    for (let i = 0; i < mp3Files.length; i++) {

        const songName = getSongName(
            mp3Files[i]
        );

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

    if (currentPlayer) {

        console.log(
            `🎧 Current song: ${currentSong}`
        );

        console.log(
            isPaused
                ? '⏸️  PAUSED\n'
                : '▶️  PLAYING\n'
        );
    }

    console.log('🎮 Controls:\n');

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

// Handle keyboard input
function handleKey(key) {

    // ESC or Ctrl + C
    if (
        key === '\x1b' ||
        key === '\x03'
    ) {

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

        const selectedSong = mp3Files[selected];

        const songPath = path.join(
            songsPath,
            selectedSong
        );

        playSong(
            songPath,
            getSongName(selectedSong)
        );

        return;
    }

    // Lowercase keyboard input
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

    // Select song using number keys
    const userInput = Number(input);

    if (
        input.length === 1 &&
        Number.isInteger(userInput) &&
        userInput >= 1 &&
        userInput <= mp3Files.length
    ) {

        selected = userInput - 1;

        const selectedSong = mp3Files[selected];

        const songPath = path.join(
            songsPath,
            selectedSong
        );

        playSong(
            songPath,
            getSongName(selectedSong)
        );
    }
}

// Check if songs exist
if (mp3Files.length === 0) {

    console.log(
        '❌ No valid MP3 files found inside the songs folder.'
    );

    process.exit(0);
}

// Display menu
renderMenu();

// Enable raw keyboard input
if (!process.stdin.isTTY) {

    console.log(
        '❌ Please run this application in an interactive terminal.'
    );

    process.exit(1);
}

process.stdin.setRawMode(true);

process.stdin.resume();

process.stdin.setEncoding('utf8');

// Listen for keyboard input
process.stdin.on(
    'data',
    handleKey
);

// Handle external termination
process.on('SIGINT', exitPlayer);

process.on('SIGTERM', exitPlayer);