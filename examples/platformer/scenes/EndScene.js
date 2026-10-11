import { Scene } from '../../../src/index.js';
import { START, W } from '../config.js';
import { Backdrop } from '../entities/Backdrop.js';
import { label } from '../ui.js';

/** Shared base for the game over and win screens. */
export class EndScene extends Scene {
  enter({ score = 0, coins = 0 } = {}) {
    this.score = score;
    this.coins = coins;
    this.ready = false;
    this.timer.after(0.8, () => (this.ready = true));
    this.add(new Backdrop());
  }

  update(dt, { input }) {
    this.camera.x += dt * 20;
    if (this.ready && input.justPressed(START)) this.game.scenes.switch('title');
  }

  renderEnd(r, title, color) {
    label(r, title, W / 2, 46, { size: 20, color });
    label(r, `SCORE ${this.score}`, W / 2, 86, { size: 10 });
    label(r, `COINS ${this.coins}`, W / 2, 102, { size: 10, color: '#ffd166' });
    if (this.ready) label(r, 'PRESS SPACE', W / 2, 136, { size: 8, color: '#1d3b5c' });
  }
}
