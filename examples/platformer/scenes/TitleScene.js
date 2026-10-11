import { Scene } from '../../../src/index.js';
import { H, START, W } from '../config.js';
import { Backdrop } from '../entities/Backdrop.js';
import { label } from '../ui.js';

export class TitleScene extends Scene {
  enter() {
    this.t = 0;
    this.add(new Backdrop());
  }

  update(dt, { input }) {
    this.t += dt;
    this.camera.x += dt * 20; // drift the backdrop
    if (input.justPressed(START)) this.game.scenes.switch('play');
  }

  render(r) {
    r.rect(0, H - 24, W, 24, '#8b5a2b');
    r.rect(0, H - 24, W, 4, '#5ec44a');
    label(r, 'PIXEL HOP', W / 2, 44, { size: 24, color: '#ff5e5b' });
    label(r, 'made with h3-engine', W / 2, 74, { size: 8, color: '#1d3b5c' });
    if (Math.floor(this.t * 2) % 2 === 0) label(r, 'PRESS SPACE TO START', W / 2, 104, { size: 10 });
    label(r, 'ARROWS/WASD move   SPACE/Z jump   P pause', W / 2, 136, { size: 8, color: '#1d3b5c' });
  }
}
