import { Entity, rand } from '../../../src/index.js';
import { GRAVITY, MAX_FALL } from '../config.js';

export class Slime extends Entity {
  constructor(x, y) {
    super({ x: x + 1, y: y + 6, w: 14, h: 10, z: 4, tags: ['enemy'] });
    this.dir = -1;
    this.speed = 30;
    this.t = rand(0, 6);
  }

  update(dt) {
    const level = /** @type {any} */ (this.scene).level;
    this.t += dt;
    this.vel.x = this.dir * this.speed;
    this.vel.y = Math.min(this.vel.y + GRAVITY * dt, MAX_FALL);
    const hit = level.moveAndCollide(this, dt);
    if (hit.wall || (hit.ground && !level.groundAhead(this, this.dir))) this.dir = -this.dir;
    if (this.pos.y > level.h) this.destroy();
  }

  render(r) {
    const squish = Math.round(Math.sin(this.t * 8));
    const x = Math.round(this.pos.x) - squish;
    const y = Math.round(this.pos.y) + squish + 1;
    const w = this.w + squish * 2;
    const h = this.h - squish - 1;
    r.rect(x + 2, y, w - 4, 2, '#7bd389');
    r.rect(x, y + 2, w, h - 2, '#7bd389');
    r.rect(x, y + h - 2, w, 2, '#4fa865');
    const ex = x + (this.dir < 0 ? 2 : w - 8);
    r.rect(ex, y + 3, 2, 3, '#fff');
    r.rect(ex + 4, y + 3, 2, 3, '#fff');
    r.rect(ex + (this.dir < 0 ? 0 : 1), y + 4, 1, 2, '#1d3b26');
    r.rect(ex + 4 + (this.dir < 0 ? 0 : 1), y + 4, 1, 2, '#1d3b26');
  }
}
