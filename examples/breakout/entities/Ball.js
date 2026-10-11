import { Collision, clamp, Entity, rand } from '../../../src/index.js';
import { sfx } from '../audio.js';
import { H, MAX_SPEED, TOP, W } from '../config.js';

export class Ball extends Entity {
  constructor(speed) {
    super({ w: 10, h: 10, z: 2, shape: 'circle', tags: ['ball'] });
    this.speed = speed;
    this.stuck = true;
  }

  launch(angle = -Math.PI / 2 + rand(-0.5, 0.5)) {
    this.stuck = false;
    this.vel.set(Math.cos(angle) * this.speed, Math.sin(angle) * this.speed);
  }

  update(dt, { audio }) {
    const scene = /** @type {any} */ (this.scene);
    if (this.stuck) {
      const paddle = scene.paddle;
      this.pos.set(paddle.cx - this.w / 2, paddle.pos.y - this.h - 1);
      return;
    }
    // Two substeps keep fast balls from skipping through thin bricks.
    for (let i = 0; i < 2; i++) {
      this.pos.addScaled(this.vel, dt / 2);
      if (this._collide(scene, audio)) return;
    }
  }

  /** @returns {boolean} true if the ball was lost */
  _collide(scene, audio) {
    const { pos, vel } = this;
    if (pos.x < 0) {
      pos.x = 0;
      vel.x = Math.abs(vel.x);
      sfx(audio, 'wall');
    } else if (pos.x > W - this.w) {
      pos.x = W - this.w;
      vel.x = -Math.abs(vel.x);
      sfx(audio, 'wall');
    }
    if (pos.y < TOP) {
      pos.y = TOP;
      vel.y = Math.abs(vel.y);
      sfx(audio, 'wall');
    }
    if (pos.y > H) {
      this.destroy();
      scene.ballLost();
      return true;
    }

    const paddle = scene.paddle;
    if (vel.y > 0 && Collision.overlaps(this, paddle)) {
      // Where it hits the paddle sets the bounce angle: center goes straight up.
      const offset = clamp((this.cx - paddle.cx) / (paddle.w / 2), -1, 1);
      const angle = -Math.PI / 2 + offset * 1.05;
      vel.set(Math.cos(angle) * this.speed, Math.sin(angle) * this.speed);
      pos.y = paddle.pos.y - this.h;
      sfx(audio, 'paddle');
      return false;
    }

    for (const brick of scene.entities) {
      if (brick.dead || !brick.has('brick') || !Collision.overlaps(this, brick)) continue;
      const side = Collision.resolve(this, brick);
      if (side === 'top') vel.y = -Math.abs(vel.y);
      else if (side === 'bottom') vel.y = Math.abs(vel.y);
      else if (side === 'left') vel.x = -Math.abs(vel.x);
      else if (side === 'right') vel.x = Math.abs(vel.x);
      this.speed = Math.min(this.speed * 1.012, MAX_SPEED);
      vel.normalize().scale(this.speed);
      scene.brickHit(brick);
      break; // one brick per substep, so seams between bricks don't double-bounce
    }
    return false;
  }

  render(r) {
    r.circle(this.cx, this.cy, this.radius, '#fff');
  }
}
