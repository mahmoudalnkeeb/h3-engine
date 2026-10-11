/**
 * How the logical resolution is scaled to the window:
 * `'fit'` scales smoothly to the largest size that fits, `'pixel'` scales by whole
 * device pixels with smoothing off (for pixel art), `'none'` keeps one logical pixel per CSS pixel.
 * @typedef {'fit' | 'pixel' | 'none'} ScaleMode
 */

/**
 * @typedef {object} RendererOptions
 * @property {string | HTMLCanvasElement} [canvas] Selector or element. Created and appended to `<body>` if omitted.
 * @property {number} width Logical width in pixels.
 * @property {number} height Logical height in pixels.
 * @property {ScaleMode} [scale='fit']
 * @property {string} [background='#000']
 */

/**
 * @typedef {object} TextOptions
 * @property {string} [font='16px sans-serif'] CSS font shorthand.
 * @property {string} [color='#fff']
 * @property {CanvasTextAlign} [align='left']
 * @property {CanvasTextBaseline} [baseline='top']
 */

/**
 * Options for {@link Renderer#image} and {@link Renderer#sprite}.
 * @typedef {object} DrawOptions
 * @property {number} [w] Destination width. Defaults to the source width.
 * @property {number} [h] Destination height. Defaults to the source height.
 * @property {number} [sx] Source rectangle (`image` only). Defaults to the whole image.
 * @property {number} [sy]
 * @property {number} [sw]
 * @property {number} [sh]
 * @property {number} [originX] Anchor as a fraction of the width: 0 left, 0.5 center, 1 right. Also the rotation pivot.
 * @property {number} [originY] Anchor as a fraction of the height.
 * @property {number} [rotation] Radians, clockwise.
 * @property {boolean} [flipX] Mirror horizontally around the image center.
 * @property {boolean} [flipY]
 * @property {number} [alpha] Opacity multiplier, 0..1.
 */

/**
 * @typedef {CanvasImageSource & { width: number, height: number }} ImageLike
 */

/**
 * Region of an image plus an anchor. {@link Sprite} has this shape.
 * @typedef {{ image: ImageLike, sx: number, sy: number, sw: number, sh: number, originX: number, originY: number }} SpriteRegion
 */

const NO_OPTIONS = {};
const FULL_CIRCLE = Math.PI * 2;

const resolveCanvas = (canvas) => {
  if (typeof canvas === 'string') {
    const found = document.querySelector(canvas);
    if (!found) throw new Error(`Canvas "${canvas}" not found`);
    return found;
  }
  if (canvas) return canvas;
  const created = document.createElement('canvas');
  document.body.appendChild(created);
  return created;
};

const fitScale = (mode, width, height, dpr) => {
  if (mode === 'none') return 1;
  const scale = Math.min(window.innerWidth / width, window.innerHeight / height);
  if (mode !== 'pixel') return scale;
  const wholeDevicePixels = Math.max(1, Math.floor(scale * dpr));
  return wholeDevicePixels / dpr;
};

/**
 * Canvas 2D drawing in logical pixels. Handles devicePixelRatio and window
 * scaling so game code never deals with physical pixels.
 *
 * Draw calls use the current transform: world space inside entity `render`,
 * screen space inside a scene's `render`.
 */
export class Renderer {
  /**
   * @param {RendererOptions} options
   * @throws {Error} If `canvas` is a selector that matches nothing.
   */
  constructor({ canvas, width, height, scale = 'fit', background = '#000' }) {
    /** @type {HTMLCanvasElement} */
    this.canvas = resolveCanvas(canvas);
    /** Raw context for anything not wrapped here. Coordinates are still logical pixels. @type {CanvasRenderingContext2D} */
    this.ctx = this.canvas.getContext('2d');
    this.width = width;
    this.height = height;
    this.scaleMode = scale;
    this.background = background;
    /** CSS pixels per logical pixel after the last resize. */
    this.pixelScale = 1;
    /** Called after every resize. @type {(() => void) | null} */
    this.onResize = null;
    this._baseScaleX = 1;
    this._baseScaleY = 1;
    this._imageRegion = { image: null, sx: 0, sy: 0, sw: 0, sh: 0, originX: 0, originY: 0 };
    this._onWindowResize = () => this.resize();
    this.canvas.style.touchAction = 'none';
    this.resize();
  }

