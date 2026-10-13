import { Events } from '../src/core/Events.js';
import { SceneManager } from '../src/core/SceneManager.js';

/** Minimal stand-in for `Game`, enough to run scenes without a DOM. */
export const fakeGame = () => {
  const game = {
    width: 320,
    height: 180,
    _stepping: false,
    assets: { progress: 1 },
    events: new Events(),
    ctx: { scene: null, camera: null },
  };
  game.ctx.game = game;
  game.scenes = new SceneManager(game);
  return game;
};

/** Run one fixed step on the current scene, the way `Game._update` does. */
export const step = (game, dt = 1 / 60) => {
  game._stepping = true;
  game.scenes.current._step(dt);
  game._stepping = false;
  game.scenes._flush();
};

/** Records draw calls instead of drawing. */
export const fakeRenderer = () => {
  const calls = [];
  const record =
    (name) =>
    (...args) =>
      calls.push([name, ...args]);
  return {
    calls,
    pixelScale: 1,
    push: record('push'),
    pop: record('pop'),
    translate: record('translate'),
    scale: record('scale'),
    rect: record('rect'),
    strokeRect: record('strokeRect'),
    strokeCircle: record('strokeCircle'),
    line: record('line'),
    text: record('text'),
  };
};
