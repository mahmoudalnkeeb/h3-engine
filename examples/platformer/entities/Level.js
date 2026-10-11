import { Collision, Entity, Rect } from '../../../src/index.js';
import { T } from '../config.js';

const SPAWN_CHARS = 'PeoF';

/**
 * Tile grid built from an ASCII map. Draws the visible tiles and moves
 * entities through them with per-axis collision.
 */
export class Level extends Entity {
  /** @param {string[]} map */
  constructor(map) {
    const cols = Math.max(...map.map((row) => row.length));
    super({ w: cols * T, h: map.length * T, z: 0 });
    this.cols = cols;
    this.rows = map.length;
    /** Entities to create: `{ ch, x, y }` in pixels. */
    this.spawns = [];
    this.grid = map.map((line, r) =>
      [...line.padEnd(cols, '.')].map((ch, c) => {
        if (SPAWN_CHARS.includes(ch)) {
          this.spawns.push({ ch, x: c * T, y: r * T });
          return '.';
        }
        return ch;
      }),
    );
    this._tile = new Rect();
    this._hit = { wall: '', ground: false, ceiling: false };
  }

  /** Tile at a grid cell. The left and right edges act as walls; above and below are open. */
  at(c, r) {
    if (c < 0 || c >= this.cols) return '#';
    if (r < 0 || r >= this.rows) return '.';
    return this.grid[r][c];
  }

  isSolid(c, r) {
    const t = this.at(c, r);
    return t === '#' || t === 'B';
  }

  /**
   * Move an entity by its velocity, X then Y, pushing it out of tiles.
   * Returns a shared result: `wall` ('left' | 'right' | ''), `ground`, `ceiling`.
   * @param {Entity} e
   */
  moveAndCollide(e, dt) {
    const hit = this._hit;
    hit.wall = '';
    hit.ground = hit.ceiling = false;
    e.pos.x += e.vel.x * dt;
    this._collide(e, 'x', 0);
    const prevBottom = e.pos.y + e.h;
    e.pos.y += e.vel.y * dt;
    this._collide(e, 'y', prevBottom);
    return hit;
  }

  _collide(e, axis, prevBottom) {
    const hit = this._hit;
    const c0 = Math.floor(e.pos.x / T);
    const c1 = Math.floor((e.pos.x + e.w - 0.001) / T);
    const r0 = Math.floor(e.pos.y / T);
    const r1 = Math.floor((e.pos.y + e.h - 0.001) / T);
    for (let r = r0; r <= r1; r++) {
      for (let c = c0; c <= c1; c++) {
        const t = this.at(c, r);
        let solid = t === '#' || t === 'B';
        // One-way platforms only stop things falling onto them from above.
        if (t === '-' && axis === 'y' && e.vel.y >= 0 && prevBottom <= r * T + 0.01) solid = true;
        if (!solid) continue;
        const side = Collision.resolve(e, this._tile.set(c * T, r * T, T, T), axis);
        if (!side) continue;
        if (axis === 'x') {
          e.vel.x = 0;
          hit.wall = side;
        } else if (side === 'top') {
          e.vel.y = 0;
          hit.ground = true;
        } else {
          if (e.vel.y < 0) e.vel.y = 0;
          hit.ceiling = true;
        }
      }
    }
  }

  /** Is there something to stand on just ahead of the entity's front foot? */
  groundAhead(e, dir) {
    const c = Math.floor((dir > 0 ? e.pos.x + e.w + 1 : e.pos.x - 1) / T);
    const r = Math.floor((e.pos.y + e.h + 1) / T);
    return this.isSolid(c, r) || this.at(c, r) === '-';
  }

  /** Is the entity touching spikes? Only the lower half of a spike tile hurts. */
  touchesSpikes(e) {
    const c0 = Math.floor(e.pos.x / T);
    const c1 = Math.floor((e.pos.x + e.w - 0.001) / T);
    const r0 = Math.floor(e.pos.y / T);
    const r1 = Math.floor((e.pos.y + e.h - 0.001) / T);
    for (let r = r0; r <= r1; r++) {
      for (let c = c0; c <= c1; c++) {
        if (this.at(c, r) === '^' && e.pos.y + e.h > r * T + T / 2) return true;
      }
    }
    return false;
  }

  render(r) {
    const view = /** @type {any} */ (this.scene).camera.view;
    const c0 = Math.max(0, Math.floor(view.x / T));
    const c1 = Math.min(this.cols - 1, Math.floor((view.x + view.w) / T));
    const r0 = Math.max(0, Math.floor(view.y / T));
    const r1 = Math.min(this.rows - 1, Math.floor((view.y + view.h) / T));
    for (let row = r0; row <= r1; row++) {
      for (let col = c0; col <= c1; col++) {
        const t = this.grid[row][col];
        if (t !== '.') this._drawTile(r, t, col, row);
      }
    }
  }

  _drawTile(r, t, col, row) {
    const x = col * T;
    const y = row * T;
    if (t === '#') {
      r.rect(x, y, T, T, '#8b5a2b');
      if ((col * 7 + row * 13) % 5 === 0) r.rect(x + 4, y + 9, 2, 2, '#6e4520');
      if ((col * 11 + row * 5) % 7 === 0) r.rect(x + 11, y + 4, 2, 2, '#a06b38');
      if (this.at(col, row - 1) !== '#') {
        r.rect(x, y, T, 4, '#5ec44a');
        r.rect(x, y + 4, T, 2, '#3e9a33');
      }
    } else if (t === 'B') {
      r.rect(x, y, T, T, '#d9822b');
      r.rect(x, y + 7, T, 1, '#a35a14');
      r.rect(x, y + 15, T, 1, '#a35a14');
      r.rect(x + 7, y, 1, 7, '#a35a14');
      r.rect(x + 3, y + 8, 1, 7, '#a35a14');
      r.rect(x + 11, y + 8, 1, 7, '#a35a14');
      r.rect(x, y, T, 1, '#f0a050');
    } else if (t === '-') {
      r.rect(x, y, T, 4, '#c08a4b');
      r.rect(x, y + 4, T, 2, '#8a5a2a');
      r.rect(x + 7, y + 6, 2, 3, '#8a5a2a');
    } else if (t === '^') {
      r.poly([x, y + T, x + 4, y + 7, x + 8, y + T], '#dcdce6');
      r.poly([x + 8, y + T, x + 12, y + 7, x + 16, y + T], '#b4b4c2');
    }
  }
}
