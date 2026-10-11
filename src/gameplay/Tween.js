import { Ease } from './Ease.js';

/**
 * @typedef {keyof typeof Ease | import('./Ease.js').EaseFn} EaseInput A name from {@link Ease} or a custom function.
 */

/**
 * @typedef {object} TweenOptions
 * @property {number} [delay=0] Seconds to wait before starting.
 * @property {(progress: number) => void} [onUpdate] Called every step with linear progress 0..1.
 * @property {() => void} [onComplete] Called once on completion; not called when cancelled.
 */

/** @returns {import('./Ease.js').EaseFn} */
const resolveEase = (ease) => {
  const fn = typeof ease === 'function' ? ease : Ease[ease];
  if (!fn) throw new Error(`Unknown ease "${ease}"`);
  return fn;
};

/**
 * Animates numeric properties of an object. Usually created with
 * {@link Scene#tween}. Start values are read when the tween starts (after
 * `delay`), so it picks up changes made in the meantime.
 *
 * Thenable: `await tween` resolves on completion or cancellation.
 */
export class Tween {
  /**
   * @param {object} target
   * @param {Record<string, number>} props End values.
   * @param {number} duration Seconds.
   * @param {EaseInput} [ease='linear']
   * @param {TweenOptions} [options]
   * @throws {Error} If `ease` names an unknown easing.
   */
  constructor(target, props, duration, ease = 'linear', { delay = 0, onUpdate, onComplete } = {}) {
    this.target = target;
    this.props = props;
    this.duration = duration;
    this.ease = resolveEase(ease);
    /** Seconds of delay remaining. */
    this.delay = delay;
    this.onUpdate = onUpdate;
    this.onComplete = onComplete;
    /** Seconds since the tween started, excluding delay. */
    this.elapsed = 0;
    /** True once completed or cancelled. */
    this.done = false;
    this._startValues = null;
    /** @type {Array<() => void>} */
    this._waiting = [];
  }

  /**
   * Advance by `dt`. The owning scene calls this.
   * @param {number} dt Seconds.
   * @returns {boolean} True when finished.
   */
  update(dt) {
    if (this.done) return true;
    const activeTime = this._consumeDelay(dt);
    if (activeTime === 0 && this.delay > 0) return false;

    this._startValues ??= this._captureStartValues();
    this.elapsed += activeTime;
    const progress = this.duration > 0 ? Math.min(this.elapsed / this.duration, 1) : 1;
    this._applyProgress(this.ease(progress));
    this.onUpdate?.(progress);
    if (progress >= 1) this._finish(true);
    return this.done;
  }

  /** Stop at the current values. Skips `onComplete` but releases awaiting code. */
  cancel() {
    if (!this.done) this._finish(false);
  }

  /**
   * @template T
   * @param {() => T} [onFulfilled]
   * @param {(reason: any) => T} [onRejected]
   * @returns {Promise<T>}
   */
  then(onFulfilled, onRejected) {
    /** @type {Promise<void>} */
    const finished = new Promise((resolve) => {
      if (this.done) resolve();
      else this._waiting.push(resolve);
    });
    return finished.then(onFulfilled, onRejected);
  }

  _consumeDelay(dt) {
    if (this.delay <= 0) return dt;
    this.delay -= dt;
    if (this.delay > 0) return 0;
    const leftover = -this.delay;
    this.delay = 0;
    return leftover;
  }

  _captureStartValues() {
    const start = {};
    for (const key in this.props) start[key] = this.target[key];
    return start;
  }

  _applyProgress(eased) {
    for (const key in this.props) {
      const from = this._startValues[key];
      this.target[key] = from + (this.props[key] - from) * eased;
    }
  }

  _finish(completed) {
    this.done = true;
    if (completed) this.onComplete?.();
    for (const resolve of this._waiting) resolve();
    this._waiting.length = 0;
  }
}
