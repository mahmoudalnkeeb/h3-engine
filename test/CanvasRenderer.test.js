import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CanvasRenderer } from '../src/render/canvas/CanvasRenderer.js';
import { Renderer } from '../src/render/Renderer.js';

/** 2D context that records method calls and property writes. */
const fakeContext = () => {
  const calls = [];
  const state = { globalAlpha: 1 };
  const ctx = new Proxy(state, {
    get: (target, key) => (key in target ? target[key] : (...args) => calls.push([key, ...args])),
    set: (target, key, value) => {
      target[key] = value;
      if (key !== 'globalAlpha') calls.push([`=${String(key)}`, value]);
      return true;
    },
  });
  return { ctx, calls, state };
};

const fakeCanvas = () => {
  const context = fakeContext();
  const canvas = {
    width: 0,
    height: 0,
    style: {},
    getContext: () => context.ctx,
    getBoundingClientRect: () => ({ left: 10, top: 20, width: 640, height: 360 }),
  };
  return { canvas, context };
};

const create = (options = {}) => {
  const { canvas, context } = fakeCanvas();
  const r = new CanvasRenderer(/** @type {any} */ ({ canvas, width: 320, height: 180, ...options }));
  context.calls.length = 0;
  return { r, canvas, calls: context.calls, state: context.state };
};

beforeEach(() => {
  vi.stubGlobal('window', {
    innerWidth: 1000,
    innerHeight: 500,
    devicePixelRatio: 2,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('Renderer contract', () => {
  it('CanvasRenderer overrides every abstract member of Renderer', () => {
    const shared = new Set(['constructor', 'canvas', 'pixelScale', 'attach', 'detach', 'resize', 'toLogical']);
    shared.add('beginFrame').add('endFrame').add('image');
    const abstract = Object.getOwnPropertyNames(Renderer.prototype).filter((name) => !shared.has(name));
    expect(abstract.length).toBeGreaterThan(0);
    for (const name of abstract) {
      expect(Object.hasOwn(CanvasRenderer.prototype, name), name).toBe(true);
    }
  });

  it('the base class throws when a primitive is missing', () => {
    const { canvas } = fakeCanvas();
    const base = new Renderer(/** @type {any} */ ({ canvas, width: 10, height: 10 }));
    expect(() => base.rect(0, 0, 1, 1, '#fff')).toThrow(/rect/);
  });
});

describe('CanvasRenderer sizing', () => {
  it("'fit' scales to the window and applies devicePixelRatio", () => {
    const { r, canvas } = create();
    expect(r.pixelScale).toBeCloseTo(2.7778, 3);
    expect(canvas.width).toBe(Math.round(320 * r.pixelScale * 2));
    expect(canvas.style.width).toBe(`${320 * r.pixelScale}px`);
  });

  it("'pixel' snaps to whole device pixels and turns smoothing off", () => {
    const { canvas } = fakeCanvas();
    const r = new CanvasRenderer(/** @type {any} */ ({ canvas, width: 320, height: 180, scale: 'pixel' }));
    expect(r.pixelScale).toBe(2.5);
    expect(canvas.width).toBe(1600);
    expect(r.ctx.imageSmoothingEnabled).toBe(false);
  });

  it("'none' keeps one logical pixel per CSS pixel", () => {
    const { r, canvas } = create({ scale: 'none' });
    expect(r.pixelScale).toBe(1);
    expect(canvas.width).toBe(640);
  });

  it('resize resets the base transform and calls onResize', () => {
    const { r, calls } = create({ scale: 'none' });
    r.onResize = vi.fn();
    r.resize();
    expect(calls).toContainEqual(['setTransform', 2, 0, 0, 2, 0, 0]);
    expect(r.onResize).toHaveBeenCalledOnce();
  });

  it('attach and detach listen to window resize', () => {
    const { r } = create();
    r.attach();
    r.detach();
    expect(window.addEventListener).toHaveBeenCalledWith('resize', expect.any(Function));
    expect(window.removeEventListener).toHaveBeenCalledWith('resize', expect.any(Function));
  });

  it('toLogical maps client coordinates to logical pixels', () => {
    const { r } = create();
    expect(r.toLogical(330, 200)).toEqual({ x: 160, y: 90 });
  });
});

describe('CanvasRenderer drawing', () => {
  it('beginFrame resets alpha and clears with the background', () => {
    const { r, calls, state } = create({ scale: 'none', background: '#123' });
    state.globalAlpha = 0.5;
    r.beginFrame();
    r.endFrame();
    expect(state.globalAlpha).toBe(1);
    expect(calls).toEqual([
      ['setTransform', 2, 0, 0, 2, 0, 0],
      ['=fillStyle', '#123'],
      ['fillRect', 0, 0, 320, 180],
    ]);
  });

  it('text applies defaults', () => {
    const { r, calls } = create();
    r.text('hi', 1, 2);
    expect(calls).toEqual([
      ['=font', '16px sans-serif'],
      ['=fillStyle', '#fff'],
      ['=textAlign', 'left'],
      ['=textBaseline', 'top'],
      ['fillText', 'hi', 1, 2],
    ]);
  });

  it('image draws the anchored region without a transform when not needed', () => {
    const { r, calls } = create();
    const img = { width: 16, height: 8 };
    r.image(img, 10, 20, { originX: 0.5, originY: 1 });
    expect(calls).toEqual([['drawImage', img, 0, 0, 16, 8, 2, 12, 16, 8]]);
  });

  it('sprite with rotation, flip and alpha wraps the draw in save/restore', () => {
    const { r, calls, state } = create();
    const img = { width: 32, height: 32 };
    const region = { image: img, sx: 16, sy: 0, sw: 16, sh: 16, originX: 0.5, originY: 0.5 };
    r.sprite(region, 50, 60, { rotation: 1, flipX: true, alpha: 0.5 });
    expect(calls).toEqual([
      ['save'],
      ['translate', 50, 60],
      ['rotate', 1],
      ['translate', 0, 0],
      ['scale', -1, 1],
      ['drawImage', img, 16, 0, 16, 16, -8, -8, 16, 16],
      ['restore'],
    ]);
    expect(state.globalAlpha).toBe(0.5);
  });

  it('push, pop and transforms map to the context', () => {
    const { r, calls } = create();
    r.push();
    r.translate(1, 2);
    r.rotate(0.5);
    r.scale(3);
    r.pop();
    expect(calls).toEqual([['save'], ['translate', 1, 2], ['rotate', 0.5], ['scale', 3, 3], ['restore']]);
  });
});
