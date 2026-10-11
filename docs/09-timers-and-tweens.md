# Timers and tweens

Two things come up in every game:

- "Do this later." Respawn in 1.5 seconds. Spawn an enemy every 3 seconds. Show "Game over" for a second before going to the menu.
- "Change this smoothly." Fade the title in. Slide bricks into place. Grow the paddle over a quarter second.

Timers handle the first; tweens handle the second.

## Why not setTimeout?

```js
// ❌
setTimeout(() => this.respawn(), 1500);
```

`setTimeout` knows nothing about your game. It keeps counting while the game is paused. It fires after you've switched to another scene, calling `respawn` on a level nobody is looking at anymore. It uses milliseconds while the rest of the engine uses seconds. And it fires between updates, not as part of one.

Scene timers have none of those problems:

```js
// ✅
this.timer.after(1.5, () => this.respawn());
```

They advance with the game's update steps, so they pause when the game pauses. They belong to the scene, so they're thrown away when the scene is. They use seconds. And they run inside the update, so anything they add or destroy is handled safely (see [Entities](04-entities.md)).

## Timers

```js
const handle = this.timer.after(2, () => this.openDoor());   // once, in 2 seconds
const spawner = this.timer.every(0.5, () => this.spawnRock()); // every half second

spawner.cancel();   // stop it
```

Both return a handle with `cancel()`. Keep the handle if you might need to stop the timer early.

Breakout's wide-paddle power-up shows a nice use for this. Catching a second power-up while the first is still running should restart the 10 seconds, not stack another timer:

```js
if (this.wideTimer) this.wideTimer.cancel();
else this.paddle.resize(this.paddle.baseW * 1.6);
this.wideTimer = this.timer.after(10, () => {
  this.wideTimer = null;
  this.paddle.resize(this.paddle.baseW);
});
```

A few behaviors worth knowing:

- If a frame stalls, an `every` timer catches up and fires as many times as it missed, up to the loop's 250 ms limit. Usually that's what you want: the spawn rate stays correct.
- A timer created inside another timer's callback starts counting from the next update.
- Timers are scene-scoped. When the scene ends, its timers go with it. There's nothing to clean up.

Delaying a scene switch is one of the most common uses. Instant game-overs feel abrupt; giving the player a beat to see what happened feels much better:

```js
this.camera.shake(8, 0.4);
this.timer.after(1, () => this.game.scenes.switch('gameover', { score: this.score }));
```

## Tweens

A tween changes numbers from their current value to a target value over a set time:

```js
this.tween(this.logo, { alpha: 1, y: 40 }, 0.6, 'quadOut');
```

Over 0.6 seconds, `this.logo.alpha` goes from whatever it is now to 1, and `this.logo.y` goes to 40. The target can be any object with numeric properties: an entity, a vector, a camera, a plain object you made up for a UI effect.

That last one is a handy trick. The platformer's level-name banner is just an object, and the scene's `render` reads from it:

```js
this.banner = { text: '1-1  Green Hills', alpha: 1 };
this.tween(this.banner, { alpha: 0 }, 0.6, 'quadIn', { delay: 1.4 });
```

To tween a position, pass the vector itself:

```js
this.tween(brick.pos, { y: 64 }, 0.6, 'backOut');   // not brick, brick.pos
```

## Easing

Easing is what makes a tween feel alive instead of mechanical. `'linear'` moves at a constant speed, which tends to look robotic. The others speed up, slow down or overshoot:

| Ease | Feels like | Use it for |
| --- | --- | --- |
| `linear` | Constant speed | Fades, progress bars |
| `quadOut`, `cubicOut` | Fast start, gentle stop | Most UI movement. Things arriving. |
| `quadIn`, `cubicIn` | Slow start, fast end | Things leaving or falling away |
| `quadInOut`, `cubicInOut`, `sineInOut` | Slow, fast, slow | Moving between two resting points |
| `backOut` | Overshoots a little, then settles | Things popping into place. Breakout's bricks. |
| `elasticOut` | Wobbles like a spring | Playful pop-ups, use sparingly |
| `bounceOut` | Bounces like a dropped ball | Things landing |

You can also pass your own function that maps 0..1 to 0..1.

If you're not sure, start with `quadOut`. It's almost never wrong.

## Options

```js
this.tween(target, props, duration, ease, {
  delay: 0.2,                 // wait before starting
  onUpdate: (t) => {},        // every step, with progress 0..1
  onComplete: () => {},       // when it finishes
});
```

Delays are how Breakout makes its bricks cascade in one after another: each brick gets a slightly bigger delay than the one before it. See `buildLevel` in `examples/breakout/scenes/PlayScene.js`.

Start values are read when the tween actually starts, after the delay, not when you create it. So if something else moves the object during the delay, the tween starts from wherever it ended up.

## Waiting for a tween

Tweens can be awaited, which makes sequences read top to bottom:

```js
async playIntro() {
  await this.tween(this.title, { y: 60 }, 0.5, 'backOut');
  await this.tween(this.subtitle, { alpha: 1 }, 0.3);
  this.ready = true;
}
```

`tween.cancel()` stops a tween where it is. Its `onComplete` doesn't run, but anything awaiting it carries on, so a cancelled sequence doesn't hang forever.

## When to just write the math

Tweens are for changes that have a known start, end and duration. Things that respond to the game every frame, like a camera following the player or a character speeding up while you hold Right, are better written directly in `update`. The platformer's squash-and-stretch uses `approach` for this:

```js
this.sx = approach(this.sx, 1, dt * 3);   // ease the scale back toward 1, a little each step
```
