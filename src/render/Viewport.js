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
 * The canvas element and its size. Maps the logical resolution to backing-store
 * and CSS pixels, independent of how anything is drawn.
 */
export class Viewport {
  /**
   * @param {import('./Renderer.js').RendererOptions} options
   * @throws {Error} If `canvas` is a selector that matches nothing.
   */
  constructor({ canvas, width, height, scale = 'fit' }) {
    /** @type {HTMLCanvasElement} */
    this.canvas = resolveCanvas(canvas);
    this.width = width;
    this.height = height;
    this.scaleMode = scale;
    /** CSS pixels per logical pixel after the last resize. */
    this.pixelScale = 1;
    /** Backing-store pixels per logical pixel after the last resize. */
    this.baseScaleX = 1;
    this.baseScaleY = 1;
    /** Called after every resize. @type {(() => void) | null} */
    this.onResize = null;
    this._onWindowResize = () => this.resize();
    this.canvas.style.touchAction = 'none';
  }

  /** Start resizing with the window. */
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
    this.baseScaleX = canvas.width / width;
    this.baseScaleY = canvas.height / height;
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
}
