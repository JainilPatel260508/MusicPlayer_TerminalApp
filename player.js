const fs = require('fs');
const process = require('process');
const { spawn } = require('child_process');

// Selected song
let selected = 0;

// Songs folder
const path = './songs';

// Get all MP3 files
const mp3Files = fs
    .readdirSync(path)
    .filter(file => file.toLowerCase().endsWith('.mp3'));
//progrerss bar
// function progrerssBar(duration, player) {
//     let progress = 0;
//     const interval = setInterval(() => {
//         if (!player || player.killed) {
//             clearInterval(interval);
//             return;
//         }

//         progress += 1;

//         const percentage = Math.min(
//             (progress / duration) * 100,
//             100
//         );

//         const barLength = 30;
//         const filledLength = Math.round(
//             (barLength * percentage) / 100
//         );

//         const bar = '█'.repeat(filledLength) +
//             '-'.repeat(barLength - filledLength);

//         process.stdout.write(
//             `\r[${bar}] ${percentage.toFixed(2)}%`
//         );

//         if (percentage >= 100) {
//             clearInterval(interval);
//             process.stdout.write('\n');
//         }
//     }, 1000);
// }


// Current player and pause state
let currentPlayer = null;
let isPaused = false;

// Clear terminal
function clearConsole() {
    process.stdout.write('\x1Bc');
}

// Stop current player
function killCurrentPlayer() {
    if (!currentPlayer) {
        return;
    }

    const player = currentPlayer;

    try {
        // Resume before stopping if paused
        if (isPaused) {
            process.kill(player.pid, 'SIGCONT');
        }

        process.kill(player.pid, 'SIGTERM');
    } catch (error) {
        // Ignore if process already stopped
    }

    if (currentPlayer === player) {
        currentPlayer = null;
        isPaused = false;
    }
}

// Exit music player
function exitPlayer() {
    killCurrentPlayer();

    process.stdin.setRawMode(false);
    process.stdin.pause();

    clearConsole();

    console.log('\n👋 Exiting the Music Player. Goodbye!\n');

    process.exit(0);
}

// Get song name without .mp3
function getSongName(file) {
    return file.replace(/\.mp3$/i, '');
}

// Play selected song
function playSong(songPath, songName) {
    // Stop previous song
    killCurrentPlayer();

    clearConsole();

    console.log('\n🎶 MUSIC PLAYER 🎶');
    console.log('==================\n');

    console.log(`🎧 Now playing: ${songName}`);
    // progrerssBar(10, currentPlayer); // Assuming a fixed duration of 30 seconds for demonstration

    // Start afplay
    const player = spawn('afplay', [songPath]);

    currentPlayer = player;
    isPaused = false;

    console.log(`\n🎵 PID: ${player.pid}`);

    console.log('\n🎮 Controls:');
    console.log('⏸️  P → Pause');
    console.log('▶️  R → Resume');
    console.log('⏹️  S → Stop');
    console.log('❌ ESC → Exit');

    // Handle player error
    player.on('error', (err) => {
        console.log('\n❌ Error playing song:', err.message);

        if (currentPlayer === player) {
            currentPlayer = null;
            isPaused = false;
        }

        setTimeout(renderMenu, 1000);
    });

    // Handle song completion
    player.on('close', (code) => {
        if (currentPlayer !== player) {
            return;
        }

        currentPlayer = null;
        isPaused = false;

        if (code === 0) {
            console.log('\n✅ Song finished.');
        }

        setTimeout(renderMenu, 500);
    });
}

// Pause song
function pauseSong() {
    if (!currentPlayer) {
        console.log('\n❌ No song is currently playing.');
        return;
    }

    if (isPaused) {
        console.log('\n⚠️ Song is already paused.');
        return;
    }

    try {
        process.kill(
            currentPlayer.pid,
            'SIGSTOP'
        );

        isPaused = true;

        console.log('\n⏸️ Song paused.');
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
        console.log('\n❌ No song is currently playing.');
        return;
    }

    if (!isPaused) {
        console.log('\n⚠️ Song is already playing.');
        return;
    }

    try {
        process.kill(
            currentPlayer.pid,
            'SIGCONT'
        );

        isPaused = false;

        console.log('\n▶️ Song resumed.');
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
        console.log('\n❌ No song is currently playing.');
        return;
    }

    killCurrentPlayer();

    console.log('\n⏹️ Song stopped.');
}

// Display menu
function renderMenu() {
    clearConsole();

    console.log('\n🎶 Welcome to the Music Player! 🎶');
    console.log('===================================\n');

    console.log('Use ↑ ↓ to select a song');
    console.log('Press ENTER to play\n');

    for (let i = 0; i < mp3Files.length; i++) {
        const songName = getSongName(mp3Files[i]);

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

    console.log('\n===================================');

    console.log('🎮 Controls:');
    console.log('↑ ↓ → Select song');
    console.log('ENTER → Play selected song');
    console.log('P → Pause');
    console.log('R → Resume');
    console.log('S → Stop');
    console.log('ESC → Exit');

    console.log('===================================');
}

// Handle keyboard input
function handleKey(key) {

    // ESC key
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

    // Enter key
    if (key === '\r' || key === '\n') {
        const selectedSong = mp3Files[selected];

        const songPath = `${path}/${selectedSong}`;
        // progressBar(0, currentPlayer);
        console.log(
            `\n🎧 Now playing: ${getSongName(selectedSong)}`
        );

        playSong(
            songPath,
            getSongName(selectedSong)
        );

        return;
    }

    // Convert key to lowercase
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
        renderMenu();
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

        const selectedSong = mp3Files[selected];

        const songPath = `${path}/${selectedSong}`;

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
process.stdin.on('data', handleKey);

// Handle Ctrl + C
process.on('SIGINT', () => {
    exitPlayer();
});
