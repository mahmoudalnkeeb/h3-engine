/**
 * Play a named sound effect. Every sound is synthesized, so there are no files to load.
 * @param {import('../../src/index.js').Audio} audio
 * @param {'jump' | 'coin' | 'stomp' | 'die'} kind
 */
export const sfx = (audio, kind) => {
  if (kind === 'jump') audio.tone({ freq: 300, to: 600, duration: 0.1, volume: 0.1 });
  else if (kind === 'coin') audio.tone({ freq: 988, to: 1319, duration: 0.08, volume: 0.1 });
  else if (kind === 'stomp') audio.tone({ freq: 220, to: 80, duration: 0.12, volume: 0.15 });
  else if (kind === 'die') audio.tone({ freq: 440, to: 80, duration: 0.6, type: 'sawtooth', volume: 0.15 });
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
