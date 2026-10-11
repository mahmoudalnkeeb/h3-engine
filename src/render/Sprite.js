/**
 * @typedef {object} SpriteOptions
 * @property {number} [sx=0] Source rectangle within the image.
 * @property {number} [sy=0]
 * @property {number} [sw] Defaults to the image width.
 * @property {number} [sh] Defaults to the image height.
 * @property {number} [originX=0] Anchor as a fraction of the width: 0 left, 0.5 center, 1 right.
 * @property {number} [originY=0] Anchor as a fraction of the height: 0 top, 1 bottom.
 */

/** A rectangular region of an image with an anchor point. Draw with {@link Renderer#sprite}. */
export class Sprite {
  /**
   * @param {import('./Renderer.js').ImageLike} image
   * @param {SpriteOptions} [options]
   */
  constructor(image, { sx = 0, sy = 0, sw = image.width, sh = image.height, originX = 0, originY = 0 } = {}) {
    this.image = image;
    this.sx = sx;
    this.sy = sy;
    this.sw = sw;
    this.sh = sh;
    this.originX = originX;
    this.originY = originY;
  }
}
