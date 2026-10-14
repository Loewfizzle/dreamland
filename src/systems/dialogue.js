// ============================================================================
//  DIALOGUE — comic-book text boxes with animated portraits, typewriter text
//  with per-character voice blips, tap-to-advance and a SKIP button.
//
//  await Dialogue.play(scene, [
//    { who: 'ben',  mood: 'shocked', text: 'My RIG!' },
//    { who: 'zeus', mood: 'excited', text: '*BOOF*' },
//  ]);
// ============================================================================
import Phaser from 'phaser';
import { GAME } from '../config.js';
import { P, hexNum } from '../art/palette.js';
import { portraitFrame } from '../art/portraits.js';
import { Audio } from './audio.js';
import { Input } from './input.js';
import { headText, bodyText } from './ui.js';

const W = GAME.WIDTH, H = GAME.HEIGHT;

export const SPEAKERS = {
  ben:  { name: 'BEN',  color: P.btc,   voice: { pitch: 190, wave: 'square' } },
  zeus: { name: 'ZEUS', color: P.gold1, voice: { pitch: 430, wave: 'triangle' } },
  agent:{ name: 'AGENT',color: P.chrome1, voice: { pitch: 120, wave: 'sawtooth' } },
  radio:{ name: 'RADIO',color: P.cyan1, voice: { pitch: 300, wave: 'sawtooth' } },
};

const CPS = 46;                      // typewriter characters per second
const PAUSE = { '.': 160, '!': 160, '?': 160, ',': 80, '—': 120 };

export const Dialogue = {
  /** Play a list of lines. Resolves when finished or skipped. */
  play(scene, lines, { depth = 2000 } = {}) {
    return new Promise((resolve) => {
      const prevLayout = Input.layout;
      Input.configure({ mode: 'tap' });

      const root = scene.add.container(0, 0).setScrollFactor(0).setDepth(depth);
      const boxY = H - 88;
      // letterbox bars for a cinematic feel
      const barTop = scene.add.rectangle(0, -24, W, 24, 0x000000).setOrigin(0);
      root.add(barTop);
      scene.tweens.add({ targets: barTop, y: 0, duration: 250, ease: 'Quad.Out' });

      const box = scene.add.container(0, H + 10);
      const bg = scene.add.graphics();
      const draw = (accent) => {
        bg.clear();
        bg.fillStyle(hexNum(P.ink), 0.94).fillRect(12, 0, W - 24, 80);
        bg.fillStyle(hexNum(P.ink2), 1).fillRect(14, 2, W - 28, 76);
        for (let y = 4; y < 78; y += 2) { bg.fillStyle(hexNum(P.ink3), 0.25).fillRect(14, y, W - 28, 1); }
        bg.lineStyle(2, hexNum(accent), 1).strokeRect(13, 1, W - 26, 78);
        bg.fillStyle(hexNum(accent), 1).fillRect(12, 0, 6, 2).fillRect(W - 18, 0, 6, 2);
      };
      draw(P.btc);
      const frame = scene.add.rectangle(48, 40, 58, 58, hexNum(P.ink3)).setStrokeStyle(2, hexNum(P.btc));
      const portrait = scene.add.sprite(48, 40, 'portrait_ben', 0);
      const nameBg = scene.add.rectangle(84, -8, 70, 14, hexNum(P.btc)).setOrigin(0, 0.5);
      const name = headText(scene, 90, -8, 'BEN', 8, P.ink, { ox: 0, shadow: false });
      const text = bodyText(scene, 86, 8, '', 16, P.white, { wrap: W - 120, lineSpacing: -2 });
      const arrow = headText(scene, W - 30, 68, 'v', 8, P.btc1);
      scene.tweens.add({ targets: arrow, y: 72, duration: 300, yoyo: true, repeat: -1 });
      box.add([bg, frame, portrait, nameBg, name, text, arrow]);
      root.add(box);
      scene.tweens.add({ targets: box, y: boxY, duration: 280, ease: 'Back.Out' });

      // SKIP button
      const skip = headText(scene, W - 14, 12, 'SKIP >>', 8, P.cream, { ox: 1 }).setInteractive({ useHandCursor: true });
      skip.setAlpha(0.8);
      root.add(skip);

      let idx = -1, shown = 0, full = '', typing = false, last = 0, done = false, wait = 0, speaker = null;
      const timer = scene.time.addEvent({ delay: 16, loop: true, callback: tick });

      function show(i) {
        const line = lines[i];
        const s = SPEAKERS[line.who] ?? SPEAKERS.ben;
        if (line.who !== speaker) {
          speaker = line.who;
          portrait.setTexture(`portrait_${line.who}`);
          name.setText(s.name);
          nameBg.width = s.name.length * 8 + 14;
          nameBg.setFillStyle(hexNum(s.color));
          frame.setStrokeStyle(2, hexNum(s.color));
          draw(s.color);
          portrait.setScale(0.6);
          scene.tweens.add({ targets: portrait, scale: 1, duration: 220, ease: 'Back.Out' });
        }
        portrait.setFrame(portraitFrame(line.who, line.mood ?? 'happy'));
        if (line.mood === 'shocked' || line.mood === 'angry' || line.mood === 'alert' || line.mood === 'excited') {
          scene.tweens.add({ targets: portrait, x: { from: 44, to: 48 }, duration: 40, repeat: 4, yoyo: true });
        }
        full = line.text;
        shown = 0;
        typing = true;
        text.setText('');
        arrow.setVisible(false);
        line.onShow?.();
      }

      function tick() {
        if (!typing) return;
        if (wait > 0) { wait -= 16; return; }
        const now = scene.time.now;
        const due = Math.floor(((now - last) / 1000) * CPS);
        if (due <= 0 && shown > 0) return;
        last = now;
        const n = Math.max(1, due);
        for (let k = 0; k < n && shown < full.length; k++) {
          const ch = full[shown++];
          if (PAUSE[ch]) { wait = PAUSE[ch]; break; }
        }
        text.setText(full.slice(0, shown));
        if (shown % 2 === 0 && full[shown - 1] !== ' ') {
          const s = SPEAKERS[speaker] ?? SPEAKERS.ben;
          Audio.sfx('blip', { ...s.voice, volume: 0.55, minGap: 0 });
        }
        if (shown >= full.length) { typing = false; arrow.setVisible(true); }
      }

      function advance() {
        if (done) return;
        if (typing) {
          shown = full.length;
          text.setText(full);
          typing = false;
          arrow.setVisible(true);
          return;
        }
        idx++;
        if (idx >= lines.length) return finish();
        Audio.sfx('ui_hover', { volume: 0.5 });
        show(idx);
      }

      function finish() {
        if (done) return;
        done = true;
        timer.remove();
        scene.input.off('pointerup', onTap);
        Input.events.off('press', onPress);
        scene.tweens.add({ targets: box, y: H + 10, duration: 200, ease: 'Quad.In' });
        scene.tweens.add({ targets: barTop, y: -24, duration: 200 });
        scene.tweens.add({ targets: skip, alpha: 0, duration: 150 });
        scene.time.delayedCall(220, () => {
          root.destroy();
          Input.configure(prevLayout);
          resolve();
        });
      }

      const onTap = (p, over) => { if (over?.includes(skip)) return; advance(); };
      const onPress = (id) => { if (id === 'A' || id === 'B' || id === 'C') advance(); };
      skip.on('pointerup', () => { Audio.sfx('ui_back'); finish(); });
      scene.time.delayedCall(150, () => {
        scene.input.on('pointerup', onTap);
        Input.events.on('press', onPress);
        advance();
      });
    });
  },
};
