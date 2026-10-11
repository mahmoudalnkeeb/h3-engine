/**
 * @typedef {import('./Scene.js').Scene} Scene
 * @typedef {typeof import('./Scene.js').Scene} SceneClass
 */

/**
 * @param {any} value
 * @returns {value is PromiseLike<unknown>}
 */
const isPromise = (value) => value != null && typeof value.then === 'function';

/**
 * Registers scenes by key and manages the scene stack. Every scene on the
 * stack renders, bottom to top; only the top one updates.
 *
 * Requests made during an update step are applied after the step. Each
 * `switch` or `push` creates a new scene instance.
 */
export class SceneManager {
  /** @param {import('./Game.js').Game} game */
  constructor(game) {
    this.game = game;
    /** @type {Map<string, SceneClass>} */
    this._registry = new Map();
    /** Bottom to top. @type {Scene[]} */
    this.stack = [];
    this._queue = [];
    this._requestId = 0;
    /** True while an async {@link Scene#preload} is pending. */
    this.loading = false;
  }

  /**
   * @param {string} key
   * @param {SceneClass} SceneClass
   * @returns {this}
   */
  add(key, SceneClass) {
    this._registry.set(key, SceneClass);
    return this;
  }

  /** The top scene, or null when the stack is empty. @type {Scene | null} */
  get current() {
    return this.stack.at(-1) ?? null;
  }

  /**
   * Exit every scene on the stack and start a new instance of `key`.
   * @param {string} key
   * @param {any} [data] Passed to the new scene's `enter`.
   * @returns {Promise<void>} Settles once the scene has entered (after any async preload).
   * @throws {Error} If `key` is not registered.
   */
  switch(key, data) {
    return this._request('switch', key, data);
  }

  /**
   * Start `key` on top of the current scene, which keeps rendering but stops updating.
   * @param {string} key
   * @param {any} [data] Passed to the new scene's `enter`.
   * @returns {Promise<void>}
   * @throws {Error} If `key` is not registered.
   */
  push(key, data) {
    return this._request('push', key, data);
  }

  /**
   * Exit the top scene. The scene below receives `resume(data)`.
   * @param {any} [data]
   * @returns {Promise<void>}
   */
  pop(data) {
    return this._request('pop', null, data);
  }

  _request(op, key, data) {
    if (key !== null && !this._registry.has(key)) throw new Error(`Unknown scene "${key}"`);
    if (this.game._stepping) {
      this._queue.push({ op, key, data });
      return Promise.resolve();
    }
    return this._apply(op, key, data);
  }

  _flush() {
    while (this._queue.length > 0) {
      const { op, key, data } = this._queue.shift();
      this._apply(op, key, data);
    }
  }

  _apply(op, key, data) {
    const requestId = ++this._requestId;
    if (op === 'pop') {
      this._popTop(data);
      return Promise.resolve();
    }
    if (op === 'switch') this._exitAll();
    return this._open(key, data, requestId);
  }

  _popTop(data) {
    this.stack.pop()?.exit();
    this._syncContext();
    this.current?.resume(data);
  }

  _exitAll() {
    while (this.stack.length > 0) this.stack.pop().exit();
    this._syncContext();
  }

  _open(key, data, requestId) {
    const SceneClass = this._registry.get(key);
    const scene = new SceneClass(this.game);
    scene.key = key;
    const enter = () => {
      this.stack.push(scene);
      this._syncContext();
      scene.enter(data);
    };

    const preloading = scene.preload(this.game.assets);
    if (!isPromise(preloading)) {
      enter();
      return Promise.resolve();
    }

    this.loading = true;
    const isLatest = () => requestId === this._requestId;
    return preloading.then(
      () => {
        if (!isLatest()) return;
        this.loading = false;
        enter();
      },
      (error) => {
        if (isLatest()) this.loading = false;
        throw error;
      },
    );
  }

  _syncContext() {
    const ctx = this.game.ctx;
    ctx.scene = this.current;
    ctx.camera = this.current ? this.current.camera : null;
  }
}
