import { Entity } from '../../../src/index.js';
import { H } from '../config.js';

// Cheap deterministic noise so parallax scenery doesn't flicker between frames.
const hash = (i) => {
  const s = Math.sin(i * 127.1) * 43758.5453;
  return s - Math.floor(s);
};

/** Sky decoration drawn behind the level with parallax. */
export class Backdrop extends Entity {
  constructor() {
    super({ z: -10 });
  }

  render(r) {
    const view = /** @type {any} */ (this.scene).camera.view;
    this._layer(view, 0.1, 90, (wx, i) => {
      const y = view.y + 20 + hash(i) * 40;
      r.rect(Math.round(wx), Math.round(y), 28, 6, '#ffffff');
      r.rect(Math.round(wx + 6), Math.round(y - 4), 14, 4, '#ffffff');
    });
    this._layer(view, 0.3, 70, (wx, i) => {
      const radius = 40 + hash(i) * 30;
      r.circle(Math.round(wx), Math.round(view.y + H + 10), radius, '#8fd3a8');
    });
    this._layer(view, 0.5, 50, (wx, i) => {
      const radius = 22 + hash(i + 50) * 22;
      r.circle(Math.round(wx), Math.round(view.y + H + 14), radius, '#5fb87f');
    });
  }

  /**
   * Repeat a feature every `spacing` pixels on a layer that scrolls at `factor`
   * times the camera speed (0 = fixed to the screen, 1 = moves with the world).
   */
  _layer(view, factor, spacing, draw) {
    const offset = view.x * factor;
    const first = Math.floor(offset / spacing) - 2;
    const last = Math.ceil((offset + view.w) / spacing) + 2;
    for (let i = first; i <= last; i++) draw(view.x + i * spacing - offset, i);
  }
}
