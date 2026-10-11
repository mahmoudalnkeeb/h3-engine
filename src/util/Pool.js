/**
 * Recycles objects to avoid allocating in hot paths. Objects you `get` must
 * be reset by you (or by `reset`) before reuse.
 * @template T
 */
export class Pool {
  /**
   * @param {() => T} factory Creates an object when the pool is empty.
   * @param {number} [size=0] Objects to create up front.
   * @param {(obj: T) => void} [reset] Called on each object as it is released.
   */
  constructor(factory, size = 0, reset) {
    this.factory = factory;
    this.reset = reset;
    /** @type {T[]} */
    this._free = Array.from({ length: size }, () => factory());
  }

  /** @returns {T} A recycled object, or a new one if none are free. */
  get() {
    return this._free.length > 0 ? this._free.pop() : this.factory();
  }

  /** @param {T} obj */
  release(obj) {
    this.reset?.(obj);
    this._free.push(obj);
  }

  /** Objects waiting to be reused. @type {number} */
  get available() {
    return this._free.length;
  }
}
