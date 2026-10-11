import { Entity } from '../../../src/index.js';
import { H } from '../config.js';

export const POWERUPS = {
  wide: { color: '#4cc9f0', label: 'W' },
  multi: { color: '#f15bb5', label: 'M' },
};

export class PowerUp extends Entity {
  /** @param {keyof typeof POWERUPS} kind */
  constructor(x, y, kind) {
    super({ x, y, w: 28, h: 12, z: 1, tags: ['powerup'] });
    this.kind = kind;
    this.vel.y = 120;
  }

  update(dt) {
    super.update(dt);
    if (this.pos.y > H) this.destroy();
  }

  render(r) {
    const { x, y } = this.pos;
    const { color, label } = POWERUPS[this.kind];
    r.circle(x + 6, y + 6, 6, color);
    r.circle(x + this.w - 6, y + 6, 6, color);
    r.rect(x + 6, y, this.w - 12, 12, color);
    r.text(label, x + this.w / 2, y + 6, {
      font: 'bold 10px sans-serif',
      color: '#10101a',
      align: 'center',
      baseline: 'middle',
    });
  }
}
