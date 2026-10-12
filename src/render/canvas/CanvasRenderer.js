import { Renderer } from '../Renderer.js';

/** @typedef {import('../Renderer.js').RendererOptions} RendererOptions */
/** @typedef {import('../Renderer.js').TextOptions} TextOptions */
/** @typedef {import('../Renderer.js').DrawOptions} DrawOptions */
/** @typedef {import('../Renderer.js').SpriteRegion} SpriteRegion */

const NO_OPTIONS = {};
const FULL_CIRCLE = Math.PI * 2;

/**
 * {@link Renderer} backed by Canvas 2D. Handles devicePixelRatio and window
 * scaling so game code never deals with physical pixels. The default backend.
 */
export class CanvasRenderer extends Renderer {
  /**
   * @param {RendererOptions} options
   * @throws {Error} If `canvas` is a selector that matches nothing.
   */
  constructor(options) {
    super(options);
    /**
     * Raw context for anything not wrapped here. Canvas backend only.
     * Coordinates are still logical pixels. @type {CanvasRenderingContext2D}
     */
    this.ctx = this.canvas.getContext('2d');
    this.resize();
  }

  _applyResize() {
    this.ctx.imageSmoothingEnabled = this.scaleMode !== 'pixel';
    this._resetTransform();
  }

  /** @param {string} [color] */
  clear(color = this.background) {
    this._resetTransform();
    this.ctx.globalAlpha = 1;
    this.rect(0, 0, this.width, this.height, color);
  }

  /**
   * @param {number} x
   * @param {number} y
   * @param {number} w
   * @param {number} h
   * @param {string} color
   */
  rect(x, y, w, h, color) {
    this.ctx.fillStyle = color;
    this.ctx.fillRect(x, y, w, h);
  }

  /**
   * @param {number} x
   * @param {number} y
   * @param {number} w
   * @param {number} h
   * @param {string} color
   * @param {number} [lineWidth=1]
   */
  strokeRect(x, y, w, h, color, lineWidth = 1) {
    this._setStroke(color, lineWidth);
    this.ctx.strokeRect(x, y, w, h);
  }

  /**
   * @param {number} x
   * @param {number} y
   * @param {number} radius
   * @param {string} color
   */
  circle(x, y, radius, color) {
    this.ctx.fillStyle = color;
    this._circlePath(x, y, radius);
    this.ctx.fill();
  }

  /**
   * @param {number} x
   * @param {number} y
   * @param {number} radius
   * @param {string} color
   * @param {number} [lineWidth=1]
   */
  strokeCircle(x, y, radius, color, lineWidth = 1) {
    this._setStroke(color, lineWidth);
    this._circlePath(x, y, radius);
    this.ctx.stroke();
  }

  /**
   * @param {number} x1
   * @param {number} y1
   * @param {number} x2
   * @param {number} y2
   * @param {string} color
   * @param {number} [lineWidth=1]
   */
  line(x1, y1, x2, y2, color, lineWidth = 1) {
    const ctx = this.ctx;
    this._setStroke(color, lineWidth);
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  }

  /**
   * @param {number[]} points
   * @param {string} color
   */
  poly(points, color) {
    const ctx = this.ctx;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(points[0], points[1]);
    for (let i = 2; i < points.length; i += 2) ctx.lineTo(points[i], points[i + 1]);
    ctx.closePath();
    ctx.fill();
  }

  /**
   * @param {string} str
   * @param {number} x
   * @param {number} y
   * @param {TextOptions} [options]
   */
  text(str, x, y, options = NO_OPTIONS) {
    const ctx = this.ctx;
    ctx.font = options.font ?? '16px sans-serif';
    ctx.fillStyle = options.color ?? '#fff';
    ctx.textAlign = options.align ?? 'left';
    ctx.textBaseline = options.baseline ?? 'top';
    ctx.fillText(str, x, y);
  }

  /**
   * @param {SpriteRegion} sprite
   * @param {number} x
   * @param {number} y
   * @param {DrawOptions} [options]
   */
  sprite(sprite, x, y, options = NO_OPTIONS) {
    const ctx = this.ctx;
    const w = options.w ?? sprite.sw;
    const h = options.h ?? sprite.sh;
    const anchorX = (options.originX ?? sprite.originX) * w;
    const anchorY = (options.originY ?? sprite.originY) * h;
    const { sx, sy, sw, sh } = sprite;
    const image = /** @type {CanvasImageSource} */ (sprite.image);

    if (!needsTransform(options)) {
      ctx.drawImage(image, sx, sy, sw, sh, x - anchorX, y - anchorY, w, h);
      return;
    }

    ctx.save();
    ctx.translate(x, y);
    if (options.rotation) ctx.rotate(options.rotation);
    if (options.alpha !== undefined) ctx.globalAlpha *= options.alpha;
    ctx.translate(w / 2 - anchorX, h / 2 - anchorY);
    if (options.flipX || options.flipY) ctx.scale(options.flipX ? -1 : 1, options.flipY ? -1 : 1);
    ctx.drawImage(image, sx, sy, sw, sh, -w / 2, -h / 2, w, h);
    ctx.restore();
  }

  push() {
    this.ctx.save();
  }

  pop() {
    this.ctx.restore();
  }

  /**
   * @param {number} x
   * @param {number} y
   */
  translate(x, y) {
    this.ctx.translate(x, y);
  }

  /** @param {number} radians */
  rotate(radians) {
    this.ctx.rotate(radians);
  }

  /**
   * @param {number} x
   * @param {number} [y=x]
   */
  scale(x, y = x) {
    this.ctx.scale(x, y);
  }

  get alpha() {
    return this.ctx.globalAlpha;
  }

  set alpha(value) {
    this.ctx.globalAlpha = value;
  }

  _resetTransform() {
    const { baseScaleX, baseScaleY } = this.viewport;
    this.ctx.setTransform(baseScaleX, 0, 0, baseScaleY, 0, 0);
  }

  _setStroke(color, lineWidth) {
    this.ctx.strokeStyle = color;
    this.ctx.lineWidth = lineWidth;
  }

  _circlePath(x, y, radius) {
    this.ctx.beginPath();
    this.ctx.arc(x, y, radius, 0, FULL_CIRCLE);
  }
}

const needsTransform = (options) =>
  Boolean(options.rotation || options.flipX || options.flipY || options.alpha !== undefined);
