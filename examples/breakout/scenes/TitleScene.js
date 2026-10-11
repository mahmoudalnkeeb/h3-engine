import { Scene } from '../../../src/index.js';
import { FONT, ROW_COLORS, START, W } from '../config.js';
import { loadBest } from '../storage.js';

export class TitleScene extends Scene {
  enter() {
    this.t = 0;
    this.best = loadBest();
  }

  update(dt, { input }) {
    this.t += dt;
    if (input.justPressed(START) || input.pointer.justPressed) this.game.scenes.switch('play');
  }

  render(r) {
    for (let row = 0; row < ROW_COLORS.length; row++) {
      const y = 40 + row * 22 + Math.sin(this.t * 2 + row * 0.6) * 4;
      for (let col = 0; col < 10; col++) r.rect(22 + col * 60, y, 56, 18, ROW_COLORS[row]);
    }
    r.text('BREAKOUT', W / 2, 250, { font: `bold 64px ${FONT}`, align: 'center' });
    r.text('made with h3-engine', W / 2, 322, { font: `14px ${FONT}`, color: '#8888aa', align: 'center' });
    if (Math.floor(this.t * 2) % 2 === 0) {
      r.text('Press Space or click to start', W / 2, 372, { font: `20px ${FONT}`, align: 'center' });
    }
    r.text('Move: mouse / touch / arrows   Launch: click / Space   Pause: P', W / 2, 430, {
      font: `13px ${FONT}`,
      color: '#8888aa',
      align: 'center',
    });
    if (this.best > 0)
      r.text(`Best ${this.best}`, W / 2, 452, { font: `13px ${FONT}`, color: '#ffd166', align: 'center' });
  }
}
