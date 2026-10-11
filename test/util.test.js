import { describe, expect, it } from 'vitest';
import { approach, clamp, lerp, randInt } from '../src/util/math.js';
import { Pool } from '../src/util/Pool.js';
import { Rect } from '../src/util/Rect.js';
import { Vec2 } from '../src/util/Vec2.js';

describe('math', () => {
  it('clamps', () => {
    expect(clamp(5, 0, 3)).toBe(3);
    expect(clamp(-1, 0, 3)).toBe(0);
    expect(clamp(2, 0, 3)).toBe(2);
  });

  it('lerps', () => {
    expect(lerp(10, 20, 0.25)).toBe(12.5);
  });

  it('randInt stays inside the inclusive range', () => {
    for (let i = 0; i < 200; i++) {
      const v = randInt(1, 3);
      expect(v).toBeGreaterThanOrEqual(1);
      expect(v).toBeLessThanOrEqual(3);
      expect(Number.isInteger(v)).toBe(true);
    }
  });

  it('approach never overshoots', () => {
    expect(approach(0, 10, 3)).toBe(3);
    expect(approach(9, 10, 3)).toBe(10);
    expect(approach(5, 0, 10)).toBe(0);
  });
});

describe('Vec2', () => {
  it('chains mutating operations', () => {
    const v = new Vec2(3, 4);
    expect(v.len()).toBe(5);
    expect(v.add(new Vec2(1, 1)).scale(2)).toBe(v);
    expect(v).toMatchObject({ x: 8, y: 10 });
  });

  it('normalizes and leaves zero vectors alone', () => {
    expect(new Vec2(0, 5).normalize()).toMatchObject({ x: 0, y: 1 });
    expect(new Vec2().normalize()).toMatchObject({ x: 0, y: 0 });
  });

  it('limits length', () => {
    expect(new Vec2(30, 40).limit(5).len()).toBeCloseTo(5);
    expect(new Vec2(3, 4).limit(10).len()).toBeCloseTo(5);
  });

  it('rotates', () => {
    const v = new Vec2(1, 0).rotate(Math.PI / 2);
    expect(v.x).toBeCloseTo(0);
    expect(v.y).toBeCloseTo(1);
  });
});

describe('Rect', () => {
  it('contains points with exclusive right/bottom edges', () => {
    const r = new Rect(0, 0, 10, 10);
    expect(r.contains(0, 0)).toBe(true);
    expect(r.contains(10, 5)).toBe(false);
  });

  it('intersects', () => {
    const r = new Rect(0, 0, 10, 10);
    expect(r.intersects(new Rect(9, 9, 5, 5))).toBe(true);
    expect(r.intersects(new Rect(10, 0, 5, 5))).toBe(false);
  });
});

describe('Pool', () => {
  it('reuses released objects and resets them', () => {
    let created = 0;
    const pool = new Pool(
      () => ({ id: created++, used: false }),
      2,
      (o) => (o.used = false),
    );
    expect(pool.available).toBe(2);
    const a = pool.get();
    a.used = true;
    pool.release(a);
    expect(pool.get()).toBe(a);
    expect(a.used).toBe(false);
    pool.get();
    pool.get(); // pool empty, falls back to the factory
    expect(created).toBe(3);
  });
});
