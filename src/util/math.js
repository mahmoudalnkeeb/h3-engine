/**
 * @param {number} value
 * @param {number} min
 * @param {number} max
 * @returns {number}
 */
export const clamp = (value, min, max) => (value < min ? min : value > max ? max : value);

/**
 * @param {number} from
 * @param {number} to
 * @param {number} t 0 gives `from`, 1 gives `to`. Not clamped.
 * @returns {number}
 */
export const lerp = (from, to, t) => from + (to - from) * t;

/**
 * @param {number} [min=0]
 * @param {number} [max=1]
 * @returns {number} Float in `[min, max)`.
 */
export const rand = (min = 0, max = 1) => min + Math.random() * (max - min);

/**
 * @param {number} min
 * @param {number} max
 * @returns {number} Integer in `[min, max]`, both inclusive.
 */
export const randInt = (min, max) => Math.floor(min + Math.random() * (max - min + 1));

/**
 * @template T
 * @param {T[]} list
 * @returns {T} A random element; undefined for an empty list.
 */
export const pick = (list) => list[Math.floor(Math.random() * list.length)];

/**
 * @param {number} x1
 * @param {number} y1
 * @param {number} x2
 * @param {number} y2
 * @returns {number} Radians from (x1, y1) toward (x2, y2).
 */
export const angle = (x1, y1, x2, y2) => Math.atan2(y2 - y1, x2 - x1);

/**
 * @param {number} x1
 * @param {number} y1
 * @param {number} x2
 * @param {number} y2
 * @returns {number} Distance between (x1, y1) and (x2, y2).
 */
export const dist = (x1, y1, x2, y2) => Math.hypot(x2 - x1, y2 - y1);

/**
 * Move `value` toward `target` by at most `step`, without overshooting.
 * Frame-rate independent when `step` is a rate times `dt`.
 * @param {number} value
 * @param {number} target
 * @param {number} step Positive.
 * @returns {number}
 * @example
 * vel.x = approach(vel.x, 0, FRICTION * dt);
 */
export const approach = (value, target, step) =>
  value < target ? Math.min(value + step, target) : Math.max(value - step, target);
