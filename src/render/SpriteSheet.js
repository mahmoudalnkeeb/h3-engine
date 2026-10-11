import { Sprite } from './Sprite.js';

/**
 * @typedef {object} SpriteSheetOptions
 * @property {number} frameW
 * @property {number} frameH
 * @property {number} [margin=0] Empty border around the whole grid, in pixels.
 * @property {number} [spacing=0] Gap between frames, in pixels.
 * @property {number} [originX=0] Anchor applied to every frame.
 * @property {number} [originY=0]
 */

/** Cuts an image into equal frames, numbered left to right, top to bottom, from 0. */
export class SpriteSheet {
  /**
   * @param {import('./Renderer.js').ImageLike} image
   * @param {SpriteSheetOptions} options
   */
  constructor(image, { frameW, frameH, margin = 0, spacing = 0, originX = 0, originY = 0 }) {
    this.image = image;
    this.frameW = frameW;
    this.frameH = frameH;
    /** @type {Sprite[]} */
    this.frames = [];
    const lastY = image.height - margin - frameH;
    const lastX = image.width - margin - frameW;
    for (let y = margin; y <= lastY; y += frameH + spacing) {
      for (let x = margin; x <= lastX; x += frameW + spacing) {
        this.frames.push(new Sprite(image, { sx: x, sy: y, sw: frameW, sh: frameH, originX, originY }));
      }
    }
  }

  /**
   * @param {number} index
   * @returns {Sprite}
   * @throws {Error} If the frame doesn't exist.
   */
  frame(index) {
    const sprite = this.frames[index];
    if (!sprite) throw new Error(`SpriteSheet has no frame ${index} (has ${this.frames.length})`);
    return sprite;
  }
}
