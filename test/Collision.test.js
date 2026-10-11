import { describe, expect, it, vi } from 'vitest';
import { Scene } from '../src/core/Scene.js';
import { Collision } from '../src/gameplay/Collision.js';
import { Entity } from '../src/gameplay/Entity.js';
import { Rect } from '../src/util/Rect.js';
import { fakeGame } from './helpers.js';

const box = (x, y, w = 10, h = 10, tags = []) => new Entity({ x, y, w, h, tags });

describe('Collision tests', () => {
  it('aabb works on entities and rects, touching edges do not overlap', () => {
    expect(Collision.aabb(box(0, 0), box(5, 5))).toBe(true);
    expect(Collision.aabb(box(0, 0), box(10, 0))).toBe(false);
    expect(Collision.aabb(box(0, 0), new Rect(9, 9, 1, 1))).toBe(true);
  });

  it('circle and circleRect', () => {
    const a = new Entity({ x: 0, y: 0, w: 10, h: 10, shape: 'circle' });
    const b = new Entity({ x: 9, y: 0, w: 10, h: 10, shape: 'circle' });
    expect(Collision.circle(a, b)).toBe(true);
    expect(Collision.circle({ x: 0, y: 0, r: 1 }, { x: 3, y: 0, r: 1 })).toBe(false);
    // Corner case: circle near a rect corner but outside it.
    expect(Collision.circleRect({ x: -3, y: -3, r: 4 }, new Rect(0, 0, 10, 10))).toBe(false);
    expect(Collision.circleRect({ x: -2, y: -2, r: 4 }, new Rect(0, 0, 10, 10))).toBe(true);
  });

  it('overlaps picks the test from entity shapes', () => {
    const ball = new Entity({ x: -7, y: -7, w: 8, h: 8, shape: 'circle' }); // center (-3, -3), r 4
    const wall = box(0, 0);
    expect(Collision.aabb(ball, wall)).toBe(true); // boxes touch at the corner
    expect(Collision.overlaps(ball, wall)).toBe(false); // the circle does not
  });

  it('pointInRect', () => {
    expect(Collision.pointInRect(5, 5, box(0, 0))).toBe(true);
    expect(Collision.pointInRect(10, 5, box(0, 0))).toBe(false);
  });
});

describe('Collision.resolve', () => {
  it('pushes out along the smallest overlap and reports the side hit', () => {
    const wall = box(0, 0, 100, 10);
    const landing = box(10, -8); // 2px into the top
    expect(Collision.resolve(landing, wall)).toBe('top');
    expect(landing.pos.y).toBe(-10);

    const side = box(-8, 0, 10, 10);
    expect(Collision.resolve(side, box(0, 0, 10, 100))).toBe('left');
    expect(side.pos.x).toBe(-10);
  });

  it('respects a forced axis', () => {
    const a = box(5, 2);
    expect(Collision.resolve(a, box(0, 0, 10, 10), 'x')).toBe('right');
    expect(a.pos.x).toBe(10);
  });

  it('returns null without overlap', () => {
    const a = box(20, 0);
    expect(Collision.resolve(a, box(0, 0))).toBe(null);
    expect(a.pos.x).toBe(20);
  });
});

describe('Collision.check', () => {
  it('calls back once per overlapping pair across tags', () => {
    const scene = new Scene(fakeGame());
    const p = scene.add(box(0, 0, 10, 10, ['player']));
    const e1 = scene.add(box(5, 5, 10, 10, ['enemy']));
    scene.add(box(50, 50, 10, 10, ['enemy']));
    const cb = vi.fn();
    Collision.check(scene, 'player', 'enemy', cb);
    expect(cb).toHaveBeenCalledTimes(1);
    expect(cb).toHaveBeenCalledWith(p, e1);
  });

  it('does not double-count pairs within one tag and skips inactive or dead', () => {
    const scene = new Scene(fakeGame());
    scene.add(box(0, 0, 10, 10, ['rock']));
    scene.add(box(5, 0, 10, 10, ['rock']));
    const off = scene.add(box(5, 5, 10, 10, ['rock']));
    off.active = false;
    const cb = vi.fn();
    Collision.check(scene, 'rock', 'rock', cb);
    expect(cb).toHaveBeenCalledTimes(1);
  });

  it('falls back to onCollide on both entities', () => {
    const scene = new Scene(fakeGame());
    const a = scene.add(box(0, 0, 10, 10, ['a']));
    const b = scene.add(box(5, 5, 10, 10, ['b']));
    a.onCollide = vi.fn();
    b.onCollide = vi.fn();
    Collision.check(scene, 'a', 'b');
    expect(a.onCollide).toHaveBeenCalledWith(b);
    expect(b.onCollide).toHaveBeenCalledWith(a);
  });
});
