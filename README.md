# DREAMLAND HEIST

A mobile-first, story-driven pixel-art browser game. Ben, a Bitcoin believer and alien believer in a tinfoil-lined trucker cap, and his golden retriever **Zeus** drive into the Nevada desert to break into Area 51. They want Ben's seized mining rig back, and they end up uncovering the truth about Satoshi Nakamoto.

**Play it:** https://dreamland.loewfizzle.com

Built with **Phaser 3 + Vite + plain JavaScript**. Every sprite is hand-crafted procedurally in code and every note of music and sound is synthesized live with the Web Audio API, so the whole game ships as a small static site with no image or audio files.

## The game

| # | Chapter | Style |
|---|---|---|
| | Intro: *Something In The Blockchain* | animated cutscene |
| 1 | **Extraterrestrial Highway** | pseudo-3D arcade driving (OutRun style) |
| 2 | **Rachel, Nevada** | top-down exploration, Zeus SNIFF & DIG, fuse-box puzzle |
| 3 | **The Perimeter** | top-down night stealth: vision cones, searchlights, sensors, BARK lures |
| 4 | **The Hangar** | three hacking mini-games against the clock, Zeus FETCH |
| 5 | **Underground** | side-scrolling run & gun, Zeus TACKLE |
| 6 | **Dreamland** | boss shooter vs. the UFO Enforcer, POWER BARK |
| | Ending, credits & post-credits stinger | |

Between chapters: the **chapter map**, the **results screen** (stars, golden bitcoins, bonuses) and **THE VAN** shop (upgrades and cosmetics). Each chapter hides 3 golden bitcoins. A full playthrough takes about 25–35 minutes.

## Run locally

Requires [Node.js](https://nodejs.org) 18+.

```bash
npm install
npm run dev
```

Open the URL Vite prints (e.g. `http://localhost:5173`).

### Test on your phone

`npm run dev` also serves on your local network. With your phone on the same Wi-Fi, open the **Network** URL Vite prints (e.g. `http://192.168.1.50:5173`) and hold the phone in landscape. Tap once to start: mobile browsers only allow audio after a tap.

* **Android:** the first tap goes fullscreen and locks landscape automatically.
* **iPhone:** Safari can't go fullscreen. Use *Share → Add to Home Screen* and launch the game from the icon for true fullscreen.

### Production build

```bash
npm run build     # outputs static files to dist/
npm run preview   # serve the build locally
npm run check     # level-design check: proves every coin/platform in Ch.5 is reachable
```

## Deploy to Vercel (step by step)

The repo already contains `vercel.json`, so Vercel needs no manual settings.

1. Push this repo to GitHub (it's already at `github.com/Loewfizzle/dreamland`).
2. Go to **https://vercel.com/new** and sign in with GitHub.
3. Click **Import** next to the `dreamland` repository.
4. Vercel detects **Vite** automatically: build command `npm run build`, output directory `dist`. Leave everything as is and click **Deploy**.
5. After about a minute you get a `*.vercel.app` URL. Every future `git push` to `main` redeploys automatically.
6. **Custom domain (optional):** Project → **Settings → Domains** → add e.g. `dreamland.yourdomain.com`. Vercel shows a DNS record, usually a `CNAME` named `dreamland` pointing to `cname.vercel-dns.com`. Add it at your domain registrar. HTTPS is set up automatically once the DNS resolves.

## Controls

| Action | Keyboard | Touch |
|---|---|---|
| Move / steer | WASD / Arrow keys | Left-thumb joystick (floats to wherever you touch); ◀ ▶ pads while driving |
| Button A (jump / talk / use / sniff / boost) | Space / J / Z | Orange button |
| Button B (Zeus: bark / sniff / dig / tackle / fetch) | E / K / X | Cyan paw button |
| Button C (fire / sneak) | Shift / L / C | Pink button |
| Pause | Esc / P | Pause icon (top right) |

Button labels change per chapter and per situation, so watch the on-screen buttons.

## Tweaking the game

* **All tunable numbers** (speeds, health, timers, prices, volumes, difficulty) live in [`src/config.js`](src/config.js), grouped by chapter and commented.
* **Swap any sprite** for an image file: add it to `FILE_OVERRIDES` in [`src/art/assets.js`](src/art/assets.js).
* **Swap any sound** for a recording: add it to [`src/audio/samples.js`](src/audio/samples.js).
* **Music** is written as readable pattern data in [`src/audio/music/`](src/audio/music). The format is documented at the top of [`src/audio/sequencer.js`](src/audio/sequencer.js). Each song has a `master:` loudness trim; the trims were measured so all tracks sit within ~4 dB of each other, with action chapters slightly louder.
* **Story text** lives with each chapter: [`src/data/`](src/data) and the `Dialogue.play(...)` calls in [`src/scenes/`](src/scenes).

### Dev shortcuts

Add a hash to the URL to jump straight somewhere: `#Intro`, `#Map`, `#VanShop`, `#Chapter1` … `#Chapter6`, `#Ending`, `#Credits`.
Some take a start position: `#Chapter1@3000` (road segment), `#Chapter3@700` (y position), `#Chapter4@2` / `#Chapter6@2` (door / boss phase), `#Chapter5@120` (tile column).

## Project structure

```
src/
  config.js            all tunables
  main.js              Phaser game config + scene list
  scenes/              Boot, Title, Intro, Map, VanShop, Results, Chapter1–6,
                       Ending, Credits, Pause, Settings, Controls (touch overlay)
  systems/             audio engine, input, save, progress/upgrades, dialogue,
                       lighting, hacking mini-games, ui kit, fx, mobile guards
  entities/            Ben, Zeus, enemies (Chapter 5)
  art/                 palette + procedural pixel-art generators per chapter
  audio/               synth instruments, sequencer, sfx, ambience, songs
  data/                chapter list, level layouts, map route, credits
tools/reach-check.mjs  level reachability checker
public/                icons, manifest, drop-in replacement assets
```

## Credits

See [CREDITS.md](CREDITS.md).
