import { Viewport } from './Viewport.js';

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
 * @property {'left' | 'right' | 'center' | 'start' | 'end'} [align='left']
 * @property {'top' | 'middle' | 'bottom' | 'alphabetic' | 'hanging' | 'ideographic'} [baseline='top']
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
 * A decoded image, as returned by `Assets`. Each backend converts it to its own
 * representation (Canvas draws it directly; a GPU backend would cache a texture per image).
 * @typedef {{ width: number, height: number }} ImageLike
 */

/**
 * Region of an image plus an anchor. {@link Sprite} has this shape.
 * @typedef {{ image: ImageLike, sx: number, sy: number, sw: number, sh: number, originX: number, originY: number }} SpriteRegion
 */

const NO_OPTIONS = {};

const notImplemented = (name) => {
  throw new Error(`Renderer backend does not implement ${name}()`);
};

/**
 * Drawing in logical pixels, independent of the graphics API. Game code only
 * uses the methods declared here; backends such as {@link CanvasRenderer}
 * implement them. Backend-specific extras (e.g. `CanvasRenderer#ctx`) live on
 * the backend class.
 *
 * Draw calls use the current transform: world space inside entity `render`,
 * screen space inside a scene's `render`.
 *
 * Backends must call {@link Renderer#resize} at the end of their constructor,
 * once their context exists.
 */
export class Renderer {
  /**
   * @param {RendererOptions} options
   * @throws {Error} If `canvas` is a selector that matches nothing.
   */
  constructor({ canvas, width, height, scale = 'fit', background = '#000' }) {
    this.viewport = new Viewport({ canvas, width, height, scale });
    this.width = width;
    this.height = height;
    this.scaleMode = scale;
    this.background = background;
    /** Called after every resize. @type {(() => void) | null} */
    this.onResize = null;
    this._imageRegion = { image: null, sx: 0, sy: 0, sw: 0, sh: 0, originX: 0, originY: 0 };
    this.viewport.onResize = () => {
      this._applyResize();
      this.onResize?.();
    };
  }

  /** @type {HTMLCanvasElement} */
  get canvas() {
    return this.viewport.canvas;
  }

  /** CSS pixels per logical pixel after the last resize. */
  get pixelScale() {
    return this.viewport.pixelScale;
  }

  /** Start resizing with the window. Called by {@link Game#start}. */
  attach() {
    this.viewport.attach();
  }

  detach() {
    this.viewport.detach();
  }

  /** Recompute the canvas size from the window size and devicePixelRatio. */
  resize() {
    this.viewport.resize();
  }

  /**
   * Convert client coordinates (e.g. from a pointer event) to logical pixels.
   * @param {number} clientX
   * @param {number} clientY
   * @param {{ x: number, y: number }} [out] Object to write into instead of allocating.
   * @returns {{ x: number, y: number }}
   */
  toLogical(clientX, clientY, out) {
    return this.viewport.toLogical(clientX, clientY, out);
  }

  /** Start a frame. Called by the game before any scene draws. */
  beginFrame() {
    this.clear();
  }

  /** Finish a frame. Called by the game after everything is drawn. Batching backends flush here. */
  endFrame() {}

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

  /** React to a new canvas size (backing store already resized). */
  _applyResize() {
    notImplemented('_applyResize');
  }

  /**
   * Reset the transform and alpha, then fill the screen.
   * @param {string} [_color] Defaults to the game's background.
   */
  clear(_color) {
    notImplemented('clear');
  }

  /**
   * @param {number} _x
   * @param {number} _y
   * @param {number} _w
   * @param {number} _h
   * @param {string} _color
   */
  rect(_x, _y, _w, _h, _color) {
    notImplemented('rect');
  }

  /**
   * @param {number} _x
   * @param {number} _y
   * @param {number} _w
   * @param {number} _h
   * @param {string} _color
   * @param {number} [_lineWidth=1]
   */
  strokeRect(_x, _y, _w, _h, _color, _lineWidth) {
    notImplemented('strokeRect');
  }

  /**
   * @param {number} _x Center.
   * @param {number} _y Center.
   * @param {number} _radius
   * @param {string} _color
   */
  circle(_x, _y, _radius, _color) {
    notImplemented('circle');
  }

  /**
   * @param {number} _x Center.
   * @param {number} _y Center.
   * @param {number} _radius
   * @param {string} _color
   * @param {number} [_lineWidth=1]
   */
  strokeCircle(_x, _y, _radius, _color, _lineWidth) {
    notImplemented('strokeCircle');
  }

  /**
   * @param {number} _x1
   * @param {number} _y1
   * @param {number} _x2
   * @param {number} _y2
   * @param {string} _color
   * @param {number} [_lineWidth=1]
   */
  line(_x1, _y1, _x2, _y2, _color, _lineWidth) {
    notImplemented('line');
  }

  /**
   * Filled polygon.
   * @param {number[]} _points Flat coordinate list: `[x0, y0, x1, y1, ...]`.
   * @param {string} _color
   */
  poly(_points, _color) {
    notImplemented('poly');
  }

  /**
   * @param {string} _str
   * @param {number} _x
   * @param {number} _y Top of the text unless `baseline` says otherwise.
   * @param {TextOptions} [_options]
   */
  text(_str, _x, _y, _options) {
    notImplemented('text');
  }

  /**
   * Draw a sprite anchored at `x, y`. `originX`/`originY` in `options` override the sprite's own.
   * @param {SpriteRegion} _sprite
   * @param {number} _x
   * @param {number} _y
   * @param {DrawOptions} [_options] Source-rectangle options are ignored.
   */
  sprite(_sprite, _x, _y, _options) {
    notImplemented('sprite');
  }

  /** Save transform, alpha and styles. Pair every call with {@link Renderer#pop}. */
  push() {
    notImplemented('push');
  }

  pop() {
    notImplemented('pop');
  }

  /**
   * @param {number} _x
   * @param {number} _y
   */
  translate(_x, _y) {
    notImplemented('translate');
  }

  /** @param {number} _radians Clockwise, around the current origin. */
  rotate(_radians) {
    notImplemented('rotate');
  }

  /**
   * @param {number} _x
   * @param {number} [_y=x]
   */
  scale(_x, _y) {
    notImplemented('scale');
  }

  /**
   * Opacity (0..1) for subsequent draws. Persists until changed or restored by {@link Renderer#pop}.
   * @type {number}
   */
  get alpha() {
    return notImplemented('alpha');
  }

  set alpha(_value) {
    notImplemented('alpha');
  }
}
