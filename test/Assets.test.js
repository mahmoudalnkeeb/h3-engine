import { describe, expect, it } from 'vitest';
import { Assets } from '../src/platform/Assets.js';

const fakeLoaders = {
  images: async (url) => ({ url, width: 1, height: 1 }),
  json: async (url) => ({ from: url }),
};

describe('Assets', () => {
  it('loads a manifest into a keyed cache and reports progress', async () => {
    const assets = new Assets({ loaders: fakeLoaders });
    const progress = [];
    await assets.load({ images: { a: 'a.png', b: 'b.png' }, json: { lvl: 'lvl.json' } }, (p) => progress.push(p));
    expect(assets.image('a').url).toBe('a.png');
    expect(assets.json('lvl')).toEqual({ from: 'lvl.json' });
    expect(progress.at(-1)).toBe(1);
    expect(progress.length).toBe(3);
  });

  it('throws a helpful error for missing keys', () => {
    const assets = new Assets({ loaders: fakeLoaders });
    expect(() => assets.image('ghost')).toThrow(/"ghost" not loaded/);
  });

  it('does not reload cached keys', async () => {
    let loads = 0;
    const assets = new Assets({
      loaders: {
        images: async () => {
          loads++;
          return {};
        },
      },
    });
    await assets.load({ images: { a: 'a.png' } });
    await assets.load({ images: { a: 'a.png' } });
    expect(loads).toBe(1);
  });
});
