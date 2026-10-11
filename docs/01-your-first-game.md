# Your first game

We're going to build Dodge: you're a blue square at the bottom of the screen, red rocks fall from the sky, and you move left and right to avoid them. When one hits you, the game shows how long you lasted. The finished version is in `examples/dodge/main.js`, and it's about 80 lines.

That's small, but it touches most of what you'll use in every game: a `Game`, two scenes, two kinds of entity, keyboard input, a repeating timer and a collision check.

## Step 1: a page with a canvas

Games draw onto a `<canvas>`. Create an `index.html`:

```html
<!doctype html>
<html>
  <body style="margin: 0; background: #08080c; display: grid; place-items: center; height: 100vh">
    <canvas id="game"></canvas>
    <script type="module" src="./main.js"></script>
  </body>
</html>
```

`type="module"` matters. The engine is written as ES modules, so you need it to use `import`.

You also need a local web server, because browsers won't load modules from `file://` URLs. Inside this repo, `npm run dev` does that for you. In your own project, anything that serves static files works.

## Step 2: start a game

In `main.js`:

```js
import { Game } from 'h3-engine';

const W = 480;
const H = 270;

const game = new Game({ canvas: '#game', width: W, height: H, background: '#10101a' });
game.start();
```

(Inside this repo, the examples import from `'../../src/index.js'` instead of `'h3-engine'`.)

Reload the page and you get a dark rectangle that scales up to fill the window. That rectangle is 480×270 no matter how big your monitor is. We call that the logical resolution: you always place things in those 480×270 "game pixels", and the engine handles scaling them to real screen pixels. [Drawing](06-drawing.md) explains this in more detail.

## Step 3: a scene

A scene is one screen of your game: a menu, a level, a game-over screen. Let's make the screen where you actually play.

```js
import { Game, Scene } from 'h3-engine';

class PlayScene extends Scene {
  enter() {
    this.time = 0;
  }

  update(dt) {
    this.time += dt;
  }

  render(r) {
    r.text(`${this.time.toFixed(1)}s`, 8, 8);
  }
}

const game = new Game({ canvas: '#game', width: W, height: H, background: '#10101a' });
game.scenes.add('play', PlayScene);
game.start('play');
```

There are three methods here, and every scene you write will use some of them.

`enter()` runs once, when the scene starts. Set up your starting state here, not in the constructor. That way restarting a level is just switching to the same scene again.

`update(dt)` runs 60 times a second. `dt` is the time that passed since the last update, in seconds, so it's always 1/60. Adding `dt` to `this.time` every update gives you a stopwatch.

`render(r)` draws. `r` is the renderer, and `r.text()` draws a string at x=8, y=8.

You should see a timer counting up in the corner.

## Step 4: the player

Things that move are entities. Each entity has a position (`pos`), a size (`w`, `h`) and its own `update` and `render`.

```js
import { clamp, Entity } from 'h3-engine';

const LEFT = ['ArrowLeft', 'KeyA'];
const RIGHT = ['ArrowRight', 'KeyD'];

class Player extends Entity {
  constructor() {
    super({ x: W / 2 - 12, y: H - 32, w: 24, h: 24, tags: ['player'] });
    this.speed = 220;
  }

  update(dt, { input }) {
    this.pos.x += input.axis(LEFT, RIGHT) * this.speed * dt;
    this.pos.x = clamp(this.pos.x, 0, W - this.w);
  }

  render(r) {
    r.rect(this.pos.x, this.pos.y, this.w, this.h, '#4cc9f0');
  }
}
```

A few things to notice.

`input.axis(LEFT, RIGHT)` returns -1 when a left key is held, 1 for right, and 0 for neither (or both). Multiplying by speed and `dt` gives "220 pixels per second, in whichever direction". Passing arrays means arrows and WASD both work.

Why multiply by `dt`? Because it makes speeds read in pixels per second, which is how people think. `speed = 220` means the player crosses the 480-pixel screen in a bit over two seconds. Get into the habit now; [the game loop page](02-game-loop.md) explains why it matters.

`clamp` keeps the player on screen.

`tags: ['player']` gives the entity a label. We'll use it for collision in a minute.

Now add the player when the scene starts:

```js
enter() {
  this.time = 0;
  this.add(new Player());
}
```

