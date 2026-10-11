import { Entity } from '../../../src/index.js';

export class Coin extends Entity {
  constructor(x, y) {
    super({ x: x + 4, y: y + 3, w: 8, h: 10, z: 3, tags: ['coin'] });
    this.baseY = this.pos.y;
    this.t = x * 0.05;
  }

  update(dt) {
    this.t += dt;
    this.pos.y = this.baseY + Math.sin(this.t * 4) * 1.5;
  }

  render(r) {
    // Fake a spin by narrowing the coin.
    const w = Math.max(2, Math.round(8 * Math.abs(Math.cos(this.t * 3))));
    const x = Math.round(this.cx - w / 2);
    const y = Math.round(this.pos.y);
    r.rect(x, y, w, 10, '#ffd166');
    if (w > 3) r.rect(x + 1, y + 1, 1, 6, '#fff3c4');
    r.rect(x, y + 9, w, 1, '#d9a53f');
  }
}