  /** Start resizing with the window. Called by {@link Game#start}. */
  attach() {
    window.addEventListener('resize', this._onWindowResize);
  }

  detach() {
    window.removeEventListener('resize', this._onWindowResize);
  }

  /** Recompute the canvas size from the window size and devicePixelRatio. */
  resize() {
    const { width, height, canvas } = this;
    const dpr = window.devicePixelRatio || 1;
    const scale = fitScale(this.scaleMode, width, height, dpr);
    this.pixelScale = scale;
    canvas.width = Math.round(width * scale * dpr);
    canvas.height = Math.round(height * scale * dpr);
    canvas.style.width = `${width * scale}px`;
    canvas.style.height = `${height * scale}px`;
    this._baseScaleX = canvas.width / width;
    this._baseScaleY = canvas.height / height;
    this.ctx.imageSmoothingEnabled = this.scaleMode !== 'pixel';
    this._resetTransform();
    this.onResize?.();
  }

  /**
   * Convert client coordinates (e.g. from a pointer event) to logical pixels.
   * @param {number} clientX
   * @param {number} clientY
   * @param {{ x: number, y: number }} [out] Object to write into instead of allocating.
   * @returns {{ x: number, y: number }}
   */
  toLogical(clientX, clientY, out = { x: 0, y: 0 }) {
    const bounds = this.canvas.getBoundingClientRect();
    out.x = ((clientX - bounds.left) * this.width) / bounds.width;
    out.y = ((clientY - bounds.top) * this.height) / bounds.height;
    return out;
  }

  /**
   * Reset the transform and alpha, then fill the screen.
   * @param {string} [color] Defaults to the game's background.
   */
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
   * @param {number} x Center.
   * @param {number} y Center.
   * @param {number} radius
   * @param {string} color
   */
  circle(x, y, radius, color) {
    this.ctx.fillStyle = color;
    this._circlePath(x, y, radius);
    this.ctx.fill();
  }

  /**
   * @param {number} x Center.
   * @param {number} y Center.
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
   * Filled polygon.
   * @param {number[]} points Flat coordinate list: `[x0, y0, x1, y1, ...]`.
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
   * @param {number} y Top of the text unless `baseline` says otherwise.
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
   * Draw an image or a region of one, anchored at `x, y`.
   * @param {ImageLike} img
   * @param {number} x
   * @param {number} y
   * @param {DrawOptions} [options]
   */
  image(img, x, y, options = NO_OPTIONS) {
    const region = this._imageRegion;
    region.image = img;
    region.sx = options.sx ?? 0;
    region.sy = options.sy ?? 0;
    region.sw = options.sw ?? img.width;
    region.sh = options.sh ?? img.height;
    region.originX = 0;
    region.originY = 0;
    this.sprite(region, x, y, options);
  }

  /**
   * Draw a sprite anchored at `x, y`. `originX`/`originY` in `options` override the sprite's own.
   * @param {SpriteRegion} sprite
   * @param {number} x
   * @param {number} y
   * @param {DrawOptions} [options] Source-rectangle options are ignored.
   */
  sprite(sprite, x, y, options = NO_OPTIONS) {
    const ctx = this.ctx;
    const w = options.w ?? sprite.sw;
    const h = options.h ?? sprite.sh;
    const anchorX = (options.originX ?? sprite.originX) * w;
    const anchorY = (options.originY ?? sprite.originY) * h;
    const { image, sx, sy, sw, sh } = sprite;

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

  /** Save transform, alpha and styles. Pair every call with {@link Renderer#pop}. */
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

  /** @param {number} radians Clockwise, around the current origin. */
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

  /** Opacity (0..1) for subsequent draws. Persists until changed or restored by {@link Renderer#pop}. */
  get alpha() {
    return this.ctx.globalAlpha;
  }

  set alpha(value) {
    this.ctx.globalAlpha = value;
  }

  _resetTransform() {
    this.ctx.setTransform(this._baseScaleX, 0, 0, this._baseScaleY, 0, 0);
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
