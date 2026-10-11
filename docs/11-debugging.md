# Debugging

## The debug overlay

Press the backquote key (`` ` ``, below Esc on most keyboards) in any game. You'll get:

- FPS: frames drawn per second. It depends on your screen; 60, 120 and 144 are all normal.
- UPS: updates per second. This should sit at 60. If it drops, your `update` code is too slow for the machine.
- The number of entities in the current scene.
- The current scene's key.
- A green box around every entity's hitbox.

The hitboxes answer most collision questions instantly. "Why did that hit me?" usually turns out to be "because the hitbox is bigger than the drawing".

You can also turn it on from code with `new Game({ debug: true })`, or toggle `game.debug.enabled`.

## Poke at the game from the console

Each example ends with:

```js
globalThis.game = game;
```

That puts the game on `window`, so you can open the browser console and look around:

```js
game.scenes.current                  // the running scene
game.scenes.current.entities.length  // how many entities?
game.scenes.current.find('enemy')    // every enemy
game.scenes.current.player.pos       // where's the player?
game.scenes.switch('play', { level: 1 })   // jump straight to level 2
```

Jumping straight to the level you're working on saves a lot of replaying. Do the same in your own game; it's one line. Just keep it out of the engine itself, which deliberately has no globals.

## Stepping the game by hand

Sometimes you want the game to stop and advance one step at a time, or run without a visible window (in a test, for example, or when the browser throttles a background tab). The game loop calls two internal methods you can call yourself:

```js
game.pause();                           // stop the automatic loop
game._update(1 / 60);                   // run exactly one update step
game._render(0);                        // draw the current state

const run = (seconds) => {
  for (let i = 0; i < seconds * 60; i++) game._update(1 / 60);
  game._render(0);
};
run(2);   // fast-forward two seconds instantly
```

Combine that with fake input and you can script a whole play session:

```js
game.input.keyDown('ArrowRight');
run(1);                               // walk right for a second
game.input.keyDown('Space');
run(0.5);                             // jump
game.input.keyUp('Space');
game.input.keyUp('ArrowRight');
game.scenes.current.player.pos        // where did we end up?
```

That's how the example games were tested while they were being built. The names start with an underscore because they aren't part of the public API and could change, so use them for debugging, not in your game code.

## Common mistakes

Most "the engine is broken" moments turn out to be one of these.

| Symptom | Likely cause |
| --- | --- |
| An entity has velocity but doesn't move. | You overrode `update` and forgot `super.update(dt)`. |
| Things move 1000 times too fast or too slow. | You used milliseconds somewhere. Everything in the engine is seconds. |
| The score, lives or text scroll off with the level. | You drew the HUD inside an entity. Draw it in the scene's `render`, which is screen space. |
| Holding a key triggers something over and over. | You used `isDown` where you meant `justPressed`. |
| A quick key press sometimes does nothing. | You're reading raw DOM events. Use `input.justPressed`, which never misses a press. |
| Something keeps happening after switching scenes. | You used `setTimeout`/`setInterval`. Use `this.timer`, which ends with the scene. |
| Something that should happen once happens twice. | Two collisions fired in the same step. Guard with a flag, like Dodge's `this.over`. |
| A new entity isn't in `scene.entities` yet. | Adds during an update are applied at the end of the step. Check next step, or keep your own reference. |
| Everything drawn after one entity is see-through. | That entity set `r.alpha` and didn't set it back. Reset it, or wrap the drawing in `r.push()`/`r.pop()`. |
| The game gets slower the longer you play. | Entities leave the screen but are never destroyed. Watch the entity count in the debug overlay. |
| The player snags on a flat floor of tiles. | Move and resolve X and Y separately. See [Collision](08-collision.md). |
| Fast objects pass through walls. | Tunneling. Use smaller steps or thicker walls. Also [Collision](08-collision.md). |
| No sound at all. | Audio is locked until the first click or key press. See [Assets and audio](10-assets-and-audio.md). |
| Images or sounds fail to load. | Paths are relative to the HTML page, not the JS file. Check the network tab. |
| Blank page, error about modules or CORS. | You opened the HTML file directly. Run `npm run dev`. |
| Restarting a level keeps old values. | State lives outside the scene, at the top of a file. Move it into `enter`. |

## Unit tests

The engine's own tests live in `test/` and run with `npm test`. They're also good documentation: if you want to know exactly what happens when an entity is added and destroyed in the same step, `test/Scene.test.js` has a test with that name. `test/helpers.js` has `fakeGame()` and `step()`, which run scenes in Node without a browser. You can use them to test your own game logic the same way.
