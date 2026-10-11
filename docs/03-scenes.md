# Scenes

A scene is one screen of your game. The title screen is a scene. Level 1 is a scene. The pause menu is a scene. The "you win" screen is a scene.

Splitting a game this way stops one giant `if (state === 'menu') ... else if (state === 'playing') ...` from taking over your code. Each scene only knows about its own job, and moving between them is one line.

## The lifecycle

```js
class Level extends Scene {
  preload(assets) {}       // load files this scene needs (optional)
  enter(data) {}           // the scene starts
  update(dt, ctx) {}       // 60 times a second, after all entities updated
  render(r, alpha) {}      // every frame, after all entities drew
  exit() {}                // the scene is being removed
  resume(data) {}          // a scene that was pushed on top of this one was popped
}
```

You only write the ones you need. They're all empty by default.

The one rule worth tattooing somewhere: set up state in `enter`, not in the constructor. The engine creates a fresh instance every time you switch to a scene, then calls `enter`. Everything is set up in one obvious place, and restarting is free.

## Registering and switching

Scenes are registered under a name (a "key"), then started by that name:

```js
game.scenes
  .add('title', TitleScene)
  .add('play', PlayScene)
  .add('gameover', GameOverScene);

game.start('title');
```

Later, from anywhere inside a scene:

```js
this.game.scenes.switch('play', { level: 2, lives: 3 });
```

`switch` throws away every scene currently on screen (calling their `exit`), builds a new instance of `'play'`, and calls its `enter({ level: 2, lives: 3 })`.

Misspell a key and you get `Unknown scene "pley"` straight away, instead of a blank screen.

## Passing data between scenes

Whatever you pass as the second argument to `switch` arrives in `enter`. Use default values, so the scene also works when started with no data:

```js
enter({ level = 0, lives = 3, score = 0 } = {}) {
  this.level = level;
  this.lives = lives;
  this.score = score;
}
```

The platformer uses this for its "die and retry" logic. When the player dies, it switches to `'play'` again with the same level, one fewer life, and the score from when the level started:

```js
this.game.scenes.switch('play', { ...this.entry, lives: this.lives });
```

Because a switch builds a brand new scene, every coin and enemy comes back automatically. Look for `this.entry` in `examples/platformer/scenes/PlayScene.js`.

## The stack: push and pop

Sometimes you don't want to throw the current scene away. A pause menu should appear on top of the level, with the level frozen but still visible behind it.

```js
// in the level
if (input.justPressed('Escape')) this.game.scenes.push('pause');

// in the pause scene
if (input.justPressed('Escape')) this.game.scenes.pop();
```

Scenes live on a stack. `push` puts a new scene on top; `pop` removes the top one.

- Every scene on the stack draws, bottom to top. That's why the level stays visible.
- Only the top scene updates. That's why the level freezes.
- When you `pop`, the scene underneath gets `resume(data)`, in case it wants to react.

The pause scene in `examples/breakout/scenes/PauseScene.js` is about ten lines: a translucent rectangle over the whole screen, some text, and a `pop()` on keypress.

`switch` clears the whole stack, so switching to `'title'` from a pause menu leaves nothing behind.

## Switching during an update is safe

You'll often call `switch` from inside something else: a collision callback, a timer, an entity's `update`. If the engine swapped scenes right then, the rest of that update would run against a scene that's half torn down.

So it doesn't. A switch, push or pop requested during an update is queued and happens right after the update finishes. You can call them from anywhere without thinking about it.

The one side effect: right after calling `switch`, `game.scenes.current` is still the old scene until the update ends. That rarely matters, but now you know.

## Loading files before a scene starts

If `preload` returns a promise (an `async` function always does), the engine waits for it before calling `enter`, and shows a simple loading bar in the meantime:

```js
class Level extends Scene {
  async preload(assets) {
    await assets.load({
      images: { hero: 'img/hero.png', tiles: 'img/tiles.png' },
      audio: { jump: 'sfx/jump.wav' },
    });
  }

  enter() {
    const heroImage = this.ctx.assets.image('hero');
  }
}
```

Assets are cached by key, so coming back to this scene later doesn't download anything again, and the loading bar flashes by. More in [Assets and audio](10-assets-and-audio.md).

If `preload` isn't async and returns nothing, the scene starts immediately.

## What a scene gives you

Inside any scene you can use:

| Property | What it is |
| --- | --- |
| `this.game` | The `Game`. You need it for `this.game.scenes.switch(...)`. |
| `this.ctx` | The shared context: `{ game, input, assets, renderer, audio, events, scene, camera }`. Same object entities get. |
| `this.entities` | Every entity in the scene. Read it, don't change it directly. |
| `this.camera` | This scene's camera. See [The camera](07-camera.md). |
| `this.timer` | Timers that belong to this scene. See [Timers and tweens](09-timers-and-tweens.md). |
| `this.tween(...)` | Animate numbers over time. Same page. |
| `this.add / find / first / count` | Working with entities. See [Entities](04-entities.md). |
| `this.key` | The name this scene was registered under. |

## A common mistake: state outside the scene

```js
// ❌ score lives at the top of the file, outside the scene.
let score = 0;

class Play extends Scene {
  onCoin() {
    score += 10;
  }
}
```

Restart the level and the score carries on from last time, because nothing ever resets that variable. You'll find this bug the first time someone plays twice in a row.

```js
// ✅ The scene owns its state and gets it fresh in enter.
class Play extends Scene {
  enter({ score = 0 } = {}) {
    this.score = score;
  }

  onCoin() {
    this.score += 10;
  }
}
```

If a value really should survive a scene switch (score across levels, lives), pass it along explicitly in the `switch` data. If it should survive closing the browser (a high score), put it in `localStorage`.
