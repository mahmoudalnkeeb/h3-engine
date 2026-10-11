import { approach, Entity, rand } from '../../src/index.js';
import { T } from './Level.js';

export const W = 320;
export const H = 180;

const LEFT = ['ArrowLeft', 'KeyA'];
const RIGHT = ['ArrowRight', 'KeyD'];
export const JUMP = ['Space', 'ArrowUp', 'KeyW', 'KeyZ'];

const RUN_SPEED = 110;
const ACCEL_GROUND = 1000;
const ACCEL_AIR = 650;
const FRICTION = 1400;
const GRAVITY = 900;
const JUMP_SPEED = 320;
const MAX_FALL = 420;
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

  update(dt, { input }) {
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
      scene.sfx('jump');
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
    if (this.onGround) r.line(this.pos.x, this.pos.y + this.h, this.pos.x + this.w, this.pos.y + this.h, '#0ff', lineWidth);
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

export class Particle extends Entity {
  constructor() {
    super({ w: 2, h: 2, z: 6, tags: ['fx'] });
    // Sparks are decoration, so keep them out of the debug overlay.
    this.debug = false;
    this.life = 0;
    this.maxLife = 1;
    this.color = '#fff';
    this.gravity = 0;
    /** @type {import('../../src/index.js').Pool<Particle> | null} */
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

// Cheap deterministic noise so parallax scenery doesn't flicker between frames.
const hash = (i) => {
  const s = Math.sin(i * 127.1) * 43758.5453;
  return s - Math.floor(s);
};

/** Sky decoration drawn behind the level with parallax. */
export class Backdrop extends Entity {
  constructor() {
    super({ z: -10 });
  }

  render(r) {
    const view = /** @type {any} */ (this.scene).camera.view;
    this._layer(view, 0.1, 90, (wx, i) => {
      const y = view.y + 20 + hash(i) * 40;
      r.rect(Math.round(wx), Math.round(y), 28, 6, '#ffffff');
      r.rect(Math.round(wx + 6), Math.round(y - 4), 14, 4, '#ffffff');
    });
    this._layer(view, 0.3, 70, (wx, i) => {
      const radius = 40 + hash(i) * 30;
      r.circle(Math.round(wx), Math.round(view.y + H + 10), radius, '#8fd3a8');
    });
    this._layer(view, 0.5, 50, (wx, i) => {
      const radius = 22 + hash(i + 50) * 22;
      r.circle(Math.round(wx), Math.round(view.y + H + 14), radius, '#5fb87f');
    });
  }

  /**
   * Repeat a feature every `spacing` pixels on a layer that scrolls at `factor`
   * times the camera speed (0 = fixed to the screen, 1 = moves with the world).
   */
  _layer(view, factor, spacing, draw) {
    const offset = view.x * factor;
    const first = Math.floor(offset / spacing) - 2;
    const last = Math.ceil((offset + view.w) / spacing) + 2;
    for (let i = first; i <= last; i++) draw(view.x + i * spacing - offset, i);
  }
}
