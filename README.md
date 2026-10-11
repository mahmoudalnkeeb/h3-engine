# h3-engine

A small 2D game engine for the HTML canvas. It covers the parts every browser game needs and stays out of the way for the rest: a fixed-timestep loop, scenes, entities, polled input, collision, a camera, timers, tweens, asset loading and sound.

It's plain JavaScript (ES modules) with zero runtime dependencies, and the whole library is 9.4 KB minified and gzipped. The source is short enough to read in an afternoon, which is the point.

```js
import { Entity, Game, Scene } from 'h3-engine';

class Player extends Entity {
  update(dt, { input }) {
    this.pos.x += input.axis('ArrowLeft', 'ArrowRight') * 200 * dt;
  }

  render(r) {
    r.rect(this.pos.x, this.pos.y, this.w, this.h, '#4cc9f0');
  }
}

class Level extends Scene {
  enter() {
    this.add(new Player({ x: 100, y: 100, w: 32, h: 32 }));
  }
}

const game = new Game({ canvas: '#game', width: 640, height: 360 });
game.scenes.add('level', Level);
game.start('level');
```

## Getting started

The engine isn't on npm yet. Clone the repo and run the examples:

```bash
npm install
npm run dev
```

Then open http://localhost:5173/examples/. You need Node.js 20.11 or newer.

There are three example games, each in its own folder under `examples/`:

- `dodge` is about 80 lines. It's the game the guide builds step by step.
- `breakout` has mouse, touch and keyboard controls, power-ups, multi-ball, pooled particles and a pause overlay.
- `platformer` has two scrolling levels from ASCII maps, tile collision, one-way platforms, enemies you can stomp, and a camera that follows the player.

Press `` ` `` in any of them to toggle the debug overlay (FPS, entity count, hitboxes).

## Documentation

If you're new to making games, start with [the guide](docs/README.md). It begins by building Dodge, then gives each subsystem its own page: the game loop, scenes, entities, input, drawing, the camera, collision, timers and tweens, assets and audio, and debugging. Each page explains why the engine works the way it does and lists the mistakes people usually make.

For exact signatures, use your editor. Every public class and method has JSDoc with types, units and edge cases, and `npm run build` generates matching `.d.ts` files.

## How it works, briefly

Updates run at a fixed 60 per second, whatever the display's refresh rate, so `dt` is always 1/60 and physics behaves the same on every machine. Rendering runs once per frame.

All drawing uses a logical resolution you choose (say 320×180). The renderer scales it to fit the window, handling high-DPI screens, with an option for crisp integer scaling for pixel art.

Entities are plain classes with `update` and `render`, not an entity-component system. Adds and removes made during an update are applied when the step ends, so spawning or destroying things mid-loop is always safe.

Input is polled. Events are buffered and snapshotted once per step, so `justPressed` is true for exactly one update and short taps are never lost.

Scenes live on a stack. `switch` replaces everything, while `push` and `pop` handle overlays like pause menus.

## Development

```bash
npm test                          # unit tests (Vitest)
npx vitest run test/Scene.test.js # one test file
npm run lint                      # Biome lint and format check
npm run format                    # apply Biome fixes
npm run typecheck                 # type-check the JSDoc
npm run build                     # dist/ bundles and .d.ts files; fails if over the size budget
```

CI runs lint, typecheck, tests and build on every push.

See [CONTRIBUTING.md](CONTRIBUTING.md) for the full rules. The short version: Public API gets JSDoc; nothing else in `src/` gets comments. Time is in seconds, distance in pixels and angles in radians. Hot paths (loop, rendering, collision) don't allocate per frame. Every bug fix comes with a regression test. Commits follow Conventional Commits (`feat:`, `fix:`, `docs:`, `refactor:`).

## Status

Pre-1.0. The API may still change in minor versions.

Done: the loop, renderer, input, scenes, entities, assets, sprites and animation, collision, camera, timers, tweens, audio, debug overlay and object pooling, with 68 unit tests. Sprites and animation are covered by tests but not used by an example yet, since the examples draw everything with shapes.

Before 1.0: publish to npm, and add an example that uses image assets.

After 1.0, maybe: particles, Tiled map import, a spatial hash for large collision checks, gamepad input, a save/load helper, and a WebGL renderer behind the same interface.

Not planned: 3D, a physics engine, a visual editor, networking.

| Budget | Target | Now |
| --- | --- | --- |
| Full bundle, min + gzip | < 20 KB | 9.4 KB |
| Runtime dependencies | 0 | 0 |

Browser support: the last two versions of Chrome, Firefox, Safari and Edge, plus iOS Safari 15+.

## License

[MIT](LICENSE). Security issues: see [SECURITY.md](SECURITY.md).
