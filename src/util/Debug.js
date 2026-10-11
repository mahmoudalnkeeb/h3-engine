const TEXT_COLOR = '#0f0';
const PANEL_COLOR = 'rgba(0,0,0,0.6)';
const FONT = '10px monospace';
const LINE_HEIGHT = 12;

/** Overlay showing FPS, updates per second, entity count, the scene key and hitboxes. */
export class Debug {
  /**
   * @param {import('../core/Game.js').Game} game
   * @param {boolean} [enabled=false]
   */
  constructor(game, enabled = false) {
    this.game = game;
    this.enabled = enabled;
    /** `KeyboardEvent.code` that toggles the overlay. */
    this.toggleKey = 'Backquote';
    this.hitboxColor = TEXT_COLOR;
  }

  /** Check the toggle key. Called by the game each step. */
  update() {
    if (this.game.input.justPressed(this.toggleKey)) this.enabled = !this.enabled;
  }

  /**
   * Draw the overlay on top of everything. Called by the game each frame.
   * @param {import('../render/Renderer.js').Renderer} r
   */
  render(r) {
    if (!this.enabled) return;
    const scene = this.game.scenes.current;
    if (scene) this._drawHitboxes(r, scene);
    this._drawStats(r, scene);
  }

  _drawHitboxes(r, scene) {
    const lineWidth = 1 / scene.camera.zoom;
    r.push();
    scene.camera.apply(r);
    for (const entity of scene.entities) {
      if (entity.visible && !entity.dead) {
        r.strokeRect(entity.pos.x, entity.pos.y, entity.w, entity.h, this.hitboxColor, lineWidth);
      }
    }
    r.pop();
  }

  _drawStats(r, scene) {
    const { fps, ups } = this.game.loop;
    const lines = [
      `FPS ${fps}  UPS ${ups}`,
      `entities ${scene ? scene.entities.length : 0}`,
      `scene ${scene ? scene.key : '-'}`,
    ];
    r.rect(4, 4, 112, lines.length * LINE_HEIGHT + 4, PANEL_COLOR);
    lines.forEach((line, i) => {
      r.text(line, 8, 8 + i * LINE_HEIGHT, { font: FONT, color: TEXT_COLOR });
    });
  }
}
