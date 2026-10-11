import { Collision, clamp, Entity, rand } from '../../src/index.js';

export const W = 640;
export const H = 480;
/** Top of the playfield; the HUD sits above it. */
export const TOP = 32;
export const MAX_SPEED = 620;
export const ROW_COLORS = ['#f25f5c', '#ff9f43', '#ffd166', '#7bd389', '#4cc9f0', '#9b5de5', '#f15bb5'];

const MOVE_LEFT = ['ArrowLeft', 'KeyA'];
const MOVE_RIGHT = ['ArrowRight', 'KeyD'];

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

  update(dt) {
    const scene = /** @type {any} */ (this.scene);
    if (this.stuck) {
      const paddle = scene.paddle;
      this.pos.set(paddle.cx - this.w / 2, paddle.pos.y - this.h - 1);
      return;
    }
    // Two substeps keep fast balls from skipping through thin bricks.
    for (let i = 0; i < 2; i++) {
      this.pos.addScaled(this.vel, dt / 2);
      if (this._collide(scene)) return;
    }
  }

  /** @returns {boolean} true if the ball was lost */
  _collide(scene) {
    const { pos, vel } = this;
    if (pos.x < 0) {
      pos.x = 0;
      vel.x = Math.abs(vel.x);
      scene.sfx('wall');
    } else if (pos.x > W - this.w) {
      pos.x = W - this.w;
      vel.x = -Math.abs(vel.x);
      scene.sfx('wall');
    }
    if (pos.y < TOP) {
      pos.y = TOP;
      vel.y = Math.abs(vel.y);
      scene.sfx('wall');
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
      scene.sfx('paddle');
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

export class Particle extends Entity {
  constructor() {
    super({ w: 4, h: 4, z: 3 });
    this.life = 0;
    this.maxLife = 1;
    this.color = '#fff';
    /** @type {import('../../src/index.js').Pool<Particle> | null} */
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
