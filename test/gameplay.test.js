import { describe, expect, it, vi } from 'vitest';
import { Events } from '../src/core/Events.js';
import { Ease } from '../src/gameplay/Ease.js';
import { Timer } from '../src/gameplay/Timer.js';
import { Tween } from '../src/gameplay/Tween.js';
import { Animation } from '../src/render/Animation.js';
import { Camera } from '../src/render/Camera.js';
import { SpriteSheet } from '../src/render/SpriteSheet.js';

describe('Timer', () => {
  it('fires after the delay, once', () => {
    const t = new Timer();
    const fn = vi.fn();
    t.after(0.5, fn);
    t.update(0.4);
    expect(fn).not.toHaveBeenCalled();
    t.update(0.1);
    t.update(1);
    expect(fn).toHaveBeenCalledTimes(1);
    expect(t.size).toBe(0);
  });

  it('repeats with every and catches up on long steps', () => {
    const t = new Timer();
    const fn = vi.fn();
    t.every(0.1, fn);
    t.update(0.35);
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it('cancels', () => {
    const t = new Timer();
    const fn = vi.fn();
    const h = t.every(0.1, fn);
    t.update(0.1);
    h.cancel();
    t.update(1);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('starts timers created inside callbacks on the next update', () => {
    const t = new Timer();
    const inner = vi.fn();
    t.after(0.1, () => t.after(0.1, inner));
    t.update(0.1);
    expect(inner).not.toHaveBeenCalled();
    t.update(0.1);
    expect(inner).toHaveBeenCalled();
  });
});

describe('Tween', () => {
  it('interpolates with easing and completes exactly at the end value', () => {
    const obj = { x: 0 };
    const onComplete = vi.fn();
    const tw = new Tween(obj, { x: 100 }, 1, 'quadOut', { onComplete });
    tw.update(0.5);
    expect(obj.x).toBeCloseTo(100 * Ease.quadOut(0.5));
    expect(tw.update(0.6)).toBe(true);
    expect(obj.x).toBe(100);
    expect(onComplete).toHaveBeenCalledOnce();
  });

  it('waits for the delay and captures start values when it starts', () => {
    const obj = { x: 0 };
    const tw = new Tween(obj, { x: 10 }, 1, 'linear', { delay: 0.5 });
    tw.update(0.25);
    obj.x = 5; // changed before the tween starts
    tw.update(0.5); // 0.25 into the tween
    expect(obj.x).toBeCloseTo(5 + 5 * 0.25);
  });

  it('is awaitable and releases awaiters on cancel', async () => {
    const tw = new Tween({ x: 0 }, { x: 1 }, 1);
    const done = vi.fn();
    const p = tw.then(done);
    tw.cancel();
    await p;
    expect(done).toHaveBeenCalled();
  });

  it('rejects unknown easing names', () => {
    expect(() => new Tween({}, {}, 1, 'nope')).toThrow(/Unknown ease/);
  });
});

describe('Ease', () => {
  it('maps 0 to 0 and 1 to 1', () => {
    for (const [name, fn] of Object.entries(Ease)) {
      expect(fn(0), name).toBeCloseTo(0);
      expect(fn(1), name).toBeCloseTo(1);
    }
  });
});

describe('Events', () => {
  it('on, once, off, emit', () => {
    const ev = new Events();
    const a = vi.fn();
    const b = vi.fn();
    const unsubscribe = ev.on('hit', a);
    ev.once('hit', b);
    ev.emit('hit', 1);
    ev.emit('hit', 2);
    expect(a).toHaveBeenCalledTimes(2);
    expect(b).toHaveBeenCalledOnce();
    unsubscribe();
    ev.emit('hit', 3);
    expect(a).toHaveBeenCalledTimes(2);
  });

  it('can remove a once listener by the original function', () => {
    const ev = new Events();
    const fn = vi.fn();
    ev.once('x', fn);
    ev.off('x', fn);
    ev.emit('x');
    expect(fn).not.toHaveBeenCalled();
  });
});

describe('Camera', () => {
  it('maps screen and world coordinates both ways', () => {
    const cam = new Camera(320, 180);
    cam.x = 500;
    cam.y = 300;
    cam.zoom = 2;
    const w = cam.screenToWorld(0, 0);
    expect(w).toEqual({ x: 500 - 80, y: 300 - 45 });
    expect(cam.worldToScreen(w.x, w.y)).toEqual({ x: 0, y: 0 });
  });

  it('follows with lerp and clamps to bounds', () => {
    const cam = new Camera(100, 100);
    const target = { pos: { x: 1000, y: 50 }, w: 0, h: 0 };
    cam.follow(target, { lerp: 0.5 });
    cam.update(0);
    expect(cam.x).toBe(525);
    cam.setBounds(0, 0, 600, 100);
    cam.update(0);
    expect(cam.x).toBe(550); // right edge minus half the view
  });

  it('centers a world smaller than the view', () => {
    const cam = new Camera(100, 100);
    cam.setBounds(0, 0, 40, 400);
    expect(cam.x).toBe(20);
  });

  it('shake decays to zero', () => {
    const cam = new Camera(100, 100);
    cam.shake(5, 0.2);
    cam.update(0.1);
    expect(Math.abs(cam.shakeX)).toBeLessThanOrEqual(2.5);
    cam.update(0.2);
    expect(cam.shakeX).toBe(0);
  });
});

describe('SpriteSheet and Animation', () => {
  const image = { width: 32, height: 16 }; // a 4x1 grid of 8x16 frames
  const sheet = new SpriteSheet(image, { frameW: 8, frameH: 16 });

  it('slices frames left to right', () => {
    expect(sheet.frames.length).toBe(4);
    expect(sheet.frame(2)).toMatchObject({ sx: 16, sy: 0, sw: 8, sh: 16 });
  });

  it('loops by default and stops non-looping animations', () => {
    const onComplete = vi.fn();
    const anim = new Animation(sheet, {
      walk: { frames: [0, 1], fps: 10 },
      die: { frames: [2, 3], fps: 10, loop: false },
    });
    anim.onComplete = onComplete;
    anim.update(0.25);
    expect(anim.frame).toBe(0); // 0 -> 1 -> 0 after two frame times
    anim.play('die');
    anim.update(0.5);
    expect(anim.frame).toBe(3);
    expect(anim.done).toBe(true);
    expect(onComplete).toHaveBeenCalledWith('die');
  });

  it('does not restart the playing animation unless asked', () => {
    const anim = new Animation(sheet, { walk: { frames: [0, 1, 2], fps: 10 } });
    anim.update(0.1);
    anim.play('walk');
    expect(anim.frame).toBe(1);
    anim.play('walk', true);
    expect(anim.frame).toBe(0);
  });
});
