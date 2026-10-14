// ============================================================================
//  DREAMLAND HEIST — entry point
// ============================================================================
import Phaser from 'phaser';
import './style.css';
import { GAME } from './config.js';
import { Audio } from './systems/audio.js';
import { FilmFX } from './systems/fx.js';
import { installMobileGuards, initRotateScreen, installOrientationLock } from './systems/mobile.js';

import BootScene from './scenes/BootScene.js';
import TitleScene from './scenes/TitleScene.js';
import SettingsScene from './scenes/SettingsScene.js';
import ControlsScene from './scenes/ControlsScene.js';
import Chapter5Scene from './scenes/Chapter5Scene.js';
import PauseScene from './scenes/PauseScene.js';
import CreditsScene from './scenes/CreditsScene.js';

installMobileGuards();
Audio.installUnlock();

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: GAME.WIDTH,
  height: GAME.HEIGHT,
  backgroundColor: GAME.BG_COLOR,
  pixelArt: true,
  roundPixels: true,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    fullscreenTarget: 'app',
  },
  input: { activePointers: 4 },
  physics: { default: 'arcade', arcade: { gravity: { y: 0 }, debug: false } },
  fps: { target: 60 },
  render: { antialias: false, powerPreference: 'high-performance' },
  pipeline: { FilmFX },
  audio: { noAudio: true },          // we run our own Web Audio engine
  disableContextMenu: true,
  scene: [BootScene, TitleScene, SettingsScene, ControlsScene, PauseScene, Chapter5Scene, CreditsScene],
});

initRotateScreen(game);
installOrientationLock(game);
window.__game = game; // handy for debugging in the console
