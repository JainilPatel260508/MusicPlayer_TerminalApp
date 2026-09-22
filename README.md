# Terminal Music Player 🎶

A keyboard-controlled music player built with **Node.js** for **macOS**. Browse locally stored MP3 files, play music through **mpv**, control playback without leaving the terminal, and view an estimated progress bar. The playlist supports **Next**, **Previous**, and **automatic playback of the next song**.

## Features

- Browse songs with **↑ / ↓** and play the highlighted song with **Enter**.
- **Pause**, **resume**, and **stop** using keyboard shortcuts.
- Skip to the **next** or **previous** song without returning to the menu.
- **Auto-next:** when a song finishes naturally, the next song starts automatically.
- **Circular playlist:** Next on the last song goes to the first; Previous on the first goes to the last.
- Display the current song, elapsed time, total duration, and an estimated progress bar.
- Keep playback controls responsive while audio plays in a separate process.

## Requirements

- **macOS** and **Node.js** installed.
- **mpv** for audio playback. Install with [Homebrew](https://brew.sh/):

  ```bash
  brew install mpv
  ```

- The macOS `afinfo` utility, used to read audio duration.
- An interactive terminal (such as macOS Terminal or the VS Code integrated terminal).

Check your setup:

```bash
node --version
mpv --version
```

## Project structure

```text
Music_Player/
├── player.js          # Main app, keyboard controls, playlist, and mpv integration
├── progressBar.js     # Duration lookup and estimated progress timer
├── README.md
└── songs/              # Add your own MP3 files here
    ├── song1.mp3
    └── song2.mp3
```

> **Use the exact filename in your import.** If your file is `progressBar.js`, write `const progressBar = require('./progressBar');` in `player.js`. If the file is instead named `progressbar.js`, use `require('./progressbar')`. Do **not** import `./player` from `player.js` itself.

## Getting started

1. Put your MP3 files in the `songs/` folder.
2. Open a terminal in the project directory.
3. Start the app:

   ```bash
   node player.js
   ```

4. Select a song and press **Enter** to start playing.

## Keyboard controls

| Key | Action |
| --- | --- |
| ↑ / ↓ | Highlight the previous / next song in the menu |
| Enter | Play the highlighted song |
| N or → | Play the next song |
| B or ← | Play the previous song |
| P | Pause playback |
| R | Resume playback |
| S | Stop playback and return to the menu |
| Esc | Exit the application |

**Playlist behavior:** Next and Previous wrap around the list. When a song completes normally, the next song starts automatically; manually stopping or skipping does not trigger a second automatic advance. The currently playing song is tracked separately from the highlighted menu selection.

## How it works

1. **Discover songs:** `fs.readdirSync()` reads `songs/`. Array filters select `.mp3` files with a readable, positive duration.
2. **Start playback:** `child_process.spawn()` launches `mpv` as a separate process so Node.js can keep responding to keyboard events.
3. **Control playback:** Node.js sends JSON commands to mpv over a local IPC socket to pause or resume audio, rather than suspending the entire process with `SIGSTOP`/`SIGCONT`.
4. **Handle keys:** `process.stdin` in raw mode delivers keypresses without requiring Enter for every command.
5. **Track progress:** `progressBar.js` gets the duration using `afinfo`, estimates elapsed time with `setInterval()`, and formats the time and progress bar.
6. **Advance the playlist:** Next / Previous calculate the new song index. When the active mpv process closes after normal completion, its `close` handler starts the next song. Events from an older, replaced player are ignored so they cannot interrupt the current song.

### Progress calculation

```text
progress     = elapsedSeconds / totalSeconds
percentage   = floor(progress × 100)
filledBlocks = floor(progress × 30)
```

The bar is **estimated from a JavaScript timer**, not synchronized to mpv's actual playback position, so small differences may occur.

## Why mpv?

The original player used macOS `afplay` and process signals to pause and resume. Suspending an entire audio process may cause glitches or delayed pauses. **mpv** exposes playback controls through IPC, allowing the app to pause and resume the audio directly.

## Troubleshooting

| Problem | What to check |
| --- | --- |
| `Cannot find module './progressBar'` | Confirm the progress module's filename and match its capitalization in `require()`; use `./progressbar` if that is the actual name. |
| `getProgress is not a function` | Confirm that the progress module defines and exports `getProgress`, and that `player.js` is not importing itself. |
| `spawn mpv ENOENT` | Install mpv with `brew install mpv`, then verify `mpv --version`. |
| No songs appear | Check that `songs/` exists, contains MP3 files, and the files have readable durations. |
| Keyboard shortcuts do not respond | Run `node player.js` in an interactive terminal. |
| The progress bar differs slightly from the audio | The progress is timer-based; device buffering and timer delays can cause minor differences. |
| Auto-next does not work | Verify that the current song finishes normally and the updated playlist / `close`-handler code is present in `player.js`. |

## Technologies and concepts

**JavaScript**, **Node.js**, CommonJS (`require` / `module.exports`), `fs`, `path`, `os`, `net`, `child_process` (`spawn` / `spawnSync`), **mpv IPC**, event listeners, raw terminal input, asynchronous child processes, timers, and playlist index management.
