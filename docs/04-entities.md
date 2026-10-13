# Entities

An entity is anything in your game that has a position: the player, an enemy, a bullet, a coin, a floating "+100" label, a tile map. You make one by extending `Entity`:

```js
class Coin extends Entity {
  constructor(x, y) {
    super({ x, y, w: 8, h: 10, tags: ['coin'] });
  }

  update(dt, ctx) {}

  render(r) {
    r.rect(this.pos.x, this.pos.y, this.w, this.h, '#ffd166');
  }
}

scene.add(new Coin(100, 50));
```

We use classes rather than an entity-component system (ECS). ECS is great for games with ten thousand interacting objects, but it's a lot to learn when you just want a coin to spin. With classes, everything about a coin lives in the `Coin` class. If two entity types share behavior, write a plain helper function and call it from both. The platformer's `Level.moveAndCollide` works this way; both the player and the slimes use it.

## Position, size and velocity

`pos` is the top-left corner of the entity's box, in world pixels. `w` and `h` are its size. Together they make the hitbox, which is what collision uses. Your `render` can draw something bigger or smaller than the hitbox if you like.

`vel` is the velocity in pixels per second. Both `pos` and `vel` are `Vec2`s, small `{ x, y }` objects with handy methods:

```js
this.vel.set(100, -200);
this.vel.scale(0.5);                // halve the speed
this.vel.normalize().scale(300);    // same direction, speed 300
this.pos.addScaled(this.vel, dt);   // pos += vel * dt
```

`Vec2` methods change the vector in place and return it, so you can chain them. They don't create new vectors, on purpose. Creating thousands of short-lived objects every second makes the browser's garbage collector run more often, and that shows up as small stutters.

`this.cx` and `this.cy` give you the center, which is often handier than the corner.

## The default update moves you

The base `Entity.update` does one thing:

```js
update(dt) {
  this.pos.addScaled(this.vel, dt);
}
```

So if you override `update` and still want velocity to move you, call `super.update(dt)`:

```js
// ❌ The bullet has velocity but never moves.
class Bullet extends Entity {
  update(dt) {
    if (this.pos.y < 0) this.destroy();
  }
}

// ✅
class Bullet extends Entity {
  update(dt) {
    super.update(dt);
    if (this.pos.y < 0) this.destroy();
  }
}
```

Leaving `super.update(dt)` out is fine when you move the entity yourself. The platformer's `Player` does that because it needs to move along X and Y separately (see [Collision](08-collision.md)).

## The context argument

`update` receives a second argument: the shared context. It's the same object for every entity and scene, so you can reach the important systems without global variables:

```js
update(dt, { input, audio, scene, camera }) {
  if (input.justPressed('Space')) audio.tone({ freq: 600 });
}
```

It contains `game`, `input`, `assets`, `renderer`, `audio`, `events`, `scene` (the top scene) and `camera` (the top scene's camera). An entity can also reach its own scene through `this.scene`, which is how the Breakout ball finds the paddle: `this.scene.paddle`.

## Tags

Tags are labels you use to find entities later:

```js
super({ x, y, w: 14, h: 10, tags: ['enemy', 'stompable'] });

scene.find('enemy');        // array of every live enemy
scene.first('player');      // the first live player, or undefined
scene.count('coin');        // how many coins are left
entity.has('stompable');    // true
entity.tag('boss');         // add a tag later
```

`Collision.check` uses tags too, so naming them well pays off.

`find` builds a new array every call. If you call it every update, pass in an array to reuse: `scene.find('enemy', this.enemyList)`.

## Adding and removing

```js
const coin = scene.add(new Coin(x, y));   // add returns the entity
coin.destroy();                           // remove it
```

Here's the subtle part, and it's worth understanding.

When you add or destroy an entity during an update, the change doesn't happen immediately. It's queued and applied when the update step finishes. Destroyed entities have `dead = true` straight away, and every engine loop skips dead entities. But they stay in `scene.entities` until the end of the step.

Why? Because the engine is in the middle of looping over `scene.entities`. Picture a list of five enemies, and the second one destroys the third during its update. If the list changed right then, the loop would skip whatever slid into the third slot. Bugs like that show up once every few hundred plays and are miserable to track down. Queuing changes until the loop is done removes the whole category.

What this means in practice:

- A bullet spawned this step starts updating next step. It still draws this frame.
- Right after `scene.add()` during an update, `scene.count()` doesn't include the new entity yet.
- `scene.count()` does already exclude anything destroyed this step. Breakout relies on this: right after destroying a brick, `this.count('brick') === 0` means the level is clear.

Outside an update (in `enter`, for example), adds happen immediately.

## Hooks

Three optional methods get called for you if they exist:

```js
onAdd(scene) {}       // just entered the scene
onRemove(scene) {}    // just left it
onCollide(other) {}   // used by Collision.check when you don't pass a callback
```

## Visible, active and z

`visible = false` skips drawing. `active = false` skips updates and collision checks, but the entity is still drawn. Breakout sets `active = false` on balls when a level is cleared, so they freeze in place while the "Level clear" text shows.

`z` controls draw order: lower numbers draw first, so higher numbers end up on top. Entities with the same `z` draw in the order they were added. The platformer uses `z: -10` for the background, `0` for tiles and `5` for the player, and bumps the player to `10` when they die so the falling body draws over everything. Changing `z` at runtime is fine; the scene re-sorts on the next draw.

## Lots of short-lived entities: pooling

Particles, bullets and sparks come and go constantly. Creating a new object for each one works, but in big numbers it feeds the garbage collector. A `Pool` keeps finished objects around for reuse:

```js
this.particles = new Pool(() => new Particle(), 80);

// spawn
this.add(this.particles.get().spawn(x, y, color, this.particles));

// inside Particle.update, when it's finished
this.destroy();
this.pool.release(this);
```

Your entity needs a method that resets its state (here `spawn`), because a reused object still holds whatever values it had last time. Destroying and re-adding the same entity within one step is supported, so a particle can be released and picked up again immediately: at the end of a step the scene applies removes before adds, so the re-added entity stays. Both example games' `Particle` classes show the whole pattern.

Pooled particles are still entities, so the debug overlay outlines them like everything else. Set `this.debug = false` in the particle's constructor to keep them out of it. [Debugging](11-debugging.md#hiding-things-from-the-overlay) covers this and other ways to customize the overlay.

## Circles

Entities are boxes by default. For round things, set the shape:

```js
super({ w: 10, h: 10, shape: 'circle' });   // radius defaults to half the smaller side
```

`Collision.overlaps` and `Collision.check` then use a circle test for this entity. The Breakout ball is a circle, and that's why it bounces off brick corners correctly instead of catching on an invisible square corner.
