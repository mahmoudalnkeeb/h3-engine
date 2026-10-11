import { removeWhere } from '../util/array.js';

/**
 * @typedef {object} TimerHandle
 * @property {() => void} cancel Stop the timer. Safe to call after it fired.
 * @property {boolean} done True once fired (for `after`) or cancelled.
 */

const FLOAT_TOLERANCE = 1e-9;

/**
 * Delayed and repeating callbacks driven by game time. Each scene owns one as
 * `scene.timer`, so timers pause with the game and end with the scene.
 */
export class Timer {
  constructor() {
    this._items = [];
  }

  /**
   * @param {number} seconds
   * @param {() => void} fn
   * @returns {TimerHandle}
   */
  after(seconds, fn) {
    return this._schedule(seconds, fn, false);
  }

  /**
   * Repeat every `seconds`. After a long step it fires once per missed interval.
   * @param {number} seconds
   * @param {() => void} fn
   * @returns {TimerHandle}
   * @throws {Error} If `seconds` isn't positive.
   */
  every(seconds, fn) {
    if (!(seconds > 0)) throw new Error('Timer.every needs a positive interval');
    return this._schedule(seconds, fn, true);
  }

  /**
   * Advance all timers. Timers created by callbacks start counting on the next call.
   * @param {number} dt Seconds.
   */
  update(dt) {
    const items = this._items;
    const countBeforeCallbacks = items.length;
    for (let i = 0; i < countBeforeCallbacks; i++) this._advance(items[i], dt);
    removeWhere(items, (item) => item.done);
  }

  /** Cancel every pending timer. */
  clear() {
    for (const item of this._items) item.done = true;
    this._items.length = 0;
  }

  /** Number of pending timers. @type {number} */
  get size() {
    return this._items.filter((item) => !item.done).length;
  }

  _schedule(seconds, fn, repeat) {
    const item = {
      interval: seconds,
      timeLeft: seconds,
      fn,
      repeat,
      done: false,
      cancel() {
        item.done = true;
      },
    };
    this._items.push(item);
    return item;
  }

  _advance(item, dt) {
    if (item.done) return;
    item.timeLeft -= dt;
    while (!item.done && item.timeLeft <= FLOAT_TOLERANCE) {
      if (item.repeat) item.timeLeft += item.interval;
      else item.done = true;
      item.fn();
    }
  }
}
