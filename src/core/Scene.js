import { Timer } from '../gameplay/Timer.js';
import { Tween } from '../gameplay/Tween.js';
import { Camera } from '../render/Camera.js';
import { removeWhere } from '../util/array.js';

/**
 * @typedef {import('../gameplay/Entity.js').Entity} Entity
 * @typedef {import('../render/Renderer.js').Renderer} Renderer
 * @typedef {import('../platform/Assets.js').Assets} Assets
 * @typedef {import('./Game.js').Game} Game
 * @typedef {import('./Game.js').GameContext} GameContext
 * @typedef {import('../gameplay/Tween.js').TweenOptions} TweenOptions
 * @typedef {import('../gameplay/Tween.js').EaseInput} EaseInput
 */

const byZ = (a, b) => a.z - b.z;

/**
 * One screen of a game (menu, level, overlay). Owns its entities, camera,
 * timers and tweens. Extend it and override the lifecycle hooks.
 *
 * Adds and removes made during an update step are applied when the step ends.
 *
 * @example
 * class Level extends Scene {
 *   enter({ level = 1 } = {}) { this.level = level; this.add(new Player()); }
 *   update(dt, { input }) { if (input.justPressed('Escape')) this.game.scenes.push('pause'); }
 *   render(r) { r.text(`Level ${this.level}`, 8, 8); }
 * }
 */
export class Scene {
  /** @param {Game} [game] Omit only in tests. */
  constructor(game) {
    /** @type {Game | undefined} */
    this.game = game;
    /** @type {GameContext | null} */
    this.ctx = game ? game.ctx : null;
    /** Key the scene was registered under. Set by the scene manager. */
    this.key = '';
    /** Live entities in draw order. Read-only: use {@link Scene#add} and {@link Entity#destroy}. @type {Entity[]} */
    this.entities = [];
    this.camera = new Camera(game ? game.width : 0, game ? game.height : 0);
    /** Timers that pause with the game and are discarded with the scene. */
    this.timer = new Timer();
    /** @type {Tween[]} */
    this._tweens = [];
    /** @type {Entity[]} */
    this._pendingAdds = [];
    /** @type {Entity[]} */
    this._pendingRemoves = [];
    this._updating = false;
    this._sortDirty = false;
  }

  /**
   * Load assets before {@link Scene#enter}. Returning a promise shows the loading screen until it settles.
   * @param {Assets} _assets
   * @returns {void | Promise<void>}
   */
  preload(_assets) {}

  /**
   * Called once when the scene starts, with the data passed to `switch` or `push`.
   * @param {any} [_data]
   */
  enter(_data) {}

  /**
   * Called every fixed step after all entities have updated.
   * @param {number} _dt Seconds.
   * @param {GameContext} _ctx
   */
  update(_dt, _ctx) {}

  /**
   * Called every frame after entities draw. Draws in screen space (unaffected by the camera).
   * @param {Renderer} _r
   * @param {number} _alpha
   */
  render(_r, _alpha) {}

  /** Called when the scene is removed from the stack. */
  exit() {}

  /**
   * Called when a scene pushed on top of this one is popped.
   * @param {any} [_data] Data passed to `pop`.
   */
  resume(_data) {}

  /**
   * Add an entity. During an update step it joins at the end of the step.
   * @template {Entity} T
   * @param {T} entity
   * @returns {T} The same entity.
   */
  add(entity) {
    entity.dead = false;
    entity.scene = this;
    if (this._updating) this._pendingAdds.push(entity);
    else this._insert(entity);
    return entity;
  }

  /**
   * Remove an entity. Prefer {@link Entity#destroy}, which also marks it dead immediately.
   * @param {Entity} entity
   */
  remove(entity) {
    if (this._updating) this._pendingRemoves.push(entity);
    else this._extract(entity);
  }

  /** Destroy every entity. */
  clear() {
    for (const entity of this.entities.slice()) {
      entity.dead = true;
      this.remove(entity);
    }
  }

  /**
   * Live entities with a tag.
   * @param {string} tag
   * @param {Entity[]} [out] Array to refill instead of allocating a new one.
   * @returns {Entity[]}
   */
  find(tag, out = []) {
    out.length = 0;
    for (const entity of this.entities) if (isAliveWithTag(entity, tag)) out.push(entity);
    return out;
  }

  /**
   * @param {string} tag
   * @returns {Entity | undefined} The first live entity with the tag.
   */
  first(tag) {
    return this.entities.find((entity) => isAliveWithTag(entity, tag));
  }

  /**
   * Number of live entities with a tag. Excludes entities destroyed this step.
   * @param {string} tag
   * @returns {number}
   */
  count(tag) {
    let total = 0;
    for (const entity of this.entities) if (isAliveWithTag(entity, tag)) total++;
    return total;
  }

  /**
   * Animate numeric properties of `target` toward `props`. The tween belongs
   * to this scene and can be awaited.
   * @param {object} target
   * @param {Record<string, number>} props End values.
   * @param {number} duration Seconds.
   * @param {EaseInput} [ease='linear']
   * @param {TweenOptions} [opts]
   * @returns {Tween}
   * @example
   * await this.tween(logo.pos, { y: 40 }, 0.5, 'backOut', { delay: 0.2 });
   */
  tween(target, props, duration, ease = 'linear', opts) {
    const tween = new Tween(target, props, duration, ease, opts);
    this._tweens.push(tween);
    return tween;
  }

  _step(dt) {
    this._updating = true;
    this._updateEntities(dt);
    this.timer.update(dt);
    removeWhere(this._tweens, (tween) => tween.update(dt));
    this.update(dt, this.ctx);
    this.camera.update(dt);
    this._updating = false;
    this._applyPendingChanges();
  }

  _updateEntities(dt) {
    const list = this.entities;
    for (let i = 0; i < list.length; i++) {
      const entity = list[i];
      if (entity.active && !entity.dead) entity.update(dt, this.ctx);
    }
  }

  _draw(r, alpha) {
    if (this._sortDirty) {
      this.entities.sort(byZ);
      this._sortDirty = false;
    }
    r.push();
    this.camera.apply(r);
    for (const entity of this.entities) if (entity.visible && !entity.dead) entity.render(r, alpha);
    r.pop();
    this.render(r, alpha);
  }

  _applyPendingChanges() {
    if (this._pendingRemoves.length > 0) {
      for (const entity of this._pendingRemoves) this._extract(entity);
      this._pendingRemoves.length = 0;
    }
    if (this._pendingAdds.length > 0) {
      for (const entity of this._pendingAdds.splice(0)) this._insert(entity);
    }
  }

  _insert(entity) {
    if (entity._live) return;
    if (entity.dead) {
      if (entity.scene === this) entity.scene = null;
      return;
    }
    entity._live = true;
    entity.scene = this;
    this.entities.push(entity);
    this._sortDirty = true;
    entity.onAdd?.(this);
  }

  _extract(entity) {
    if (!entity._live || entity.scene !== this) return;
    const index = this.entities.indexOf(entity);
    if (index >= 0) this.entities.splice(index, 1);
    entity._live = false;
    entity.scene = null;
    entity.onRemove?.(this);
  }
}

const isAliveWithTag = (entity, tag) => !entity.dead && entity.tags.has(tag);
