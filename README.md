# DREAMLAND HEIST

A mobile-first, story-driven pixel-art browser game. Ben — Bitcoin believer, alien believer, tinfoil-lined trucker cap — and his golden retriever **Zeus** drive into the Nevada desert to break into Area 51, get back Ben's seized mining rig, and uncover the truth about Satoshi Nakamoto.

Built with **Phaser 3 + Vite + plain JavaScript**. Every sprite is hand-crafted procedurally in code and every note of music and sound is synthesized live with the Web Audio API, so the whole game ships as a small static site.

## Status

| Milestone | Status |
|---|---|
| 1. Engine, controls, save, audio engine, title screen | ✅ done |
| ★ Vertical slice: Chapter 5 "Underground" (full quality bar) | ✅ playable |
| 2. Dialogue/cutscenes, intro, chapter map, van shop, results | ✅ done |
| 3. Chapters 1–6 | 🚧 Ch1 ✅  Ch5 ✅  — Ch2, Ch3, Ch4, Ch6 next |
| 4. Ending, credits, post-credits stinger | — |
| 5. Polish pass | — |
| 6. Deploy docs | — |

## Run locally

Requires [Node.js](https://nodejs.org) 18+.

```bash
npm install
npm run dev
```

Open the URL Vite prints (e.g. `http://localhost:5173`).

### Test on your phone

`npm run dev` also serves on your local network. With your phone on the same Wi-Fi, open the **Network** URL that Vite prints (e.g. `http://192.168.1.50:5173`). Hold the phone in landscape. Tap once to start: mobile browsers only allow audio after a tap.

> Tip: on iPhone, use *Share → Add to Home Screen* to play fullscreen. iOS Safari doesn't support the fullscreen button.

### Production build

```bash
npm run build     # outputs static files to dist/
npm run preview   # serve the build locally
```

## Level design check

`npm run check` simulates Ben's real jump physics over the Chapter 5 layout and fails if any coin, golden bitcoin, hot dog or platform can't be reached.

Dev shortcuts: add `#Chapter1`, `#Chapter5`, `#Map`, `#VanShop` or `#Intro` to the URL to jump straight there. `#Chapter5@120` starts at tile column 120; `#Chapter1@3000` starts at road segment 3000.

## Controls

| Action | Keyboard | Touch |
|---|---|---|
| Move | WASD / Arrow keys | Left-thumb joystick (floats to wherever you touch) |
| Action / Jump (A) | Space / J / Z | Orange button |
| Zeus ability (B): TACKLE nearby enemy, else SNIFF | E / K / X | Cyan paw button |
| Fire blaster (C) | Shift / L / C | Pink button (hold) |
| Pause | Esc / P | Pause icon (top right) |

## Tweaking the game

* **All tunable numbers** (speeds, volumes, control sizes, prices…) live in [`src/config.js`](src/config.js), with comments.
* **Swap any sprite** for an image file: add it to `FILE_OVERRIDES` in [`src/art/assets.js`](src/art/assets.js).
* **Swap any sound** for a recording: add it to [`src/audio/samples.js`](src/audio/samples.js).
* **Music** is written as readable pattern data in [`src/audio/music/`](src/audio/music). See the format notes at the top of [`src/audio/sequencer.js`](src/audio/sequencer.js).

## Project structure

```
src/
  config.js            all tunables
  main.js              Phaser game config + scene list
  scenes/              Boot, Title, Settings, Controls overlay, Credits, (chapters…)
  systems/             audio engine, input, save, ui kit, fx, mobile guards
  entities/            Ben, Zeus, enemies
  art/                 palette + procedural pixel-art generators
  audio/               synth instruments, sequencer, sfx, ambience, songs
  data/                credits and (later) dialogue scripts
public/assets/         drop-in replacement sprites/sounds
```

## Deploy to Vercel

Full step-by-step instructions are coming in Milestone 6. The short version: import the GitHub repo at [vercel.com/new](https://vercel.com/new). Vercel auto-detects Vite (build command `npm run build`, output directory `dist`).

## Credits

See [CREDITS.md](CREDITS.md).
