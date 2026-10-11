/**
 * @typedef {object} AnimationDef
 * @property {number[]} frames Frame indexes in the sprite sheet, in play order.
 * @property {number} [fps=10]
 * @property {boolean} [loop=true] When false, stops on the last frame and calls `onComplete`.
 */

const DEFAULT_FPS = 10;

/**
 * Named frame sequences over a {@link SpriteSheet}. Starts playing the first definition.
 *
 * @example
 * const anim = new Animation(sheet, {
 *   idle: { frames: [0, 1], fps: 4 },
 *   die: { frames: [6, 7, 8], fps: 8, loop: false },
 * });
 * anim.play('die');
 * anim.update(dt);
 * r.sprite(anim.current, x, y);
 */
export class Animation {
  /**
   * @param {import('./SpriteSheet.js').SpriteSheet} sheet
   * @param {Record<string, AnimationDef>} defs
   */
  constructor(sheet, defs) {
    this.sheet = sheet;
    this.defs = defs;
    /** Name of the playing animation. */
    this.name = '';
    /** Position within the current definition's `frames`. */
    this.index = 0;
    this.time = 0;
    /** True once a non-looping animation reaches its last frame. */
    this.done = false;
    /** @type {((name: string) => void) | null} */
    this.onComplete = null;
    const firstName = Object.keys(defs)[0];
    if (firstName) this.play(firstName);
  }

  /**
   * Switch animations. Safe to call every update: does nothing if `name` is already playing.
   * @param {string} name
   * @param {boolean} [restart=false] Start over even if `name` is already playing.
   * @returns {this}
   * @throws {Error} If `name` isn't defined.
   */
  play(name, restart = false) {
    if (!this.defs[name]) throw new Error(`Unknown animation "${name}"`);
    if (name === this.name && !restart) return this;
    this.name = name;
    this.index = 0;
    this.time = 0;
    this.done = false;
    return this;
  }

  /** @param {number} dt Seconds. */
  update(dt) {
    const def = this.defs[this.name];
    if (!def || this.done) return;
    const frameDuration = 1 / (def.fps ?? DEFAULT_FPS);
    this.time += dt;
    while (this.time >= frameDuration && !this.done) {
      this.time -= frameDuration;
      this._advance(def);
    }
  }

  /** Sheet frame index currently showing. @type {number} */
  get frame() {
    return this.defs[this.name].frames[this.index];
  }

  /** Sprite currently showing. @type {import('./Sprite.js').Sprite} */
  get current() {
    return this.sheet.frame(this.frame);
  }

  _advance(def) {
    const isLastFrame = this.index === def.frames.length - 1;
    if (!isLastFrame) {
      this.index++;
    } else if (def.loop ?? true) {
      this.index = 0;
    } else {
      this.done = true;
      this.time = 0;
      this.onComplete?.(this.name);
    }
  }
}
