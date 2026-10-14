# Credits

## Game

**DREAMLAND HEIST**: game design, code, pixel art, music and sound created with Claude Code (Anthropic), directed by the repository owner.

## Art

All graphics are **original procedural pixel art** generated in code at load time (`src/art/`): characters and their animations, enemies, portraits, backgrounds, props, UI, icons and effects. No external image assets are used. `public/apple-touch-icon.png`, `icon-192.png` and `icon-512.png` are rendered from the same in-game Zeus artwork.

## Music & sound

All music, sound effects and ambience are **original and synthesized in real time** with the Web Audio API (`src/audio/`): Karplus–Strong plucked guitar, analog-style pads, synth bass, arpeggiators, theremin, drum synthesis, generated convolution reverb, ping-pong delay and a master compressor/limiter. No external audio files are used.

Original soundtrack: *Sunset Over Groom Lake*, *Something In The Blockchain*, *Rest Stop*, *Golden Hour Pursuit*, *Neon Dusk in Rachel*, *Moonlight on the Wire*, *Hangar 18*, *Subterranean Protocol*, *The Enforcer*, *Sunrise Over Dreamland*.

## Libraries

| Library | Author | License | Link |
|---|---|---|---|
| Phaser 3.90.0 | Phaser Studio Inc. | MIT | https://phaser.io |
| Vite | Evan You & Vite contributors | MIT | https://vitejs.dev |

## Fonts (loaded from Google Fonts)

| Font | Author | License | Link |
|---|---|---|---|
| Press Start 2P | CodeMan38 | SIL Open Font License 1.1 | https://fonts.google.com/specimen/Press+Start+2P |
| VT323 | Peter Hull | SIL Open Font License 1.1 | https://fonts.google.com/specimen/VT323 |

A tiny 3×5 pixel font used for small in-world signs is original (`src/art/rachel.js`).

## Real places

Rachel, Nevada, State Route 375 ("Extraterrestrial Highway"), the Little A'Le'Inn and the Black Mailbox are real places, depicted affectionately. All characters, including the diner's owner "Dolores" and the other locals, are fictional.

## Third-party assets

_None._ The game contains no third-party images, sounds or music. Any CC0 or permissively licensed asset added later via `FILE_OVERRIDES` / `SAMPLES` must be listed here with its source, author and license.
