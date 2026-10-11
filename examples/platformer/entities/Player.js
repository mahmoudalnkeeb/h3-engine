import { approach, Entity } from '../../../src/index.js';
import { sfx } from '../audio.js';
import { GRAVITY, JUMP, LEFT, MAX_FALL, RIGHT } from '../config.js';

const RUN_SPEED = 110;
const ACCEL_GROUND = 1000;
const ACCEL_AIR = 650;
const FRICTION = 1400;
const JUMP_SPEED = 320;
/** Grace period after walking off a ledge during which a jump still works. */
const COYOTE_TIME = 0.08;
/** A jump pressed this long before landing still fires on landing. */
const JUMP_BUFFER = 0.12;

export class Player extends Entity {
  constructor(x, y) {
    super({ x: x + 2, y: y + 2, w: 12, h: 14, z: 5, tags: ['player'] });
    this.onGround = false;
    this.coyote = 0;
    this.buffer = 0;
    this.facing = 1;
    this.alive = true;
    /** Reached the goal: input is ignored and the player coasts to a stop. */
    this.won = false;
    // Squash and stretch, eased back to 1.
    this.sx = 1;
    this.sy = 1;
    this.walkTime = 0;
  }

  update(dt, { input, audio }) {
    const scene = /** @type {any} */ (this.scene);
    if (!this.alive) {
      this.vel.y += GRAVITY * dt;
      super.update(dt);
      return;
    }

    const dir = this.won ? 0 : input.axis(LEFT, RIGHT);
    if (dir !== 0) this.facing = dir;
    const accel = dir !== 0 ? (this.onGround ? ACCEL_GROUND : ACCEL_AIR) : this.onGround ? FRICTION : ACCEL_AIR / 2;
    this.vel.x = approach(this.vel.x, dir * RUN_SPEED, accel * dt);

    this.coyote = this.onGround ? COYOTE_TIME : this.coyote - dt;
    this.buffer = !this.won && input.justPressed(JUMP) ? JUMP_BUFFER : this.buffer - dt;
    if (this.buffer > 0 && this.coyote > 0) {
      this.jump(JUMP_SPEED);
      sfx(audio, 'jump');
    }
    // Releasing jump early cuts the jump short.
    const cut = this.vel.y < 0 && !input.isDown(JUMP);
    this.vel.y = Math.min(this.vel.y + GRAVITY * (cut ? 2.5 : 1) * dt, MAX_FALL);

    const wasOnGround = this.onGround;
    const landingSpeed = this.vel.y;
    this.onGround = scene.level.moveAndCollide(this, dt).ground;
    if (this.onGround && !wasOnGround && landingSpeed > 150) {
      this.sx = 1.3;
      this.sy = 0.7;
    }
    this.sx = approach(this.sx, 1, dt * 3);
    this.sy = approach(this.sy, 1, dt * 3);
    this.walkTime = this.onGround && Math.abs(this.vel.x) > 10 ? this.walkTime + dt : 0;

    if (scene.level.touchesSpikes(this) || this.pos.y > scene.level.h + 32) scene.playerDie();
  }

  jump(speed) {
    this.vel.y = -speed;
    this.buffer = 0;
    this.coyote = 0;
    this.onGround = false;
    this.sx = 0.75;
    this.sy = 1.3;
  }

  drawDebug(r, color, lineWidth) {
    super.drawDebug(r, color, lineWidth);
    // Velocity, scaled down so a full-speed run is about one tile long.
    r.line(this.cx, this.cy, this.cx + this.vel.x * 0.1, this.cy + this.vel.y * 0.1, '#ff0', lineWidth);
    if (this.onGround)
      r.line(this.pos.x, this.pos.y + this.h, this.pos.x + this.w, this.pos.y + this.h, '#0ff', lineWidth);
  }

  render(r) {
    const w = Math.round(this.w * this.sx);
    const h = Math.round(this.h * this.sy);
    const x = Math.round(this.cx - w / 2);
    const y = Math.round(this.pos.y + this.h - h);
    const bob = Math.floor(this.walkTime * 12) % 2;
    r.rect(x, y + bob, w, h - bob, this.alive ? '#ff5e5b' : '#a04848');
    r.rect(x, y + bob, w, 3, '#ff9b98');
    const ex = Math.round(this.cx + this.facing * 2) - 3;
    const ey = y + bob + 4;
    if (this.alive) {
      r.rect(ex, ey, 2, 4, '#fff');
      r.rect(ex + 4, ey, 2, 4, '#fff');
      r.rect(ex + (this.facing > 0 ? 1 : 0), ey + 1, 1, 2, '#222');
      r.rect(ex + 4 + (this.facing > 0 ? 1 : 0), ey + 1, 1, 2, '#222');
    } else {
      r.rect(ex, ey + 1, 2, 1, '#222');
      r.rect(ex + 4, ey + 1, 2, 1, '#222');
    }
  }
}
