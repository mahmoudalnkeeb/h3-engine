import { describe, expect, it, vi } from 'vitest';
import { Scene } from '../src/core/Scene.js';
import { Entity } from '../src/gameplay/Entity.js';
import { Debug } from '../src/util/Debug.js';
import { fakeGame, fakeRenderer } from './helpers.js';

const setup = () => {
  const game = /** @type {any} */ (fakeGame());
  game.loop = { fps: 60, ups: 60 };
  const scene = new Scene(game);
  scene.key = 'test';
  game.scenes = { current: scene };
  const debug = new Debug(game, true);
  return { debug, scene };
};

const draw = (debug) => {
  const r = fakeRenderer();
  debug.render(/** @type {any} */ (r));
  return r.calls;
};

const named = (calls, name) => calls.filter((c) => c[0] === name);
const texts = (calls) => named(calls, 'text').map((c) => c[1]);

describe('Debug', () => {
  it('draws rect hitboxes as rects and circle hitboxes as circles', () => {
    const { debug, scene } = setup();
    scene.add(new Entity({ x: 1, y: 2, w: 10, h: 20 }));
    scene.add(new Entity({ x: 0, y: 0, w: 10, h: 10, shape: 'circle' }));
    const calls = draw(debug);
    expect(named(calls, 'strokeRect')).toEqual([['strokeRect', 1, 2, 10, 20, '#0f0', 1]]);
    expect(named(calls, 'strokeCircle')).toEqual([['strokeCircle', 5, 5, 5, '#0f0', 1]]);
  });

  it('skips entities with debug off and counts only shown ones', () => {
    const { debug, scene } = setup();
    scene.add(new Entity({ w: 4, h: 4 }));
    scene.add(new Entity({ w: 4, h: 4 })).debug = false;
    const calls = draw(debug);
    expect(named(calls, 'strokeRect')).toHaveLength(1);
    expect(texts(calls)).toContain('entities 2 (shown 1)');
  });

  it('skips entities with an ignored tag', () => {
    const { debug, scene } = setup();
    scene.add(new Entity({ w: 4, h: 4, tags: ['fx'] }));
    scene.add(new Entity({ w: 4, h: 4, tags: ['player'] }));
    debug.ignoreTags.add('fx');
    expect(named(draw(debug), 'strokeRect')).toHaveLength(1);
  });

  it('calls drawDebug overrides with the color and zoom-adjusted line width', () => {
    const { debug, scene } = setup();
    scene.camera.zoom = 2;
    const entity = scene.add(new Entity({ w: 4, h: 4 }));
    entity.drawDebug = vi.fn();
    const r = fakeRenderer();
    debug.render(/** @type {any} */ (r));
    expect(entity.drawDebug).toHaveBeenCalledWith(r, '#0f0', 0.5);
  });

  it('sizes the stats panel in CSS pixels, undoing the renderer scale', () => {
    const { debug } = setup();
    const r = fakeRenderer();
    r.pixelScale = 4;
    debug.render(/** @type {any} */ (r));
    const scaleAt = r.calls.findIndex((c) => c[0] === 'scale');
    expect(r.calls[scaleAt]).toEqual(['scale', 0.25, 0.25]);
    expect(r.calls.findIndex((c) => c[0] === 'text')).toBeGreaterThan(scaleAt);
    expect(r.calls.at(-1)).toEqual(['pop']);
  });

  it('shows watched values, replaces by label and unwatches', () => {
    const { debug } = setup();
    debug.watch('hp', () => 3);
    debug.watch('hp', () => 4);
    expect(texts(draw(debug))).toContain('hp 4');
    expect(texts(draw(debug)).filter((t) => t.startsWith('hp'))).toHaveLength(1);
    debug.unwatch('hp');
    expect(texts(draw(debug)).some((t) => t.startsWith('hp'))).toBe(false);
  });

  it('draws nothing and reads no watches when disabled', () => {
    const { debug, scene } = setup();
    scene.add(new Entity({ w: 4, h: 4 }));
    const read = vi.fn(() => 1);
    debug.watch('x', read);
    debug.enabled = false;
    expect(draw(debug)).toEqual([]);
    expect(read).not.toHaveBeenCalled();
  });
});
