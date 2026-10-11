# The camera

As long as your whole game fits on one screen, you can ignore the camera. Breakout never moves it; it only uses it for screen shake. The moment your level is bigger than the screen, the camera is what decides which part of the world you see.

Every scene has its own camera at `this.camera` (entities can reach it through `this.scene.camera` or `ctx.camera`).

## Where the camera is

`camera.x` and `camera.y` are the world position shown at the center of the screen.

By default the camera starts centered on the screen itself (on a 320×180 game, at 160, 90), which makes world coordinates and screen coordinates line up. That's why one-screen games can ignore it.

Move it and the whole world shifts:

```js
this.camera.x += 100 * dt;   // scroll right at 100 pixels per second
```

The platformer's title screen does exactly this to make the background drift.

## Following the player

Usually you want the camera to stay on the player:

```js
this.camera.follow(this.player, { lerp: 0.15, offsetY: -16 });
```

`lerp` is how much of the remaining distance the camera covers each update. With `1`, the camera is locked to the player and every tiny movement jerks the screen. With `0.15`, it covers 15% of the gap per update. That feels smooth, catches up within a fraction of a second, and makes landings and direction changes much easier on the eyes. Values between 0.08 and 0.2 work for most games.

`offsetX`/`offsetY` shift the aim point. The platformer aims a little above the player (`offsetY: -16`), so you see more of what's above you than below.

`follow(null)` stops following. The platformer does that when the player dies, so the body falls off the bottom of the screen instead of the camera chasing it.

## Keeping the camera inside the level

Without limits, following the player near the left edge of the level shows empty space past the edge. Bounds fix that:

```js
this.camera.setBounds(0, 0, level.width, level.height);
```

The camera now never shows anything outside that rectangle. If the level is smaller than the screen in one direction, the camera centers it in that direction instead.

## Starting in the right place

When a level starts, the camera begins at its default position and then glides toward the player, which looks like a strange swoosh. Call `snap()` after setting things up to jump straight to the target:

```js
this.camera.follow(this.player, { lerp: 0.15 });
this.camera.setBounds(0, 0, this.level.w, this.level.h);
this.camera.snap();
```

## Screen shake

```js
this.camera.shake(6, 0.3);   // up to 6 pixels, fading out over 0.3 seconds
```

Shake is a random offset that gets smaller as time runs out. Small values go a long way: 2 for a stomp, 4 to 8 for taking damage or losing a life. If a new shake starts while one is running, the stronger of the two wins.

Shaking moves the world but not your scene's `render` HUD, because the HUD draws in screen space. That's usually what you want.

## Zoom

```js
this.camera.zoom = 2;   // everything twice as big; you see half as much
```

Zoom pairs well with tweens for dramatic moments: `this.tween(this.camera, { zoom: 1.5 }, 0.4, 'quadOut')`.

## Pixel art and shimmer

In `'pixel'` scale mode, a camera at x=103.37 would place every tile at a fractional position. The browser then blends edges and tiles appear to shimmer while scrolling. Turn on rounding:

```js
this.camera.roundPixels = true;
```

It's one line, and you only need it for pixel art.

## What's on screen right now

`camera.view` returns the rectangle of the world that's currently visible. Use it to skip drawing things that are off screen. The platformer's tile map only draws the tiles inside the view, around 250 instead of 1,650:

```js
const view = this.scene.camera.view;
const firstCol = Math.floor(view.x / TILE);
const lastCol = Math.floor((view.x + view.w) / TILE);
```

`view` returns the same object every time and updates it, so read what you need right away rather than keeping it around.

## Converting coordinates

```js
camera.screenToWorld(screenX, screenY)   // where in the world is this screen point?
camera.worldToScreen(worldX, worldY)     // where on screen is this world point?
```

For the mouse, you usually don't need these: `input.pointer.worldX` and `worldY` are already converted. `worldToScreen` is useful for screen-space UI that follows something in the world, such as a name tag or an offscreen-enemy arrow drawn in the scene's `render`.
