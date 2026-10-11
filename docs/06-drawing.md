# Drawing

All drawing goes through the renderer, the `r` your `render(r)` methods receive. It wraps the browser's canvas 2D API and handles the annoying parts: screen sizes, high-DPI displays and scaling.

## Logical resolution

When you create the game you choose a resolution:

```js
new Game({ width: 320, height: 180 });
```

From then on, the screen is 320×180 as far as your code is concerned. Position 0,0 is the top-left corner, 320,180 is the bottom-right, and `y` grows downward. That's true whether the game ends up in a small browser window or full screen on a 4K monitor.

The engine scales those logical pixels up to whatever space is available. The `scale` option controls how:

| `scale` | What happens | Good for |
| --- | --- | --- |
| `'fit'` (default) | Scales smoothly to fill as much of the window as possible, keeping the aspect ratio. | Most games, anything with smooth shapes or text. |
| `'pixel'` | Scales only by whole numbers of real screen pixels, and turns off image smoothing. Every game pixel becomes a sharp square. | Pixel-art games. The platformer uses this at 320×180. |
| `'none'` | No scaling. One logical pixel is one CSS pixel. | Embedding the canvas in a page layout you control. |

On high-DPI screens (most phones, Retina Macs) the canvas also gets extra real pixels behind the scenes, so lines and text stay crisp. You don't have to do anything for that.

Picking a resolution: 320×180, 480×270 and 640×360 all scale cleanly to 1920×1080 (by 6×, 4× and 3×). Breakout uses 640×480 because its playfield is closer to square.

## Shapes and text

```js
r.rect(x, y, w, h, color)
r.strokeRect(x, y, w, h, color, lineWidth)
r.circle(x, y, radius, color)
r.strokeCircle(x, y, radius, color, lineWidth)
r.line(x1, y1, x2, y2, color, lineWidth)
r.poly([x0, y0, x1, y1, x2, y2], color)
r.text('Score 100', x, y, { font: 'bold 16px sans-serif', color: '#fff', align: 'left', baseline: 'top' })
```

Colors are any CSS color string: `'#f25f5c'`, `'red'`, `'rgba(0, 0, 0, 0.5)'`.

Text is positioned by its top-left corner by default (`baseline: 'top'`), which matches how rectangles work. To center text, use `align: 'center'` and pass the center x. Add `baseline: 'middle'` to center vertically too.

`poly` takes a flat list of numbers, not an array of points. The platformer draws its spikes as two triangles this way.

You can build a surprising amount from rectangles alone. Every visual in both example games is rectangles, circles, triangles and text, without a single image file. Look at `Player.render` in `examples/platformer/entities.js`: the body, the highlight, the eyes and the pupils are all `r.rect` calls.

## Transparency and transforms

```js
r.alpha = 0.5;       // everything after this is half transparent
r.rect(...);
r.alpha = 1;         // put it back
```

If you change `alpha`, put it back when you're done; it stays set for everything drawn after you, including other entities. The other option is `push`/`pop`, which save and restore everything at once:

```js
r.push();
r.translate(this.cx, this.cy);
r.rotate(this.rotation);
r.alpha = 0.8;
r.rect(-8, -8, 16, 16, '#fff');   // drawn centered on the entity, rotated
r.pop();                          // translate, rotate and alpha all undone
```

Rotation happens around the current origin (0,0), so translate to the point you want to spin around first. Angles are in radians.

## World space and screen space

This is the one idea about drawing you really need to understand.

Entities draw in world space. If the platformer's level is 1,760 pixels wide, a coin at x=1500 is drawn at x=1500. The camera decides which part of the world shows up on screen. Entities never need to know where the camera is.

The scene's own `render(r)` draws in screen space, after all the entities. 0,0 is always the top-left corner of the screen, wherever the camera is. That's where your HUD goes: score, lives, timers, "Paused".

```js
class Play extends Scene {
  render(r) {
    r.text(`Score ${this.score}`, 8, 8);   // stays in the corner even as the camera scrolls
  }
}
```

```js
// ❌ Drawing the HUD inside an entity. It's in world space, so it scrolls away with the level.
class Player extends Entity {
  render(r) {
    r.rect(this.pos.x, this.pos.y, this.w, this.h, '#f00');
    r.text(`Lives ${this.lives}`, 8, 8);
  }
}
```

If you've never moved the camera, world space and screen space happen to line up, which is why this mistake only shows up later.

## Draw order

Entities draw sorted by `z` (low first, so high `z` ends up on top), then in the order they were added. After that, the scene's `render` draws on top of all of them. When several scenes are on the stack (a pause menu over a level), they draw bottom to top.

## Images and sprites

Once an image is loaded (see [Assets and audio](10-assets-and-audio.md)):

```js
r.image(assets.image('logo'), x, y);
r.image(img, x, y, { w: 64, h: 64, rotation: 0.3, flipX: true, alpha: 0.5, originX: 0.5, originY: 0.5 });
```

`originX`/`originY` set the anchor point as a fraction of the size: `0, 0` is the top-left (the default), `0.5, 0.5` is the center, `0.5, 1` is the bottom-center. The image is placed so that its anchor lands on `x, y`, and rotation spins around the anchor. Bottom-center is handy for characters, because `y` then means "where the feet are".

A sprite sheet is one image holding many frames in a grid. `SpriteSheet` cuts it up, and `Animation` plays frames in sequence:

```js
const sheet = new SpriteSheet(assets.image('hero'), { frameW: 16, frameH: 16, originX: 0.5, originY: 1 });

this.anim = new Animation(sheet, {
  idle: { frames: [0, 1], fps: 4 },
  run: { frames: [2, 3, 4, 5], fps: 12 },
  die: { frames: [6, 7, 8], fps: 8, loop: false },
});

// update
this.anim.play(Math.abs(this.vel.x) > 0 ? 'run' : 'idle');
this.anim.update(dt);

// render
r.sprite(this.anim.current, this.cx, this.pos.y + this.h, { flipX: this.facing < 0 });
```

Frames are numbered left to right, top to bottom, starting at 0. Calling `play` with the animation that's already running does nothing, so you can call it every update without restarting the animation each time. Pass `true` as the second argument to force a restart. Non-looping animations stop on their last frame and call `anim.onComplete(name)` if you set it.

Neither example game uses images yet, so this part of the engine is covered only by unit tests (`test/gameplay.test.js`).

## The escape hatch

`r.ctx` is the raw `CanvasRenderingContext2D`. If you need something the renderer doesn't wrap (gradients, shadows, clipping, `roundRect`), use it directly. Coordinates are still logical pixels, and the camera transform still applies. Wrap custom drawing in `r.push()`/`r.pop()` so your style changes don't leak into the next entity.
