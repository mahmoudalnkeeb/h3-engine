/**
 * @typedef {import('./Entity.js').Entity} Entity
 * @typedef {import('../core/Scene.js').Scene} Scene
 * @typedef {{ x: number, y: number, w: number, h: number }} Box
 * @typedef {{ x: number, y: number, r: number }} Circle Center and radius.
 * @typedef {'left' | 'right' | 'top' | 'bottom'} Side
 * @typedef {Entity & { onCollide?: (other: Entity) => void }} CollidingEntity
 */

const asBox = (shape) => (shape.bounds !== undefined ? shape.bounds : shape);

const scratchCircleA = { x: 0, y: 0, r: 0 };
const scratchCircleB = { x: 0, y: 0, r: 0 };

const asCircle = (shape, out) => {
  if (!shape.pos) return shape;
  out.x = shape.pos.x + shape.w / 2;
  out.y = shape.pos.y + shape.h / 2;
  out.r = shape.radius;
  return out;
};

const clamp = (value, min, max) => (value < min ? min : value > max ? max : value);

/**
 * Box overlap. Touching edges don't count.
 * @param {Entity | Box} a
 * @param {Entity | Box} b
 * @returns {boolean}
 */
const aabb = (a, b) => {
  const A = asBox(a);
  const B = asBox(b);
  return A.x < B.x + B.w && A.x + A.w > B.x && A.y < B.y + B.h && A.y + A.h > B.y;
};

/**
 * Circle overlap. Entities are treated as circles centered on their hitbox, using `radius`.
 * @param {Entity | Circle} a
 * @param {Entity | Circle} b
 * @returns {boolean}
 */
const circle = (a, b) => {
  const A = asCircle(a, scratchCircleA);
  const B = asCircle(b, scratchCircleB);
  const dx = A.x - B.x;
  const dy = A.y - B.y;
  const reach = A.r + B.r;
  return dx * dx + dy * dy < reach * reach;
};

/**
 * @param {Entity | Circle} c
 * @param {Entity | Box} rect
 * @returns {boolean}
 */
const circleRect = (c, rect) => {
  const C = asCircle(c, scratchCircleA);
  const R = asBox(rect);
  const dx = C.x - clamp(C.x, R.x, R.x + R.w);
  const dy = C.y - clamp(C.y, R.y, R.y + R.h);
  return dx * dx + dy * dy < C.r * C.r;
};

/**
 * Overlap test chosen from each entity's `shape`.
 * @param {Entity} a
 * @param {Entity} b
 * @returns {boolean}
 */
const overlaps = (a, b) => {
  const aIsCircle = a.shape === 'circle';
  const bIsCircle = b.shape === 'circle';
  if (aIsCircle && bIsCircle) return circle(a, b);
  if (aIsCircle) return circleRect(a, b);
  if (bIsCircle) return circleRect(b, a);
  return aabb(a, b);
};

/**
 * Right and bottom edges are exclusive.
 * @param {number} px
 * @param {number} py
 * @param {Entity | Box} rect
 * @returns {boolean}
 */
const pointInRect = (px, py, rect) => {
  const R = asBox(rect);
  return px >= R.x && px < R.x + R.w && py >= R.y && py < R.y + R.h;
};

/**
 * Push `mover` out of `obstacle` by the smallest distance, or along `axis`.
 * Only `mover.pos` changes; velocity is left to the caller.
 *
 * Moving along one axis at a time and resolving with that axis avoids
 * snagging on seams between tiles.
 * @param {Entity} mover
 * @param {Entity | Box} obstacle
 * @param {'x' | 'y'} [axis]
 * @returns {Side | null} Side of `obstacle` that was hit (`'top'` means `mover` landed on it), or null if they don't overlap.
 */
const resolve = (mover, obstacle, axis) => {
  const A = mover.bounds;
  const B = asBox(obstacle);
  const overlapX = Math.min(A.x + A.w - B.x, B.x + B.w - A.x);
  const overlapY = Math.min(A.y + A.h - B.y, B.y + B.h - A.y);
  if (overlapX <= 0 || overlapY <= 0) return null;

  const pushOnX = axis ? axis === 'x' : overlapX < overlapY;
  if (pushOnX) {
    const comingFromLeft = A.x + A.w / 2 < B.x + B.w / 2;
    mover.pos.x += comingFromLeft ? -overlapX : overlapX;
    return comingFromLeft ? 'left' : 'right';
  }
  const comingFromAbove = A.y + A.h / 2 < B.y + B.h / 2;
  mover.pos.y += comingFromAbove ? -overlapY : overlapY;
  return comingFromAbove ? 'top' : 'bottom';
};

const canCollide = (entity, tag) => !entity.dead && entity.active && entity.tags.has(tag);

/**
 * Test every live, active entity tagged `tagA` against every one tagged `tagB`
 * using {@link overlaps}. Calls `onHit(a, b)` per overlapping pair, or
 * `a.onCollide(b)` and `b.onCollide(a)` when `onHit` is omitted. When the tags
 * are equal, each pair is reported once.
 * @param {Scene} scene
 * @param {string} tagA
 * @param {string} tagB
 * @param {(a: Entity, b: Entity) => void} [onHit]
 * @example
 * Collision.check(this, 'player', 'coin', (player, coin) => coin.destroy());
 */
const check = (scene, tagA, tagB, onHit) => {
  const list = /** @type {CollidingEntity[]} */ (scene.entities);
  const sameTag = tagA === tagB;
  for (let i = 0; i < list.length; i++) {
    const a = list[i];
    if (!canCollide(a, tagA)) continue;
    for (let j = sameTag ? i + 1 : 0; j < list.length; j++) {
      const b = list[j];
      if (b === a || !canCollide(b, tagB) || !overlaps(a, b)) continue;
      if (onHit) {
        onHit(a, b);
      } else {
        a.onCollide?.(b);
        b.onCollide?.(a);
      }
      if (a.dead) break;
    }
  }
};

/** Overlap tests and resolution. Entities are read through their `bounds`, `shape` and `radius`. */
export const Collision = { aabb, circle, circleRect, overlaps, pointInRect, resolve, check };
