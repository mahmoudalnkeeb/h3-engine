import { Game } from '../../src/index.js';
import { H, W } from './entities.js';
import { GameOverScene, PauseScene, PlayScene, TitleScene, WinScene } from './scenes.js';

const game = new Game({ canvas: '#game', width: W, height: H, scale: 'pixel', background: '#6ec6ff' });

game.scenes
  .add('title', TitleScene)
  .add('play', PlayScene)
  .add('pause', PauseScene)
  .add('gameover', GameOverScene)
  .add('win', WinScene);

game.start('title');

// Exposed for poking at from the browser console.
globalThis.game = game;
