# The game loop

Every game is a loop: read input, move things, draw, repeat. The browser gives you `requestAnimationFrame`, which calls you once per screen refresh. Most beginner games put everything in that callback, and it works fine on the developer's laptop.

Then someone plays it on a 144 Hz gaming monitor, and everything runs more than twice as fast.

## The problem with one update per frame

Say your player moves 3 pixels per frame:

```js
function frame() {
  player.x += 3;
  draw();
  requestAnimationFrame(frame);
}
```

At 60 Hz that's 180 pixels per second. At 144 Hz it's 432. At 30 Hz on a struggling phone it's 90. The game's speed now depends on hardware you don't control.

The usual first fix is "multiply by delta time": measure how long the frame took and scale movement by it. That fixes the speed, but it brings a quieter problem. Your physics now runs with a different `dt` every frame, so a jump on a 144 Hz screen doesn't reach quite the same height as on a 60 Hz one. Rounding errors build up differently. A frame hitch can give you a `dt` of half a second, and the player teleports through a wall.

## What h3-engine does: a fixed timestep

The engine separates two questions: how often to update, and how often to draw.

Updates always happen at 60 per second, each with exactly `dt = 1/60`. Drawing happens once per screen refresh, however fast the screen is. A loop in `src/core/Loop.js` sits between them and keeps count.

Think of it as a jar that fills with time. Each animation frame, the time since the last frame gets poured into the jar. While the jar holds at least 1/60 of a second, the loop runs one update and takes 1/60 out. Then it draws.

- On a 60 Hz screen, each frame adds about 1/60, so you get one update per frame.
- On a 144 Hz screen, most frames don't add enough, so some frames run zero updates and just redraw. Over a second it still adds up to 60.
- On a 30 Hz screen, each frame adds about 2/60, so you get two updates per frame.

The test file `test/Loop.test.js` checks exactly these three cases.

The result is that your `update` code can treat `dt` as a constant. A jump is the same height everywhere. Replays and tests are repeatable.

## The 250 ms safety limit

If the browser stalls for 5 seconds (you switched tabs, or the laptop went to sleep), pouring 5 seconds into the jar would mean running 300 updates in one go. That's slow enough to cause another stall, which makes the next frame even longer. This feedback loop is sometimes called the spiral of death.

So the loop never pours more than 0.25 seconds per frame, which is at most 15 updates. After a long stall, the game just picks up where it was, slightly behind the clock. Nobody notices.

The loop also pauses completely when the tab is hidden, and doesn't try to catch up when you come back. The game emits `hidden` and `visible` when this happens, so you can open a pause menu for when the player returns:

```js
game.on('visible', () => {
  if (game.scenes.current?.key === 'play') game.scenes.push('pause');
});
```

## What `alpha` is for

After the updates, there's usually a little time left in the jar, less than one step. `render(r, alpha)` receives that leftover as a fraction between 0 and 1.

Most games can ignore it. If you notice slight stutter on high-refresh screens with fast-moving objects, you can use `alpha` to draw objects slightly between their previous and current positions. None of the examples bother, and they look fine at 60 Hz.

## The order of one update

Here's what happens in each 1/60 s step, in order. It's worth knowing when something runs "one frame late".

1. `input.poll()` takes a snapshot of the keyboard and pointer (see [Input](05-input.md)).
2. Every active entity's `update(dt, ctx)` runs, in draw order: lowest `z` first, and in the order they were added when `z` is equal.
3. The scene's timers fire (`scene.timer`).
4. The scene's tweens advance (`scene.tween`).
5. The scene's own `update(dt, ctx)` runs. This is the place for collision checks, since everything has finished moving.
6. The camera moves.
7. Entities added or destroyed during this step are actually added or removed (see [Entities](04-entities.md)).
8. Scene switches requested during this step happen (see [Scenes](03-scenes.md)).

Drawing happens after all the updates for that frame: every scene on the stack, bottom to top. Within a scene, entities draw in world space through the camera, then the scene's own `render` draws in screen space.

## Units, once and for all

- Time is always in seconds. `dt` is `0.01666...`, not `16.6`. Timer delays are seconds. Tween durations are seconds.
- Speeds are pixels per second. Accelerations are pixels per second per second.
- Angles are radians. `Math.PI` is half a turn.
- `y` grows downward. `vel.y = -300` means moving up. Gravity is a positive number.

If something moves 1000 times too fast or too slow, you probably mixed up milliseconds and seconds.

## Pausing

`game.pause()` stops updates and drawing; the canvas keeps the last frame. `game.resume()` picks up again without catching up on the paused time.

For an in-game pause menu you usually want something different: the level frozen behind a "Paused" overlay. That's done with scenes, not `game.pause()`. See the push/pop section of [Scenes](03-scenes.md).
