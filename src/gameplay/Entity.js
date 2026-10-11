import { Rect } from '../util/Rect.js';
import { Vec2 } from '../util/Vec2.js';

/**
 * @typedef {object} EntityOptions
 * @property {number} [x=0] Left edge in world pixels.
 * @property {number} [y=0] Top edge in world pixels.
 * @property {number} [w=0] Hitbox width.
 * @property {number} [h=0] Hitbox height.
 * @property {number} [z=0] Draw order; higher draws on top.
 * @property {string[]} [tags=[]]
 * @property {'rect' | 'circle'} [shape='rect'] Hitbox shape used by {@link Collision.overlaps}.
 * @property {number} [radius] Circle radius. Defaults to half the smaller side.
 */

/**
 * Base class for anything placed in a scene. Override `update` and `render`;
 * optionally define `onAdd(scene)`, `onRemove(scene)` and `onCollide(other)`.
 *
 * The default `update` moves `pos` by `vel * dt`. Call `super.update(dt)`
 * from an override to keep that.
 */
export class Entity {
  /** @param {EntityOptions} [options] */
  constructor({ x = 0, y = 0, w = 0, h = 0, z = 0, tags = [], shape = 'rect', radius } = {}) {
    /** Top-left corner of the hitbox, in world pixels. */
    this.pos = new Vec2(x, y);
    /** Pixels per second. */
    this.vel = new Vec2();
    this.w = w;
    this.h = h;
    /** Radians. Not applied automatically; use it in `render`. Doesn't rotate the hitbox. */
    this.rotation = 0;
    this.shape = shape;
    this.radius = radius ?? Math.min(w, h) / 2;
    /** When false, `render` is skipped. */
    this.visible = true;
    /** When false, `update` and collision checks are skipped; the entity still draws. */
    this.active = true;
    /** @type {Set<string>} */
    this.tags = new Set(tags);
    /** True from the moment {@link Entity#destroy} is called. */
    this.dead = false;
    /** Owning scene, or null when not in one. @type {import('../core/Scene.js').Scene | null} */
    this.scene = null;
    this._z = z;
    this._live = false;
    this._bounds = new Rect();
  }

  /** Draw order; higher draws on top. Equal values draw in insertion order. */
  get z() {
    return this._z;
  }

  set z(value) {
    if (value === this._z) return;
    this._z = value;
    if (this.scene) this.scene._sortDirty = true;
  }

  /**
   * @param {string} tag
   * @returns {boolean}
   */
  has(tag) {
    return this.tags.has(tag);
  }

  /**
   * @param {string} tag
   * @returns {this}
   */
  tag(tag) {
    this.tags.add(tag);
    return this;
  }

  /**
   * @param {string} tag
   * @returns {this}
   */
  untag(tag) {
    this.tags.delete(tag);
    return this;
  }

  /** Hitbox in world space. Returns the same object on every read. @type {Rect} */
  get bounds() {
    return this._bounds.set(this.pos.x, this.pos.y, this.w, this.h);
  }

  /** Hitbox center x. @type {number} */
  get cx() {
    return this.pos.x + this.w / 2;
  }

  /** Hitbox center y. @type {number} */
  get cy() {
    return this.pos.y + this.h / 2;
  }

  /**
   * Called every fixed step while active.
   * @param {number} dt Seconds.
   * @param {import('../core/Game.js').GameContext} [_ctx]
   */
  update(dt, _ctx) {
    this.pos.addScaled(this.vel, dt);
  }

  /**
   * Called every frame while visible, in world space.
   * @param {import('../render/Renderer.js').Renderer} _r
   * @param {number} [_alpha]
   */
  render(_r, _alpha) {}

  /** Mark dead now; leave the scene at the end of the current step. Safe to call twice. */
  destroy() {
    if (this.dead) return;
    this.dead = true;
    this.scene?.remove(this);
  }
}
