# Changelog

All notable changes to this project are documented here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the project uses [Semantic Versioning](https://semver.org/). Before 1.0, minor versions may contain breaking changes; they'll be called out here.

## [Unreleased]

### Added

- `Game` option `renderer`: the rendering backend class. Defaults to `CanvasRenderer`.
- `CanvasRenderer`: the Canvas 2D backend, exported for typing and subclassing. `r.ctx` lives here.
- `Renderer#beginFrame()` and `Renderer#endFrame()`: frame hooks the game calls around each render.
- `Entity#debug`: set to `false` to hide an entity from the debug overlay.
- `Entity#drawDebug(r, color, lineWidth)`: override to draw custom debug info, like velocity or sensors.
- `Debug#ignoreTags`: hides every entity with one of these tags from the overlay.
- `Debug#watch(label, read)` and `Debug#unwatch(label)`: show your own values in the stats panel.
- `Debug#shows(entity)`: whether the overlay draws an entity.
- The overlay's entity line now reads `entities N (shown M)`, and the panel widens to fit its longest line.

### Changed

- `Renderer` is now an abstract base class that defines the drawing API. Its drawing methods throw unless a backend overrides them, so construct `CanvasRenderer` instead of `Renderer`. Canvas sizing moved into an internal `Viewport`.
- `TextOptions.align` and `baseline` are typed as string unions instead of the DOM `CanvasTextAlign`/`CanvasTextBaseline` types.
- The Breakout and platformer examples are split into one entity or scene per file, with shared `config.js`, `audio.js` and level data modules.

### Fixed

- The debug overlay drew circle hitboxes as boxes. It now draws them as circles, matching `Collision`.

## [0.1.0] - 2026-10-11

First public version.

### Added

- Core: `Game`, fixed-timestep `Loop`, `Scene` with deferred entity adds and removes, `SceneManager` with switch, push and pop, and an `Events` emitter.
- Rendering: `Renderer` with logical resolution and fit or pixel-perfect scaling, plus `Camera`, `Sprite`, `SpriteSheet` and `Animation`.
- Gameplay: `Entity`, `Collision` (AABB, circle, resolve, tag checks), `Timer`, `Tween` and `Ease`.
- Platform: polled keyboard and pointer `Input`, an `Assets` loader, and Web Audio `Audio` with synthesized tones.
- Utilities: `Vec2`, `Rect`, `Pool`, math helpers and a `Debug` overlay.
- Examples: Dodge, Breakout and a platformer.
- A beginner guide in `docs/` and JSDoc for the full public API.
