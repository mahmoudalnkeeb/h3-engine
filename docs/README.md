# The h3-engine guide

This guide is for people who know some JavaScript but haven't built a game before, or have only built one by stuffing everything into a single `requestAnimationFrame` callback until it fell over. Each page explains one part of the engine: what it does, why it works that way, and the mistakes we see most often.

The engine source carries JSDoc on every public class and method, so your editor shows types and a one-line description as you type. That's the reference. It deliberately stays short, and there are no comments inside function bodies. The why behind each design lives here instead, where there's room to explain things properly. If you're reading a file in `src/` and something seems odd, the matching page below should tell you why.

## Reading order

If you're new, read the first three pages in order. After that, jump to whatever your game needs.

1. [Your first game](01-your-first-game.md): build a small dodging game in about 80 lines. Start here.
2. [The game loop](02-game-loop.md): why `update` gets a fixed `dt` and what "60 updates per second" really means.
3. [Scenes](03-scenes.md): menus, levels, pause screens, and passing data between them.
4. [Entities](04-entities.md): the things that move around in your game, and how they get added and removed safely.
5. [Input](05-input.md): keyboard, mouse and touch, and why we poll instead of using callbacks.
6. [Drawing](06-drawing.md): logical resolution, screen space vs world space, sprites and animation.
7. [The camera](07-camera.md): scrolling levels, following the player, screen shake.
8. [Collision](08-collision.md): checking overlaps, pushing things apart, and tile-based platformer movement.
9. [Timers and tweens](09-timers-and-tweens.md): "do this in 2 seconds" and "slide this over half a second".
10. [Assets and audio](10-assets-and-audio.md): loading images and sounds, and the browser's audio unlock rule.
11. [Debugging](11-debugging.md): the debug overlay, stepping a game by hand, and a list of common mistakes.

For exact signatures, hover anything in your editor: every public class and method has JSDoc, and the npm package ships matching `.d.ts` files.

## Running the examples

```bash
npm install
npm run dev
```

Then open http://localhost:5173/examples/. There are three games there. `dodge` is the one from the first page of this guide. `breakout` and `platformer` are bigger, and most pages here point at them for real-world examples. Reading their source alongside the guide is the fastest way to learn the engine.
