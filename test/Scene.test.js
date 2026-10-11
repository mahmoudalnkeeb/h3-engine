import { describe, expect, it, vi } from 'vitest';
import { Scene } from '../src/core/Scene.js';
import { Entity } from '../src/gameplay/Entity.js';
import { fakeGame, fakeRenderer, step } from './helpers.js';

describe('Scene entities', () => {
  it('adds immediately outside an update step', () => {
    const scene = new Scene(fakeGame());
    const e = scene.add(new Entity());
    expect(scene.entities).toEqual([e]);
    expect(e.scene).toBe(scene);
  });

  it('defers adds and removes made during a step until it ends', () => {
    const game = fakeGame();
    const seen = [];
    class Spawner extends Entity {
      update() {
        seen.push(this.scene.entities.length);
        if (!this.spawned) {
          this.spawned = this.scene.add(new Entity());
          this.destroy();
        }
        seen.push(this.scene.entities.length);
      }
    }
    game.scenes.add('s', Scene);
    game.scenes.switch('s');
    const scene = game.scenes.current;
    const spawner = scene.add(new Spawner());
    step(game);
    expect(seen).toEqual([1, 1]); // unchanged during the step
    expect(scene.entities).toEqual([spawner.spawned]);
    expect(spawner.scene).toBe(null);
  });

  it('never inserts an entity added and destroyed in the same step', () => {
    const game = fakeGame();
    game.scenes.add('s', Scene);
    game.scenes.switch('s');
    const scene = game.scenes.current;
    const onAdd = vi.fn();
    scene.update = () => {
      const e = scene.add(Object.assign(new Entity(), { onAdd }));
      e.destroy();
    };
    step(game);
    expect(scene.entities).toEqual([]);
    expect(onAdd).not.toHaveBeenCalled();
  });

  it('keeps an entity destroyed and re-added in the same step (pool reuse)', () => {
    const game = fakeGame();
    game.scenes.add('s', Scene);
    game.scenes.switch('s');
    const scene = game.scenes.current;
    const e = scene.add(new Entity());
    scene.update = () => {
      e.destroy();
      scene.add(e);
    };
    step(game);
    expect(scene.entities).toEqual([e]);
    expect(e.dead).toBe(false);
  });

  it('skips inactive entities in update and integrates velocity by default', () => {
    const scene = new Scene(fakeGame());
    const moving = scene.add(new Entity());
    moving.vel.set(60, 0);
    const frozen = scene.add(new Entity());
    frozen.vel.set(60, 0);
    frozen.active = false;
    scene._step(1 / 60);
    expect(moving.pos.x).toBeCloseTo(1);
    expect(frozen.pos.x).toBe(0);
  });

  it('finds by tag', () => {
    const scene = new Scene(fakeGame());
    const a = scene.add(new Entity({ tags: ['enemy'] }));
    scene.add(new Entity({ tags: ['player'] }));
    const b = scene.add(new Entity({ tags: ['enemy'] }));
    expect(scene.find('enemy')).toEqual([a, b]);
    expect(scene.first('player').has('player')).toBe(true);
    expect(scene.count('enemy')).toBe(2);
  });

  it('draws by z, then insertion order, re-sorting when z changes', () => {
    const scene = new Scene(fakeGame());
    const order = [];
    const make = (name, z) => {
      const e = new Entity({ z });
      e.render = () => order.push(name);
      return scene.add(e);
    };
    make('a', 1);
    make('b', 0);
    const c = make('c', 1);
    scene._draw(fakeRenderer(), 0);
    expect(order).toEqual(['b', 'a', 'c']);
    order.length = 0;
    c.z = -1;
    scene._draw(fakeRenderer(), 0);
    expect(order).toEqual(['c', 'b', 'a']);
  });

  it('runs entity update before the scene update hook', () => {
    const scene = new Scene(fakeGame());
    const order = [];
    const e = new Entity();
    e.update = () => order.push('entity');
    scene.add(e);
    scene.update = () => order.push('scene');
    scene._step(1 / 60);
    expect(order).toEqual(['entity', 'scene']);
  });
});

describe('SceneManager', () => {
  class Menu extends Scene {
    enter(data) {
      this.entered = data;
    }
  }
  class Pause extends Scene {}

  it('switches and calls exit on the old scene', () => {
    const game = fakeGame();
    game.scenes.add('menu', Menu).add('pause', Pause);
    game.scenes.switch('menu', 42);
    const menu = game.scenes.current;
    expect(menu.entered).toBe(42);
    expect(game.ctx.scene).toBe(menu);
    expect(game.ctx.camera).toBe(menu.camera);
    menu.exit = vi.fn();
    game.scenes.switch('pause');
    expect(menu.exit).toHaveBeenCalled();
    expect(game.scenes.stack.length).toBe(1);
  });

  it('pushes and pops overlays, resuming the scene below', () => {
    const game = fakeGame();
    game.scenes.add('menu', Menu).add('pause', Pause);
    game.scenes.switch('menu');
    const menu = game.scenes.current;
    menu.resume = vi.fn();
    game.scenes.push('pause');
    expect(game.scenes.stack.length).toBe(2);
    game.scenes.pop('back');
    expect(game.scenes.current).toBe(menu);
    expect(menu.resume).toHaveBeenCalledWith('back');
  });

  it('defers switches requested during a step', () => {
    const game = fakeGame();
    game.scenes.add('menu', Menu).add('pause', Pause);
    game.scenes.switch('menu');
    const menu = game.scenes.current;
    let during;
    menu.update = () => {
      game.scenes.switch('pause');
      during = game.scenes.current;
    };
    step(game);
    expect(during).toBe(menu);
    expect(game.scenes.current).toBeInstanceOf(Pause);
  });

  it('awaits async preload, flagging loading meanwhile', async () => {
    const game = fakeGame();
    let release;
    class Level extends Scene {
      preload() {
        return new Promise((r) => (release = r));
      }
    }
    game.scenes.add('level', Level);
    const done = game.scenes.switch('level');
    expect(game.scenes.loading).toBe(true);
    expect(game.scenes.current).toBe(null);
    release();
    await done;
    expect(game.scenes.loading).toBe(false);
    expect(game.scenes.current).toBeInstanceOf(Level);
  });

  it('throws on unknown scene keys', () => {
    const game = fakeGame();
    expect(() => game.scenes.switch('nope')).toThrow(/Unknown scene/);
  });
});
