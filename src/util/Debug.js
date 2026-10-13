const TEXT_COLOR = '#0f0';
const PANEL_COLOR = 'rgba(0,0,0,0.6)';
const FONT = '10px monospace';
const LINE_HEIGHT = 12;
const CHAR_WIDTH = 6;
const TEXT_STYLE = { font: FONT, color: TEXT_COLOR };

/**
 * Overlay showing FPS, updates per second, entity counts, the scene key,
 * hitboxes and any values registered with {@link Debug#watch}.
 *
 * Entities with `debug = false` or a tag in {@link Debug#ignoreTags} are
 * skipped. Each shown entity draws itself through `Entity#drawDebug`.
 */
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
    /** Entities with any of these tags are skipped. @type {Set<string>} */
    this.ignoreTags = new Set();
    /** @type {Map<string, () => unknown>} */
    this._watches = new Map();
    /** @type {string[]} */
    this._lines = [];
    this._shown = 0;
  }

  /**
   * Show a value as an extra stat line, read every frame while the overlay is on.
   * Watching an existing label replaces it. Watches belong to the game, so
   * remove scene-specific ones in the scene's `exit`.
   * @param {string} label
   * @param {() => unknown} read
   * @example
   * game.debug.watch('particles', () => this.count('fx'));
   */
  watch(label, read) {
    this._watches.set(label, read);
  }

  /** @param {string} label */
  unwatch(label) {
    this._watches.delete(label);
  }

  /**
   * Whether the overlay draws an entity.
   * @param {import('../gameplay/Entity.js').Entity} entity
   * @returns {boolean}
   */
  shows(entity) {
    if (!entity.debug || !entity.visible || entity.dead) return false;
    if (this.ignoreTags.size === 0) return true;
    for (const tag of this.ignoreTags) if (entity.tags.has(tag)) return false;
    return true;
  }

  /** Check the toggle key. Called by the game each step. */
  update() {
    if (this.game.input.justPressed(this.toggleKey)) this.enabled = !this.enabled;
  }

  /**
   * Draw the overlay on top of everything. Called by the game each frame. The stats
   * panel is sized in CSS pixels, so it keeps the same size at any logical resolution.
   * @param {import('../render/Renderer.js').Renderer} r
   */
  render(r) {
    if (!this.enabled) return;
    const scene = this.game.scenes.current;
    this._shown = 0;
    if (scene) this._drawEntities(r, scene);
    this._drawStats(r, scene);
  }

  _drawEntities(r, scene) {
    const lineWidth = 1 / scene.camera.zoom;
    r.push();
    scene.camera.apply(r);
    for (const entity of scene.entities) {
      if (!this.shows(entity)) continue;
      this._shown++;
      entity.drawDebug(r, this.hitboxColor, lineWidth);
    }
    r.pop();
  }

  _drawStats(r, scene) {
    const { fps, ups } = this.game.loop;
    const lines = this._lines;
    lines.length = 0;
    lines.push(
      `FPS ${fps}  UPS ${ups}`,
      `entities ${scene ? scene.entities.length : 0} (shown ${this._shown})`,
      `scene ${scene ? scene.key : '-'}`,
    );
    for (const [label, read] of this._watches) lines.push(`${label} ${read()}`);
    const panelScale = 1 / r.pixelScale;
    r.push();
    if (panelScale !== 1) r.scale(panelScale, panelScale);
    let longest = 0;
    for (const line of lines) if (line.length > longest) longest = line.length;
    r.rect(4, 4, longest * CHAR_WIDTH + 8, lines.length * LINE_HEIGHT + 4, PANEL_COLOR);
    for (let i = 0; i < lines.length; i++) {
      r.text(lines[i], 8, 8 + i * LINE_HEIGHT, TEXT_STYLE);
    }
    r.pop();
  }
}
