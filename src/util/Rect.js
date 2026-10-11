/** Axis-aligned rectangle; `x`, `y` is the top-left corner. */
export class Rect {
  /**
   * @param {number} [x=0]
   * @param {number} [y=0]
   * @param {number} [w=0]
   * @param {number} [h=0]
   */
  constructor(x = 0, y = 0, w = 0, h = 0) {
    /** @type {number} */
    this.x = x;
    /** @type {number} */
    this.y = y;
    /** @type {number} */
    this.w = w;
    /** @type {number} */
    this.h = h;
  }

  /**
   * @param {number} x
   * @param {number} y
   * @param {number} w
   * @param {number} h
   * @returns {this}
   */
  set(x, y, w, h) {
    this.x = x;
    this.y = y;
    this.w = w;
    this.h = h;
    return this;
  }

  /** @type {number} */
  get right() {
    return this.x + this.w;
  }

  /** @type {number} */
  get bottom() {
    return this.y + this.h;
  }

  /** @type {number} */
  get cx() {
    return this.x + this.w / 2;
  }

  /** @type {number} */
  get cy() {
    return this.y + this.h / 2;
  }

  /**
   * Right and bottom edges are exclusive.
   * @param {number} px
   * @param {number} py
   * @returns {boolean}
   */
  contains(px, py) {
    return px >= this.x && px < this.right && py >= this.y && py < this.bottom;
  }

  /**
   * Touching edges don't count as intersecting.
   * @param {{ x: number, y: number, w: number, h: number }} other
   * @returns {boolean}
   */
  intersects(other) {
    return this.x < other.x + other.w && this.right > other.x && this.y < other.y + other.h && this.bottom > other.y;
  }
}
