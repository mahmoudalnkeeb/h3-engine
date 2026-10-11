# Changelog

All notable changes to this project are documented here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the project uses [Semantic Versioning](https://semver.org/). Before 1.0, minor versions may contain breaking changes; they'll be called out here.

## [Unreleased]

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
