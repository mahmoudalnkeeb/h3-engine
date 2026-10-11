import { Entity, rand } from '../../../src/index.js';

export class Particle extends Entity {
  constructor() {
    super({ w: 4, h: 4, z: 3, tags: ['fx'] });
    this.life = 0;
    this.maxLife = 1;
    this.color = '#fff';
    /** @type {import('../../../src/index.js').Pool<Particle> | null} */
    this.pool = null;
  }

  spawn(x, y, color, pool) {
    this.pos.set(x, y);
    this.vel.set(rand(-160, 160), rand(-220, 40));
    this.life = this.maxLife = rand(0.35, 0.7);
    this.color = color;
    this.pool = pool;
    return this;
  }

  update(dt) {
    this.vel.y += 600 * dt;
    super.update(dt);
    this.life -= dt;
    if (this.life <= 0) {
      this.destroy();
      this.pool?.release(this);
    }
  }

  render(r) {
    r.alpha = this.life / this.maxLife;
    r.rect(this.pos.x, this.pos.y, this.w, this.h, this.color);
    r.alpha = 1;
  }
}
