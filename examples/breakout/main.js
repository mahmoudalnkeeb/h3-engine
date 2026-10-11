import { Game } from '../../src/index.js';
import { H, W } from './entities.js';
import { GameOverScene, PauseScene, PlayScene, TitleScene } from './scenes.js';

const game = new Game({ canvas: '#game', width: W, height: H, background: '#10101a' });

game.scenes.add('title', TitleScene).add('play', PlayScene).add('pause', PauseScene).add('gameover', GameOverScene);

// Particles are tagged 'fx'; hide the whole category from the debug overlay.
game.debug.ignoreTags.add('fx');

game.start('title');

// Exposed for poking at from the browser console.
globalThis.game = game;
