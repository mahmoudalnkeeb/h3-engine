import { Entity } from '../../../src/index.js';
import { T } from '../config.js';

export class Flag extends Entity {
  constructor(x, y) {
    // Pole stands on the tile below the 'F' and reaches three tiles up.
    super({ x: x + 6, y: y + T - 48, w: 4, h: 48, z: 2, tags: ['goal'] });
    this.t = 0;
    /** 0 = flag at the top, 1 = lowered. */
    this.lowered = 0;
  }

  update(dt) {
    this.t += dt;
  }

  render(r) {
    const { x, y } = this.pos;
    r.rect(x, y, 2, this.h, '#e8e8f0');
    r.rect(x - 1, y - 3, 4, 4, '#ffd166');
    const fy = Math.round(y + 2 + this.lowered * (this.h - 16));
    const wave = Math.round(Math.sin(this.t * 6) * 2);
    r.poly([x + 2, fy, x + 18, fy + 5 + wave, x + 2, fy + 10], '#f25f5c');
  }
}
