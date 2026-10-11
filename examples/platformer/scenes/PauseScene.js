import { Scene } from '../../../src/index.js';
import { H, PAUSE, START, W } from '../config.js';
import { label } from '../ui.js';

export class PauseScene extends Scene {
  update(_dt, { input }) {
    if (input.justPressed([...PAUSE, ...START])) this.game.scenes.pop();
  }

  render(r) {
    r.rect(0, 0, W, H, 'rgba(10, 20, 40, 0.6)');
    label(r, 'PAUSED', W / 2, H / 2 - 14, { size: 16 });
    label(r, 'P to resume', W / 2, H / 2 + 8, { size: 8, color: '#c0d0ff' });
  }
}