## Step 5: falling rocks

```js
import { rand, randInt } from 'h3-engine';

class Rock extends Entity {
  constructor() {
    const size = randInt(12, 28);
    super({ x: rand(0, W - size), y: -size, w: size, h: size, tags: ['rock'] });
    this.vel.y = rand(120, 220);
  }

  update(dt) {
    super.update(dt);
    if (this.pos.y > H) this.destroy();
  }

  render(r) {
    r.rect(this.pos.x, this.pos.y, this.w, this.h, '#f25f5c');
  }
}
```

This time we set a velocity (`vel`) instead of moving `pos` by hand. The base `Entity.update` moves `pos` by `vel * dt` for you, which is why we call `super.update(dt)`. Leave that line out and the rock just hangs at the top of the screen. That's the most common mistake people make with this engine, so remember it.

Rocks start just above the screen (`y: -size`) so they slide into view instead of popping in. Once a rock falls off the bottom we `destroy()` it, which removes it from the scene. Without that line, rocks would pile up off screen forever, and the game would slowly get slower.

Spawn one every half second using the scene's timer:

```js
enter() {
  this.time = 0;
  this.add(new Player());
  this.timer.every(0.5, () => this.add(new Rock()));
}
```

Why not `setInterval`? Because the scene's timer belongs to the scene. It stops when the game is paused, and it disappears when you switch scenes. A `setInterval` would keep spawning rocks into a scene that's no longer on screen. See [Timers and tweens](09-timers-and-tweens.md).

## Step 6: getting hit

```js
import { Collision } from 'h3-engine';

update(dt) {
  this.time += dt;
  Collision.check(this, 'player', 'rock', () => {
    if (this.over) return;
    this.over = true;
    this.game.scenes.switch('over', { time: this.time });
  });
}
```

`Collision.check` looks at every entity tagged `player` and every entity tagged `rock`, and calls your function for each pair that overlaps.

The `this.over` flag looks odd, so here's why it's there. If two rocks hit you in the same update, the callback runs twice, and you'd ask to switch scenes twice. That wouldn't crash, but it's sloppy, and in a bigger game it causes real bugs, like a "lose a life" function running twice. Set `this.over = false` in `enter()` too.

The second argument to `switch` is data for the next scene. Here we pass along how long the player survived.

## Step 7: the game-over screen

```js
class GameOverScene extends Scene {
  enter({ time }) {
    this.time = time;
  }

  update(_dt, { input }) {
    if (input.justPressed('Space')) this.game.scenes.switch('play');
  }

  render(r) {
    r.text('Game over', W / 2, 100, { font: 'bold 32px sans-serif', align: 'center' });
    r.text(`You lasted ${this.time.toFixed(1)} seconds`, W / 2, 145, { align: 'center' });
    r.text('Press Space to try again', W / 2, 175, { font: '14px sans-serif', color: '#8888aa', align: 'center' });
  }
}

game.scenes.add('play', PlayScene).add('over', GameOverScene);
```

`enter({ time })` receives the data we passed to `switch`.

`input.justPressed('Space')` is true only during the one update in which Space went down. If you used `isDown` here, holding Space would restart the game over and over, 60 times a second.

Switching to `'play'` builds a brand new `PlayScene`. The old rocks, the old player and the old timer are all gone, and `enter()` runs again. That's how restarting works: you don't reset anything by hand.

## That's a game

Compare what you have with `examples/dodge/main.js`. If something doesn't work, the [debugging page](11-debugging.md) has a list of the usual suspects.

Some things to try next, roughly in order of difficulty:

- Make rocks fall faster as time goes on. Hint: `this.vel.y = rand(120, 220) + scene.time * 10`, but how does a Rock find out the time? (It can read `this.scene.time`.)
- Add a high score that survives restarts. `localStorage` works fine; `examples/breakout/storage.js` does exactly this.
- Add a title screen scene that shows before `'play'`.
- Play a sound when you get hit: `this.ctx.audio.tone({ freq: 200, to: 60, duration: 0.4 })`. See [Assets and audio](10-assets-and-audio.md).
- Shake the screen on hit: `this.camera.shake(6, 0.3)`. Note that you'll have to delay the scene switch to actually see it, which is a good reason to read [Timers and tweens](09-timers-and-tweens.md).
