import { Scene } from '../../../src/index.js';
import { FONT, START, W } from '../config.js';
import { loadBest, saveBest } from '../storage.js';

export class GameOverScene extends Scene {
  enter({ score = 0, level = 1 } = {}) {
    this.score = score;
    this.level = level;
    this.best = loadBest();
    this.newBest = score > this.best;
    if (this.newBest) saveBest(score);
    this.ready = false;
    this.timer.after(0.6, () => (this.ready = true)); // don't skip the screen with a stray click
  }

  update(_dt, { input }) {
    if (!this.ready) return;
    if (input.justPressed('Escape')) this.game.scenes.switch('title');
    else if (input.justPressed(START) || input.pointer.justPressed) this.game.scenes.switch('play');
  }

  render(r) {
    r.text('GAME OVER', W / 2, 150, { font: `bold 56px ${FONT}`, color: '#f25f5c', align: 'center' });
    r.text(`Score ${this.score}   ·   Level ${this.level}`, W / 2, 240, { font: `22px ${FONT}`, align: 'center' });
    const best = this.newBest ? 'New best!' : `Best ${this.best}`;
    r.text(best, W / 2, 276, { font: `18px ${FONT}`, color: '#ffd166', align: 'center' });
    if (this.ready) {
      r.text('Space or click to play again   ·   Esc for title', W / 2, 360, {
        font: `16px ${FONT}`,
        color: '#8888aa',
        align: 'center',
      });
    }
  }
}
