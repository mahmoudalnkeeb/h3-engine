import { Entity, rand } from '../../../src/index.js';

export class Particle extends Entity {
  constructor() {
    super({ w: 2, h: 2, z: 6, tags: ['fx'] });
    // Sparks are decoration, so keep them out of the debug overlay.
    this.debug = false;
    this.life = 0;
    this.maxLife = 1;
    this.color = '#fff';
    this.gravity = 0;
    /** @type {import('../../../src/index.js').Pool<Particle> | null} */
    this.pool = null;
  }

  spawn(x, y, color, pool, { speed = 80, up = 60, gravity = 300 } = {}) {
    this.pos.set(x, y);
    this.vel.set(rand(-speed, speed), rand(-speed - up, speed - up));
    this.life = this.maxLife = rand(0.3, 0.6);
    this.color = color;
    this.gravity = gravity;
    this.pool = pool;
    return this;
  }

  update(dt) {
    this.vel.y += this.gravity * dt;
    super.update(dt);
    this.life -= dt;
    if (this.life <= 0) {
      this.destroy();
      this.pool?.release(this);
    }
  }

  render(r) {
    r.alpha = this.life / this.maxLife;
    r.rect(Math.round(this.pos.x), Math.round(this.pos.y), 2, 2, this.color);
    r.alpha = 1;
  }
}
