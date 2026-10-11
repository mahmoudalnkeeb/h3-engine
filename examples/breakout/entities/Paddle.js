import { clamp, Entity } from '../../../src/index.js';
import { H, MOVE_LEFT, MOVE_RIGHT, W } from '../config.js';

export class Paddle extends Entity {
  constructor() {
    super({ x: W / 2 - 48, y: H - 40, w: 96, h: 12, z: 1, tags: ['paddle'] });
    this.baseW = 96;
    this.speed = 560;
    this._lastPointerX = -1;
  }

  update(dt, { input }) {
    const dir = input.axis(MOVE_LEFT, MOVE_RIGHT);
    const p = input.pointer;
    if (dir !== 0) this.pos.x += dir * this.speed * dt;
    else if (p.x !== this._lastPointerX && this._lastPointerX >= 0) this.pos.x = p.x - this.w / 2;
    this._lastPointerX = p.x;
    this.pos.x = clamp(this.pos.x, 0, W - this.w);
  }

  /** Animate to a new width, keeping the paddle centered. */
  resize(w) {
    let prev = this.w;
    this.scene.tween(this, { w }, 0.25, 'backOut', {
      onUpdate: () => {
        this.pos.x = clamp(this.pos.x - (this.w - prev) / 2, 0, W - this.w);
        prev = this.w;
      },
    });
  }

  render(r) {
    const { x, y } = this.pos;
    r.rect(x, y, this.w, this.h, '#c9c9ff');
    r.rect(x, y, this.w, 3, '#fff');
    r.rect(x + 4, y + this.h - 3, this.w - 8, 3, '#7a7ac2');
  }
}
