import { Entity } from '../../../src/index.js';
import { ROW_COLORS } from '../config.js';

export class Brick extends Entity {
  constructor(x, y, row, hp) {
    super({ x, y, w: 56, h: 18, tags: ['brick'] });
    this.row = row;
    this.color = ROW_COLORS[row % ROW_COLORS.length];
    this.hp = hp;
    this.maxHp = hp;
    this.flash = 0;
    this.alpha = 1;
  }

  update(dt) {
    if (this.flash > 0) this.flash -= dt;
  }

  /** @returns {boolean} true if this hit broke the brick */
  hit() {
    this.hp--;
    this.flash = 0.08;
    return this.hp <= 0;
  }

  render(r) {
    const { x, y } = this.pos;
    const { w, h } = this;
    r.alpha = this.alpha;
    r.rect(x, y, w, h, this.flash > 0 ? '#fff' : this.color);
    r.rect(x, y, w, 3, 'rgba(255,255,255,0.35)');
    r.rect(x, y + h - 3, w, 3, 'rgba(0,0,0,0.25)');
    // Armored bricks show a dark band per remaining extra hit.
    for (let i = 1; i < this.hp; i++) r.rect(x + 6, y + 3 + i * 4, w - 12, 2, 'rgba(0,0,0,0.35)');
    r.alpha = 1;
  }
}
