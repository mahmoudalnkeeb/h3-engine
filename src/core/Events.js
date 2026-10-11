/** Minimal event emitter. Listeners run synchronously in subscription order. */
export class Events {
  constructor() {
    /** @type {Map<string, Array<Function & { original?: Function }>>} */
    this._listeners = new Map();
  }

  /**
   * @param {string} type
   * @param {Function} fn
   * @returns {() => void} Unsubscribe function.
   */
  on(type, fn) {
    if (!this._listeners.has(type)) this._listeners.set(type, []);
    this._listeners.get(type).push(fn);
    return () => this.off(type, fn);
  }

  /**
   * Like {@link Events#on}, but the listener removes itself after the first call.
   * @param {string} type
   * @param {Function} fn
   * @returns {() => void} Unsubscribe function.
   */
  once(type, fn) {
    const runOnce = (...args) => {
      this.off(type, runOnce);
      fn(...args);
    };
    runOnce.original = fn;
    return this.on(type, runOnce);
  }

  /**
   * Remove a listener. Also accepts the original function passed to {@link Events#once}.
   * @param {string} type
   * @param {Function} fn
   */
  off(type, fn) {
    const list = this._listeners.get(type);
    if (!list) return;
    const index = list.findIndex((listener) => listener === fn || listener.original === fn);
    if (index >= 0) list.splice(index, 1);
  }

  /**
   * Call every listener for `type`. Listeners added or removed during the emit
   * take effect on the next emit.
   * @param {string} type
   * @param {...any} args
   */
  emit(type, ...args) {
    const list = this._listeners.get(type);
    if (!list || list.length === 0) return;
    for (const fn of list.slice()) fn(...args);
  }
}
