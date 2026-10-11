/**
 * Play a named sound effect. Every sound is synthesized, so there are no files to load.
 * @param {import('../../src/index.js').Audio} audio
 * @param {'wall' | 'paddle' | 'brick' | 'armor' | 'power' | 'lose'} kind
 * @param {number} [row=0] Brick row; higher rows play lower notes.
 */
export const sfx = (audio, kind, row = 0) => {
  if (kind === 'wall') audio.tone({ freq: 300, duration: 0.04, volume: 0.1 });
  else if (kind === 'paddle') audio.tone({ freq: 220, duration: 0.06, volume: 0.15 });
  else if (kind === 'brick') audio.tone({ freq: 880 - row * 60, duration: 0.07, volume: 0.12 });
  else if (kind === 'armor') audio.tone({ freq: 160, duration: 0.05, type: 'sawtooth', volume: 0.1 });
  else if (kind === 'power') audio.tone({ freq: 440, to: 1320, duration: 0.2, type: 'triangle' });
  else if (kind === 'lose') audio.tone({ freq: 330, to: 60, duration: 0.5, type: 'sawtooth', volume: 0.15 });
};

/**
 * A rising run of notes for clearing a level.
 * @param {import('../../src/index.js').Timer} timer
 * @param {import('../../src/index.js').Audio} audio
 */
export const fanfare = (timer, audio) => {
  [523, 659, 784, 1047].forEach((freq, i) => {
    timer.after(i * 0.12, () => audio.tone({ freq, duration: 0.15, type: 'triangle' }));
  });
};
