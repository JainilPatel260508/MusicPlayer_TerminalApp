# Terminal Music Player 🎶

A keyboard-controlled music player built with **Node.js** for macOS. It reads MP3 files from a local folder, displays a song-selection menu in the terminal, plays audio using **mpv**, and shows an estimated progress bar.

## Features

- Browse local MP3 files using the ↑ and ↓ arrow keys.
- Play a selected song by pressing **Enter**.
- Pause, resume, and stop playback with keyboard shortcuts.
- View the current song, elapsed time, duration, and progress bar.
- Return to the song menu when playback ends.

## Requirements

- **macOS** with Node.js installed.
- **mpv** for audio playback. Install it with Homebrew:
  ```bash
  brew install mpv
  ```
- The macOS `afinfo` utility, which the progress module uses to read audio duration.

Check your installation:

```bash
node --version
mpv --version
```

## Project structure

```text
Music_Player/
├── player.js        # Main application and keyboard controls
├── progressbar.js    # Duration lookup and progress-bar timer
└── songs/            # Your MP3 files
    ├── song1.mp3
    └── song2.mp3
```

> **File names matter:** If your progress module is named `progressbar.js`, the main file should use `const progressBar = require('./progressbar');`. The import must match the actual filename.

## Run the player

1. Put your MP3 files inside the `songs/` folder.
2. Open a terminal in the project directory.
3. Start the application:
   ```bash
   node player.js
   ```
4. Use the keyboard controls below to select and play music.

## Keyboard controls

| Key | Action |
| --- | --- |
| ↑ / ↓ | Select a song |
| Enter | Play selected song |
| P | Pause |
| R | Resume |
| S | Stop |
| Esc | Exit |

## How it works

- **`fs.readdirSync()`** reads the filenames inside `songs/`. Array filters keep files with the `.mp3` extension and a readable duration.
- **`child_process.spawn()`** launches `mpv` in a separate process to play the selected file. Node.js remains free to respond to keyboard input.
- **mpv IPC** lets Node.js send native pause and resume commands to the audio player. This avoids suspending the entire process with `SIGSTOP`/`SIGCONT`.
- **`process.stdin` in raw mode** receives keyboard input without waiting for Enter.
- **`progressbar.js`** reads the duration with `afinfo`, estimates elapsed time with `setInterval()`, and renders a 30-character progress bar.
- The child process's **`close` event** lets the app clean up playback state and return to the menu.

### Progress calculation

```text
progress = elapsedSeconds / totalSeconds
percentage = floor(progress × 100)
filledBlocks = floor(progress × 30)
```

The displayed progress is **estimated** from a JavaScript timer; it is not an exact reading of mpv's playback position.

## Why use mpv?

The original implementation used macOS `afplay` and process signals to pause and resume. Suspending the whole audio process can cause playback glitches. **mpv** supports native pause/resume control through IPC, so the application can control playback without suspending its process.

## Troubleshooting

- **`Cannot find module './player'` or `getProgress is not a function`:** Verify that `player.js` is the main file, `progressbar.js` exports `getProgress`, and `player.js` imports `./progressbar` rather than itself.
- **`spawn mpv ENOENT`:** Install mpv with `brew install mpv`, then run `mpv --version`.
- **No songs listed:** Confirm that the `songs/` directory exists and contains readable MP3 files.
- **Keyboard input does not work:** Run the app in an interactive terminal, not an output-only console.
- **Playback or progress differs slightly:** The progress display is timer-based, and output-device audio buffering may introduce a small pause/resume delay.

## Technologies and concepts

JavaScript, Node.js, CommonJS modules (`require`/`module.exports`), File System (`fs`), child processes (`spawn` and `spawnSync`), event listeners, terminal input/output, timers, and macOS audio utilities.
