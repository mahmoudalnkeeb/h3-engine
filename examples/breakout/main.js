import { Game } from '../../src/index.js';
import { H, W } from './config.js';
import { GameOverScene } from './scenes/GameOverScene.js';
import { PauseScene } from './scenes/PauseScene.js';
import { PlayScene } from './scenes/PlayScene.js';
import { TitleScene } from './scenes/TitleScene.js';

const game = new Game({ canvas: '#game', width: W, height: H, background: '#10101a' });

game.scenes.add('title', TitleScene).add('play', PlayScene).add('pause', PauseScene).add('gameover', GameOverScene);

// Particles are tagged 'fx'; hide the whole category from the debug overlay.
game.debug.ignoreTags.add('fx');

game.start('title');

// Exposed for poking at from the browser console.
globalThis.game = game;
