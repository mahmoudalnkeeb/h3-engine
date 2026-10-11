/** @typedef {(t: number) => number} EaseFn Maps progress 0..1 to eased progress; may overshoot. */

const BACK_OVERSHOOT = 1.70158;
const BOUNCE_STRENGTH = 7.5625;
const BOUNCE_DIVISOR = 2.75;

/** @type {EaseFn} */
const bounceOut = (t) => {
  const n = BOUNCE_STRENGTH;
  const d = BOUNCE_DIVISOR;
  if (t < 1 / d) return n * t * t;
  if (t < 2 / d) return n * (t - 1.5 / d) ** 2 + 0.75;
  if (t < 2.5 / d) return n * (t - 2.25 / d) ** 2 + 0.9375;
  return n * (t - 2.625 / d) ** 2 + 0.984375;
};

/**
 * Easing functions for tweens. `In` starts slow, `Out` ends slow, `InOut` does both.
 * `backOut` overshoots then settles; `elasticOut` and `bounceOut` oscillate at the end.
 * @type {Record<'linear' | 'quadIn' | 'quadOut' | 'quadInOut' | 'cubicIn' | 'cubicOut' | 'cubicInOut' | 'sineInOut' | 'backOut' | 'elasticOut' | 'bounceOut', EaseFn>}
 */
export const Ease = {
  linear: (t) => t,
  quadIn: (t) => t * t,
  quadOut: (t) => t * (2 - t),
  quadInOut: (t) => (t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t),
  cubicIn: (t) => t ** 3,
  cubicOut: (t) => (t - 1) ** 3 + 1,
  cubicInOut: (t) => (t < 0.5 ? 4 * t ** 3 : (t - 1) * (2 * t - 2) ** 2 + 1),
  sineInOut: (t) => -(Math.cos(Math.PI * t) - 1) / 2,
  backOut: (t) => 1 + (BACK_OVERSHOOT + 1) * (t - 1) ** 3 + BACK_OVERSHOOT * (t - 1) ** 2,
  elasticOut: (t) => (t === 0 || t === 1 ? t : 2 ** (-10 * t) * Math.sin(((t * 10 - 0.75) * 2 * Math.PI) / 3) + 1),
  bounceOut,
};
