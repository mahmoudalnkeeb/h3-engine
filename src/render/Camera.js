import { Rect } from '../util/Rect.js';

/**
 * Anything with a position and an optional size, such as an entity.
 * @typedef {{ pos: { x: number, y: number }, w?: number, h?: number }} FollowTarget
 */

/**
 * @typedef {object} FollowOptions
 * @property {number} [lerp=1] Fraction of the remaining distance closed per update. 1 locks on; 0.1 to 0.2 feels smooth.
 * @property {number} [offsetX=0] Aim this many pixels right of the target's center.
 * @property {number} [offsetY=0] Aim this many pixels below the target's center.
 */

const randomSigned = () => Math.random() * 2 - 1;

/**
 * 2D camera. `x`, `y` is the world point shown at the screen center. It starts
 * centered on the view, so world and screen coordinates match until it moves.
 */
export class Camera {
  /**
   * @param {number} viewW Logical screen width.
   * @param {number} viewH Logical screen height.
   */
  constructor(viewW, viewH) {
    this.viewW = viewW;
    this.viewH = viewH;
    this.x = viewW / 2;
    this.y = viewH / 2;
    /** 2 shows everything twice as large. */
    this.zoom = 1;
    /** Snap the final translation to whole pixels. Prevents shimmer in pixel-art games. */
    this.roundPixels = false;
    /** @type {Rect | null} */
    this.bounds = null;
    /** @type {FollowTarget | null} */
    this.target = null;
    this.lerp = 1;
    this.offsetX = 0;
    this.offsetY = 0;
    /** Current shake offset in pixels. Read-only. */
    this.shakeX = 0;
    /** Current shake offset in pixels. Read-only. */
    this.shakeY = 0;
    /** Multiplies every {@link Camera#shake} intensity. Set below 1 to reduce shake, 0 to turn it off. */
    this.shakeScale = 1;
    this._shakeTimeLeft = 0;
    this._shakeDuration = 0;
    this._shakeIntensity = 0;
    this._view = new Rect();
    this._targetPoint = { x: 0, y: 0 };
  }

  /**
   * Track a target's center every update. Pass `null` to stop.
   * @param {FollowTarget | null} target
   * @param {FollowOptions} [options]
   */
  follow(target, { lerp = 1, offsetX = 0, offsetY = 0 } = {}) {
    this.target = target;
    this.lerp = lerp;
    this.offsetX = offsetX;
    this.offsetY = offsetY;
  }

  /** Jump to the follow target immediately, skipping the lerp. */
  snap() {
    if (!this.target) return;
    const point = this._followPoint();
    this.x = point.x;
    this.y = point.y;
    this._keepInBounds();
  }

  /**
   * Never show anything outside this world rectangle. A world smaller than the view is centered.
   * @param {number} x
   * @param {number} y
   * @param {number} w
   * @param {number} h
   */
  setBounds(x, y, w, h) {
    this.bounds = new Rect(x, y, w, h);
    this._keepInBounds();
  }

  clearBounds() {
    this.bounds = null;
  }

  /**
   * Random offset that fades out over `duration`. An overlapping shake keeps the stronger intensity.
   * @param {number} [intensity=4] Maximum offset in pixels, before {@link Camera#shakeScale}.
   * @param {number} [duration=0.3] Seconds.
   */
  shake(intensity = 4, duration = 0.3) {
    const scaled = intensity * this.shakeScale;
    const alreadyShaking = this._shakeTimeLeft > 0;
    this._shakeIntensity = alreadyShaking ? Math.max(scaled, this._shakeIntensity) : scaled;
    this._shakeDuration = duration;
    this._shakeTimeLeft = Math.max(this._shakeTimeLeft, duration);
  }

  /**
   * Follow, clamp to bounds and advance shake. Called by the owning scene each step.
   * @param {number} dt Seconds.
   */
  update(dt) {
    if (this.target) {
      const point = this._followPoint();
      this.x += (point.x - this.x) * this.lerp;
      this.y += (point.y - this.y) * this.lerp;
    }
    this._keepInBounds();
    this._updateShake(dt);
  }

  /**
   * Apply the camera transform to a renderer. The scene does this before drawing entities.
   * @param {import('./Renderer.js').Renderer} r
   */
  apply(r) {
    let offsetX = -(this.x + this.shakeX);
    let offsetY = -(this.y + this.shakeY);
    if (this.roundPixels) {
      offsetX = Math.round(offsetX * this.zoom) / this.zoom;
      offsetY = Math.round(offsetY * this.zoom) / this.zoom;
    }
    r.translate(this.viewW / 2, this.viewH / 2);
    if (this.zoom !== 1) r.scale(this.zoom, this.zoom);
    r.translate(offsetX, offsetY);
  }

  /**
   * Visible world rectangle, for culling. Returns the same object on every
   * read, so copy values you need to keep. Ignores shake.
   * @type {Rect}
   */
  get view() {
    const w = this.viewW / this.zoom;
    const h = this.viewH / this.zoom;
    return this._view.set(this.x - w / 2, this.y - h / 2, w, h);
  }

  /**
   * @param {number} screenX Logical pixels.
   * @param {number} screenY
   * @param {{ x: number, y: number }} [out] Object to write into instead of allocating.
   * @returns {{ x: number, y: number }}
   */
  screenToWorld(screenX, screenY, out = { x: 0, y: 0 }) {
    out.x = (screenX - this.viewW / 2) / this.zoom + this.x;
    out.y = (screenY - this.viewH / 2) / this.zoom + this.y;
    return out;
  }

  /**
   * @param {number} worldX
   * @param {number} worldY
   * @param {{ x: number, y: number }} [out] Object to write into instead of allocating.
   * @returns {{ x: number, y: number }}
   */
  worldToScreen(worldX, worldY, out = { x: 0, y: 0 }) {
    out.x = (worldX - this.x) * this.zoom + this.viewW / 2;
    out.y = (worldY - this.y) * this.zoom + this.viewH / 2;
    return out;
  }

  _followPoint() {
    const target = this.target;
    const point = this._targetPoint;
    point.x = target.pos.x + (target.w ?? 0) / 2 + this.offsetX;
    point.y = target.pos.y + (target.h ?? 0) / 2 + this.offsetY;
    return point;
  }

  _keepInBounds() {
    const bounds = this.bounds;
    if (!bounds) return;
    const halfW = this.viewW / 2 / this.zoom;
    const halfH = this.viewH / 2 / this.zoom;
    this.x = clampAxis(this.x, bounds.x, bounds.w, halfW);
    this.y = clampAxis(this.y, bounds.y, bounds.h, halfH);
  }

  _updateShake(dt) {
    if (this._shakeTimeLeft <= 0) return;
    this._shakeTimeLeft -= dt;
    if (this._shakeTimeLeft <= 0) {
      this.shakeX = 0;
      this.shakeY = 0;
      return;
    }
    const strength = this._shakeIntensity * (this._shakeTimeLeft / this._shakeDuration);
    this.shakeX = randomSigned() * strength;
    this.shakeY = randomSigned() * strength;
  }
}

const clampAxis = (center, start, size, halfView) => {
  if (size < halfView * 2) return start + size / 2;
  return Math.min(Math.max(center, start + halfView), start + size - halfView);
};
