import { Assets } from '../platform/Assets.js';
import { Audio } from '../platform/Audio.js';
import { Input } from '../platform/Input.js';
import { CanvasRenderer } from '../render/canvas/CanvasRenderer.js';
import { Debug } from '../util/Debug.js';
import { Events } from './Events.js';
import { Loop } from './Loop.js';
import { SceneManager } from './SceneManager.js';

/**
 * @typedef {object} GameOptions
 * @property {string | HTMLCanvasElement} [canvas] Selector or element. A canvas is appended to `<body>` if omitted.
 * @property {number} [width=640] Logical width in pixels.
 * @property {number} [height=360] Logical height in pixels.
 * @property {import('../render/Renderer.js').ScaleMode} [scale='fit']
 * @property {string} [background='#000'] CSS color used to clear each frame.
 * @property {new (options: import('../render/Renderer.js').RendererOptions) => Renderer} [renderer=CanvasRenderer] Rendering backend class.
 * @property {number} [step=1/60] Seconds per fixed update.
 * @property {boolean} [debug=false] Show the debug overlay at start. Toggle with the backquote key.
 */

/**
 * Shared services handed to every scene and entity update.
 * @typedef {object} GameContext
 * @property {Game} game
 * @property {Input} input
 * @property {Assets} assets
 * @property {Renderer} renderer
 * @property {Audio} audio
 * @property {Events} events
 * @property {import('./Scene.js').Scene | null} scene The top scene.
 * @property {import('../render/Camera.js').Camera | null} camera The top scene's camera.
 */

/** @typedef {import('../render/Renderer.js').Renderer} Renderer */

const LOADING_BAR_COLOR = '#fff';

/**
 * @param {Game} game
 * @returns {GameContext}
 */
const createContext = (game) => ({
  game,
  input: game.input,
  assets: game.assets,
  renderer: game.renderer,
  audio: game.audio,
  events: game.events,
  scene: null,
  camera: null,
});

/**
 * Entry point. Creates every subsystem, runs the loop and owns the scene stack.
 *
 * Emits `resize`, `pause`, `resume` and `stop` on {@link Game#events}, plus
 * `hidden` and `visible` when the tab is hidden or shown. The loop doesn't
 * run while hidden, whether or not the game is paused.
 *
 * @example
 * const game = new Game({ canvas: '#game', width: 320, height: 180, scale: 'pixel' });
 * game.scenes.add('play', PlayScene);
 * game.start('play');
 */
export class Game {
  /** @param {GameOptions} [options] */
  constructor({
    canvas,
    width = 640,
    height = 360,
    scale = 'fit',
    background = '#000',
    renderer: RendererClass = CanvasRenderer,
    step = 1 / 60,
    debug = false,
  } = {}) {
    this.width = width;
    this.height = height;
    /** True after {@link Game#pause} until {@link Game#resume}. */
    this.paused = false;
    this._stepping = false;
    /**
     * Drawn after every scene and before the debug overlay, in screen space, every frame
     * (also during loading). For things that sit above all scenes, like on-screen touch buttons.
     * @type {((r: Renderer, alpha: number) => void) | null}
     */
    this.overlay = null;

    this.events = new Events();
    this.renderer = new RendererClass({ canvas, width, height, scale, background });
    this.audio = new Audio();
    this.assets = new Assets({ audio: this.audio });
    this.audio.assets = this.assets;
    this.input = new Input({
      canvas: this.renderer.canvas,
      toLogical: (x, y, out) => this.renderer.toLogical(x, y, out),
    });
    this.scenes = new SceneManager(this);
    this.debug = new Debug(this, debug);
    this.ctx = createContext(this);

    this.loop = new Loop({ step, update: (dt) => this._update(dt), render: (alpha) => this._render(alpha) });
    this.renderer.onResize = () => this.events.emit('resize', this.renderer);
    this._onVisibilityChange = () => this._pauseWhileHidden();
  }

  /**
   * Shorthand for `game.events.on`.
   * @param {string} type
   * @param {Function} fn
   * @returns {() => void} Unsubscribe function.
   */
  on(type, fn) {
    return this.events.on(type, fn);
  }

  /**
   * @param {string} type
   * @param {Function} fn
   */
  off(type, fn) {
    this.events.off(type, fn);
  }

  /**
   * @param {string} type
   * @param {...any} args
   */
  emit(type, ...args) {
    this.events.emit(type, ...args);
  }

  /**
   * Attach input, audio and resize listeners, start the loop and optionally switch to a scene.
   * @param {string} [key] Registered scene to start.
   * @param {any} [data] Passed to the scene's `enter`.
   * @returns {Promise<void>} Settles once the scene has entered.
   */
  start(key, data) {
    this.input.attach();
    this.audio.attach();
    this.renderer.attach();
    document.addEventListener('visibilitychange', this._onVisibilityChange);
    this.loop.start();
    return key ? this.scenes.switch(key, data) : Promise.resolve();
  }

  /** Freeze updates and rendering. The canvas keeps the last frame. */
  pause() {
    this.paused = true;
    this.loop.pause();
    this.events.emit('pause');
  }

  /** Continue after {@link Game#pause} without catching up on the paused time. */
  resume() {
    this.paused = false;
    this.loop.resume();
    this.events.emit('resume');
  }

  /** Stop the loop and detach all listeners. */
  stop() {
    this.loop.stop();
    this.input.detach();
    this.renderer.detach();
    document.removeEventListener('visibilitychange', this._onVisibilityChange);
    this.events.emit('stop');
  }

  _pauseWhileHidden() {
    if (document.hidden) {
      this.loop.pause();
      this.events.emit('hidden');
      return;
    }
    if (!this.paused) this.loop.resume();
    this.events.emit('visible');
  }

  _update(dt) {
    const scene = this.scenes.current;
    this.input.poll(scene ? scene.camera : null);
    this.debug.update();
    if (scene && !this.scenes.loading) this._stepScene(scene, dt);
    this.scenes._flush();
  }

  _stepScene(scene, dt) {
    this._stepping = true;
    try {
      scene._step(dt);
    } finally {
      this._stepping = false;
    }
  }

  _render(alpha) {
    const r = this.renderer;
    r.beginFrame();
    if (this.scenes.loading) this._renderLoading(r);
    else this._renderScenes(r, alpha);
    this.overlay?.(r, alpha);
    this.debug.render(r);
    r.endFrame();
  }

  _renderScenes(r, alpha) {
    const stack = this.scenes.stack;
    for (let i = this.scenes._firstDrawnIndex(); i < stack.length; i++) stack[i]._draw(r, alpha);
  }

  _renderLoading(r) {
    const barWidth = Math.round(this.width / 2);
    const x = Math.round((this.width - barWidth) / 2);
    const y = Math.round(this.height / 2);
    r.strokeRect(x, y - 4, barWidth, 8, LOADING_BAR_COLOR, 1);
    r.rect(x + 2, y - 2, (barWidth - 4) * this.assets.progress, 4, LOADING_BAR_COLOR);
  }
}
