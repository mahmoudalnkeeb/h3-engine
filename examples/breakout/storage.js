const BEST_KEY = 'h3-breakout-best';

/** @returns {number} The saved best score, or 0. */
export const loadBest = () => {
  try {
    return Number(localStorage.getItem(BEST_KEY)) || 0;
  } catch {
    return 0;
  }
};

/** @param {number} score */
export const saveBest = (score) => {
  try {
    localStorage.setItem(BEST_KEY, String(score));
  } catch {
    // storage unavailable (private mode); best score just isn't kept
  }
};
