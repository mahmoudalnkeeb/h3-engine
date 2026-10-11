# Collision

Collision in a game means answering two separate questions, and keeping them apart makes everything easier.

1. Are these two things touching? (A coin and the player, a bullet and an enemy.)
2. Something walked into a wall. Where should it end up so it isn't inside the wall?

The first is detection. The second is resolution. Most of the time you only need detection.

## Detection: are they touching?

```js
Collision.aabb(a, b)          // two boxes
Collision.circle(a, b)        // two circles
Collision.circleRect(c, box)  // a circle and a box
Collision.overlaps(a, b)      // picks the right test from each entity's shape
Collision.pointInRect(x, y, box)
```

All of them accept entities. The box tests also accept plain `{ x, y, w, h }` objects (a `Rect` works), and the circle tests accept `{ x, y, r }`.

AABB stands for axis-aligned bounding box: a rectangle that isn't rotated. It's the cheapest test there is, and good enough for almost every 2D game. Note that rotating an entity's drawing doesn't rotate its hitbox.

Edges that only touch don't count. Two boxes side by side, one ending at x=10 and the next starting at x=10, aren't overlapping. That's what you want for tiles lined up next to each other.

## Checking whole groups with tags

You rarely test one pair at a time. More often it's "did the player touch any coin?":

```js
Collision.check(this, 'player', 'coin', (player, coin) => {
  coin.destroy();
  this.score += 10;
});
```

`check` tests every live, active entity tagged `player` against every one tagged `coin`, using `overlaps` (so circles are handled), and calls your function for each touching pair. The arguments arrive in the same order as the tags.

Put these checks in your scene's `update`. By then every entity has finished moving for this step, so you're testing final positions.

If you leave the callback out, `check` calls `onCollide(other)` on both entities instead, if they have one. That's handy when the reaction belongs to the entity itself:

```js
class Spike extends Entity {
  onCollide(other) {
    if (other.has('player')) other.hurt();
  }
}

Collision.check(this, 'player', 'hazard');
```

Checking a tag against itself (`'rock', 'rock'`) tests each pair only once.

`check` compares every A with every B. With 10 players and 500 coins that's 5,000 tests, which is nothing. With 2,000 bullets against 2,000 enemies it's 4 million, and you'd need something smarter (a spatial grid, on the post-v1 roadmap). For the games this engine targets, it's fine.

## Resolution: pushing things apart

```js
const side = Collision.resolve(mover, wall);
```

If `mover` overlaps `wall`, `resolve` moves `mover` out by the smallest distance and tells you which side of the wall it hit:

- `'top'`: the mover landed on top of the wall. Stop falling.
- `'bottom'`: the mover hit the wall from below. Bonk; stop rising.
- `'left'` / `'right'`: it walked into the wall's left or right side. Stop moving sideways.
- `null`: they weren't overlapping. Nothing moved.

Only `mover`'s position changes. `resolve` doesn't touch velocity, because what should happen depends on your game. A ball bounces, a player stops, a grenade slides. You decide:

```js
const side = Collision.resolve(ball, brick);
if (side === 'top') ball.vel.y = -Math.abs(ball.vel.y);
else if (side === 'bottom') ball.vel.y = Math.abs(ball.vel.y);
else if (side === 'left') ball.vel.x = -Math.abs(ball.vel.x);
else if (side === 'right') ball.vel.x = Math.abs(ball.vel.x);
```

That's straight from the Breakout ball (`examples/breakout/entities/Ball.js`). Using `Math.abs` instead of just flipping the sign (`vel.y = -vel.y`) is deliberate. If the ball touches the same brick on two steps in a row, flipping twice would send it back into the brick. With `Math.abs` it always ends up heading away.

## Platformers: move one axis at a time

Using `resolve` with "smallest push" works well for a ball. For a platformer character walking over a floor made of tiles, it has a classic bug.

Picture the player walking right across a flat floor made of 16-pixel tiles. Gravity pulls them a pixel into the floor every step. At the seam between two tiles, the player overlaps both, and for one of those tiles the smallest way out can be sideways instead of up. The player snags on a perfectly flat floor, as if there were an invisible bump. If you've ever played a jam game where the character randomly stops while running, this is probably why.

The fix: move along X, fix X collisions, then move along Y, fix Y collisions. `resolve` takes a third argument to force the axis:

```js
moveAndCollide(entity, dt) {
  entity.pos.x += entity.vel.x * dt;
  for (const tile of solidTilesTouching(entity)) {
    if (Collision.resolve(entity, tile, 'x')) entity.vel.x = 0;
  }

  entity.pos.y += entity.vel.y * dt;
  for (const tile of solidTilesTouching(entity)) {
    const side = Collision.resolve(entity, tile, 'y');
    if (side === 'top') { entity.vel.y = 0; onGround = true; }
    if (side === 'bottom') entity.vel.y = 0;
  }
}
```

Now a sideways push can only come from actually walking sideways into something. The real version, with one-way platforms and tile lookups, is `Level.moveAndCollide` in `examples/platformer/entities/Level.js`. It's about 40 lines and worth reading.

This is also why the platformer `Player` doesn't call `super.update(dt)`. The default update moves both axes at once, and here we need them separate.

## One-way platforms

A one-way platform lets you jump up through it from below but holds you when you land on it. The trick is to only count it as solid when moving down, and only if the entity's feet were above the platform before this step's movement:

```js
if (tile === '-' && axis === 'y' && entity.vel.y >= 0 && previousBottom <= tileTop) solid = true;
```

Check against where the feet were before moving, not after. Otherwise a fast fall would carry the feet past the platform's top in a single step, and the platform would never catch you.

## Tunneling

Collision only checks positions at each step. A ball moving 600 pixels per second moves 10 pixels per step. If a brick is thinner than that, the ball can be in front of it one step and past it the next, without ever overlapping. That's called tunneling.

Three ways to deal with it, from easiest to hardest:

- Keep fast things big and thin things thick. Breakout caps the ball speed at 620 pixels per second, and its bricks are 18 pixels tall.
- Move in smaller steps. Breakout's ball moves in two half-steps per update and checks collisions after each one. Look for the loop in `Ball.update`.
- Sweep tests (calculating exactly when two moving boxes first touch). The engine doesn't do these; you'd write them yourself if you need them.

## Golden rule

Detect in the scene's `update`, after everything has moved. Resolve per axis for anything that walks on tiles. Decide what velocity does yourself.
