import { Scene } from '../../../src/index.js';
import { FONT, H, PAUSE, W } from '../config.js';

export class PauseScene extends Scene {
  update(_dt, { input }) {
    if (input.justPressed([...PAUSE, 'Space']) || input.pointer.justPressed) this.game.scenes.pop();
  }

  render(r) {
    r.rect(0, 0, W, H, 'rgba(8, 8, 12, 0.7)');
    r.text('PAUSED', W / 2, H / 2 - 10, { font: `bold 48px ${FONT}`, align: 'center', baseline: 'middle' });
    r.text('Press P or click to resume', W / 2, H / 2 + 34, {
      font: `16px ${FONT}`,
      color: '#8888aa',
      align: 'center',
    });
  }
}
