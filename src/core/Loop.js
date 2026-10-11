const FLOAT_TOLERANCE = 1e-7;

/**
 * @typedef {object} LoopOptions
 * @property {(dt: number) => void} update Called at a fixed rate with `dt === step`.
 * @property {(alpha: number) => void} render Called once per animation frame. `alpha` (0..1) is the unspent fraction of a step.
 * @property {number} [step=1/60] Seconds per update.
 * @property {number} [maxFrame=0.25] Longest frame, in seconds, fed to the accumulator. Caps catch-up after a stall.
 * @property {(cb: FrameRequestCallback) => any} [raf] Frame scheduler. Defaults to `requestAnimationFrame`; inject a fake in tests.
 * @property {(handle: any) => void} [caf] Cancels a handle returned by `raf`.
 */

/**
 * Fixed-timestep loop: updates run at a constant rate regardless of display
 * refresh rate, rendering runs once per frame.
 */
export class Loop {
  /** @param {LoopOptions} options */
  constructor({ update, render, step = 1 / 60, maxFrame = 0.25, raf, caf }) {
    this.update = update;
    this.render = render;
    this.step = step;
    this.maxFrame = maxFrame;
    this._requestFrame = raf ?? ((cb) => globalThis.requestAnimationFrame(cb));
    this._cancelFrame = caf ?? ((handle) => globalThis.cancelAnimationFrame(handle));
    this._onFrame = (now) => this.tick(now);
    this._handle = null;
    this._lastTime = -1;
    this._accumulator = 0;
    this.running = false;
    this.paused = false;
    /** Frames rendered during the last full second. */
    this.fps = 0;
    /** Updates run during the last full second. */
    this.ups = 0;
    this._statsTime = 0;
    this._framesThisSecond = 0;
    this._updatesThisSecond = 0;
  }

  start() {
    if (this.running) return;
    this.running = true;
    this.paused = false;
    this._lastTime = -1;
    this._accumulator = 0;
    this._handle = this._requestFrame(this._onFrame);
  }

  stop() {
    this.running = false;
    if (this._handle !== null) this._cancelFrame(this._handle);
    this._handle = null;
  }

  /** Keep scheduling frames but skip update and render. */
  pause() {
    this.paused = true;
  }

  /** Continue without catching up on the time spent paused. */
  resume() {
    this.paused = false;
    this._lastTime = -1;
  }

  /**
   * Advance one animation frame. Called by `raf`; call it directly to drive
   * the loop with a fake clock.
   * @param {number} nowMs Timestamp in milliseconds, as passed by `requestAnimationFrame`.
   */
  tick(nowMs) {
    if (!this.running) return;
    this._handle = this._requestFrame(this._onFrame);
    if (this.paused) return;

    const dt = this._frameDuration(nowMs / 1000);
    this._accumulator += dt;
    while (this._accumulator >= this.step - FLOAT_TOLERANCE) {
      this.update(this.step);
      this._accumulator -= this.step;
      this._updatesThisSecond++;
    }
    this._accumulator = Math.max(this._accumulator, 0);

    this.render(this._accumulator / this.step);
    this._framesThisSecond++;
    this._trackStats(dt);
  }

  _frameDuration(now) {
    const elapsed = this._lastTime < 0 ? 0 : now - this._lastTime;
    this._lastTime = now;
    return Math.min(Math.max(elapsed, 0), this.maxFrame);
  }

  _trackStats(dt) {
    this._statsTime += dt;
    if (this._statsTime < 1) return;
    this.fps = this._framesThisSecond;
    this.ups = this._updatesThisSecond;
    this._framesThisSecond = 0;
    this._updatesThisSecond = 0;
    this._statsTime -= 1;
  }
}
