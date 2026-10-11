# Input

You ask the input system questions during `update`. You don't register callbacks.

```js
update(dt, { input }) {
  if (input.isDown('ArrowRight')) this.pos.x += 100 * dt;
  if (input.justPressed('Space')) this.jump();
}
```

## Why polling instead of events

The browser hands you input as events: `keydown`, `keyup`, `pointerdown`. It's tempting to do game logic straight in those handlers:

```js
// ❌
window.addEventListener('keydown', (e) => {
  if (e.code === 'Space') player.jump();
});
```

This goes wrong in a few ways. The handler runs whenever the browser feels like it, between your updates, so the jump happens at an unpredictable point in your frame. Holding a key fires `keydown` repeatedly (key repeat), so you get extra jumps. And to know whether a key is held right now, you end up tracking state yourself anyway.

h3-engine collects the events in the background, then once per update step, before anything else runs, takes a snapshot. During the whole update, every entity sees the same answers to the same questions.

## The three questions

```js
input.isDown('KeyA')          // held right now
input.justPressed('KeyA')     // went down this step
input.justReleased('KeyA')    // came up this step
```

`justPressed` is true for exactly one update. Use it for actions that should happen once per press: jumping, firing, opening a menu, confirming a choice. Use `isDown` for continuous things: walking, charging, holding a shield.

One detail that's easy to miss: a very fast tap (down and up within a single 1/60 s step) still counts. That step sees `justPressed`, `justReleased` and `isDown` all true. Without that, quick taps would sometimes just vanish.

Key repeat is ignored, so holding Space only produces one `justPressed`.

## Key names

Keys are named by `KeyboardEvent.code`, which describes the physical key and ignores the keyboard layout. `'KeyW'` is the key in the W position even on a French AZERTY keyboard, where it's labeled Z. That's what you want for WASD controls.

Common ones: `'ArrowLeft'`, `'ArrowRight'`, `'ArrowUp'`, `'ArrowDown'`, `'Space'`, `'Enter'`, `'Escape'`, `'ShiftLeft'`, `'KeyA'` to `'KeyZ'`, `'Digit1'`, `'Backquote'`. If you're not sure, open the browser console and run `addEventListener('keydown', e => console.log(e.code))`.

## Several keys for one action

Every key question also accepts an array, meaning "any of these":

```js
const JUMP = ['Space', 'ArrowUp', 'KeyW', 'KeyZ'];
if (input.justPressed(JUMP)) this.jump();
```

Define your controls as constants at the top of the file, like the examples do. Changing a control later is then a one-line edit.

## Axes

For left/right or up/down movement there's a shortcut:

```js
const dir = input.axis(['ArrowLeft', 'KeyA'], ['ArrowRight', 'KeyD']);   // -1, 0 or 1
this.vel.x = dir * SPEED;
```

The first argument is the negative direction. Holding both directions gives 0, which is usually what players expect.

## Mouse and touch

Mouse, pen and touch all come through one `input.pointer` object:

```js
const p = input.pointer;
p.x, p.y                  // position on screen, in logical pixels
p.worldX, p.worldY        // the same point in world coordinates (accounts for the camera)
p.down                    // button held / finger on screen
p.justPressed             // pressed this step
p.justReleased            // released this step
```

Logical pixels means the same coordinate system you draw in, so on a 640×480 game, `p.x` goes from 0 to 640 no matter how the canvas is scaled on the page.

Use `x`/`y` for UI (did they click the button at the top of the screen?). Use `worldX`/`worldY` for things in the level (did they click that enemy?). The difference only matters once the camera moves; see [The camera](07-camera.md).

Only the first finger is tracked. Multi-touch isn't supported yet.

The Breakout paddle shows a nice pattern for supporting mouse and keyboard together: if a movement key is held, use it; otherwise, if the pointer moved since last step, follow the pointer. That way neither input fights the other. Look at `Paddle.update` in `examples/breakout/entities/Paddle.js`.

## Things the input system does for you

- Arrow keys and Space don't scroll the page while the game runs.
- When the window loses focus (alt-tab, clicking another window), every key is treated as released. Without this, a player alt-tabbing while holding Right comes back to a character that runs right forever, because the browser never sent the `keyup`.
- The canvas has `touch-action: none`, so dragging a finger on it doesn't scroll or zoom the page.

## Testing input

Because input comes in through plain methods, you can drive it from tests or from the browser console:

```js
game.input.keyDown('Space');
game.input.poll();
game.input.justPressed('Space');   // true
```

`test/Input.test.js` has more examples. The [debugging page](11-debugging.md) uses the same trick to play a game automatically.
