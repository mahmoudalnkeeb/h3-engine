/** @typedef {{ x: number, y: number }} Point */

/** Mutable 2D vector. Methods modify the vector in place and return it for chaining. */
export class Vec2 {
  /**
   * @param {number} [x=0]
   * @param {number} [y=0]
   */
  constructor(x = 0, y = 0) {
    this.x = x;
    this.y = y;
  }

  /**
   * @param {number} radians
   * @param {number} [length=1]
   * @returns {Vec2}
   */
  static fromAngle(radians, length = 1) {
    return new Vec2(Math.cos(radians) * length, Math.sin(radians) * length);
  }

  /**
   * @param {number} x
   * @param {number} y
   * @returns {this}
   */
  set(x, y) {
    this.x = x;
    this.y = y;
    return this;
  }

  /**
   * @param {Point} other
   * @returns {this}
   */
  copy(other) {
    return this.set(other.x, other.y);
  }

  /** @returns {Vec2} A new vector with the same components. */
  clone() {
    return new Vec2(this.x, this.y);
  }

  /**
   * @param {Point} other
   * @returns {this}
   */
  add(other) {
    return this.set(this.x + other.x, this.y + other.y);
  }

  /**
   * @param {Point} other
   * @returns {this}
   */
  sub(other) {
    return this.set(this.x - other.x, this.y - other.y);
  }

  /**
   * Add `other * scale`, e.g. `pos.addScaled(vel, dt)`.
   * @param {Point} other
   * @param {number} scale
   * @returns {this}
   */
  addScaled(other, scale) {
    return this.set(this.x + other.x * scale, this.y + other.y * scale);
  }

  /**
   * @param {number} factor
   * @returns {this}
   */
  scale(factor) {
    return this.set(this.x * factor, this.y * factor);
  }

  /** @returns {number} */
  len() {
    return Math.hypot(this.x, this.y);
  }

  /** @returns {number} Squared length; cheaper than `len()` for comparisons. */
  lenSq() {
    return this.x * this.x + this.y * this.y;
  }

  /** Scale to length 1. A zero vector stays zero. @returns {this} */
  normalize() {
    const length = this.len();
    return length > 0 ? this.scale(1 / length) : this;
  }

  /**
   * Shorten to `max` if longer; direction is kept.
   * @param {number} max
   * @returns {this}
   */
  limit(max) {
    const length = this.len();
    return length > max ? this.scale(max / length) : this;
  }

  /**
   * @param {number} radians Clockwise on screen, since +y points down.
   * @returns {this}
   */
  rotate(radians) {
    const cos = Math.cos(radians);
    const sin = Math.sin(radians);
    return this.set(this.x * cos - this.y * sin, this.x * sin + this.y * cos);
  }

  /**
   * @param {Point} other
   * @returns {number}
   */
  dot(other) {
    return this.x * other.x + this.y * other.y;
  }

  /**
   * @param {Point} other
   * @returns {number}
   */
  dist(other) {
    return Math.hypot(other.x - this.x, other.y - this.y);
  }

  /** @returns {number} Radians from the +x axis. */
  angle() {
    return Math.atan2(this.y, this.x);
  }
}
