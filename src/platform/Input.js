/**
 * A `KeyboardEvent.code` value such as `'KeyA'`, `'ArrowLeft'` or `'Space'`,
 * or an array meaning "any of these".
 * @typedef {string | string[]} KeyQuery
 */

/**
 * @typedef {object} PointerState
 * @property {number} x Logical screen pixels.
 * @property {number} y
 * @property {number} worldX Same point in world coordinates, through the top scene's camera.
 * @property {number} worldY
 * @property {boolean} down
 * @property {boolean} justPressed True for the one step in which the press happened.
 * @property {boolean} justReleased
 */

/**
 * @typedef {object} InputOptions
 * @property {HTMLCanvasElement} [canvas] Pointer events are read from this element.
 * @property {(clientX: number, clientY: number, out: { x: number, y: number }) => unknown} [toLogical] Converts client coordinates to logical pixels.
 */

const KEYS_THAT_SCROLL_THE_PAGE = new Set(['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space']);

const hasAny = (set, keys) => {
  if (typeof keys === 'string') return set.has(keys);
  for (let i = 0; i < keys.length; i++) if (set.has(keys[i])) return true;
  return false;
};

/**
 * Polled keyboard and pointer input. Events are buffered and snapshotted once
 * per update step, so every entity sees the same state during a step and
 * presses shorter than a step are never lost. Key repeat is ignored.
 *
 * Mouse, pen and the first touch share one pointer. All keys are released
 * when the window loses focus.
 */
export class Input {
  /** @param {InputOptions} [options] */
  constructor({ canvas, toLogical } = {}) {
    this.canvas = canvas;
    this.toLogical = toLogical;

    this._keysDown = new Set();
    this._pressedSincePoll = new Set();
    this._releasedSincePoll = new Set();
    this._held = new Set();
    this._pressed = new Set();
    this._released = new Set();

    this._rawPointer = { x: 0, y: 0, down: false, pressed: false, released: false };
    this._worldPoint = { x: 0, y: 0 };
    /** Pointer snapshot for the current step. @type {PointerState} */
    this.pointer = { x: 0, y: 0, worldX: 0, worldY: 0, down: false, justPressed: false, justReleased: false };

    this._listeners = this._createListeners();
  }

  /** Start listening to DOM events. Called by {@link Game#start}. */
  attach() {
    for (const [target, type, handler] of this._listeners) target?.addEventListener(type, handler);
  }

  detach() {
    for (const [target, type, handler] of this._listeners) target?.removeEventListener(type, handler);
  }

  /**
   * Feed a key press, as the keydown listener does. Useful in tests and for virtual controls.
   * @param {string} code
   * @param {boolean} [repeat=false] Repeats are ignored.
   */
  keyDown(code, repeat = false) {
    if (repeat || this._keysDown.has(code)) return;
    this._keysDown.add(code);
    this._pressedSincePoll.add(code);
  }

  /** @param {string} code */
  keyUp(code) {
    if (!this._keysDown.has(code)) return;
    this._keysDown.delete(code);
    this._releasedSincePoll.add(code);
  }

  pointerDown() {
    this._rawPointer.down = true;
    this._rawPointer.pressed = true;
  }

  pointerUp() {
    if (!this._rawPointer.down) return;
    this._rawPointer.down = false;
    this._rawPointer.released = true;
  }

  /**
   * @param {number} x Logical pixels.
   * @param {number} y
   */
  pointerMove(x, y) {
    this._rawPointer.x = x;
    this._rawPointer.y = y;
  }

  /** Release every key and the pointer. */
  reset() {
    for (const code of this._keysDown) this._releasedSincePoll.add(code);
    this._keysDown.clear();
    this.pointerUp();
  }

  /**
   * Take the per-step snapshot. The game calls this before each update.
   * @param {import('../render/Camera.js').Camera | null} [camera] Used for `pointer.worldX/worldY`; screen coordinates are used when omitted.
   */
  poll(camera) {
    this._snapshotKeys();
    this._snapshotPointer(camera);
  }

  /**
   * Held during this step. Includes keys tapped and released within the step.
   * @param {KeyQuery} keys
   * @returns {boolean}
   */
  isDown(keys) {
    return hasAny(this._held, keys);
  }

  /**
   * Pressed during this step. True for exactly one step per press.
   * @param {KeyQuery} keys
   * @returns {boolean}
   */
  justPressed(keys) {
    return hasAny(this._pressed, keys);
  }

  /**
   * @param {KeyQuery} keys
   * @returns {boolean}
   */
  justReleased(keys) {
    return hasAny(this._released, keys);
  }

  /**
   * `KeyboardEvent.code`s pressed this step. Read it each step instead of keeping it: the set is reused.
   * @type {ReadonlySet<string>}
   * @example
   * const [code] = input.pressedCodes; // the key to bind, if any
   */
  get pressedCodes() {
    return this._pressed;
  }

  /** @returns {boolean} True if any key was pressed this step. */
  anyPressed() {
    return this._pressed.size > 0;
  }

  /**
   * Direction from a pair of keys. Holding both gives 0.
   * @param {KeyQuery} negative
   * @param {KeyQuery} positive
   * @returns {-1 | 0 | 1}
   * @example
   * this.vel.x = input.axis(['ArrowLeft', 'KeyA'], ['ArrowRight', 'KeyD']) * SPEED;
   */
  axis(negative, positive) {
    return /** @type {-1 | 0 | 1} */ ((this.isDown(positive) ? 1 : 0) - (this.isDown(negative) ? 1 : 0));
  }

  _snapshotKeys() {
    const pressed = this._pressedSincePoll;
    this._pressedSincePoll = this._pressed;
    this._pressed = pressed;
    this._pressedSincePoll.clear();

    const released = this._releasedSincePoll;
    this._releasedSincePoll = this._released;
    this._released = released;
    this._releasedSincePoll.clear();

    this._held.clear();
    for (const code of this._keysDown) this._held.add(code);
    for (const code of this._pressed) this._held.add(code);
  }

  _snapshotPointer(camera) {
    const raw = this._rawPointer;
    const pointer = this.pointer;
    pointer.x = raw.x;
    pointer.y = raw.y;
    pointer.justPressed = raw.pressed;
    pointer.justReleased = raw.released;
    pointer.down = raw.down || raw.pressed;
    raw.pressed = false;
    raw.released = false;

    const world = camera ? camera.screenToWorld(raw.x, raw.y, this._worldPoint) : raw;
    pointer.worldX = world.x;
    pointer.worldY = world.y;
  }

  /** @returns {Array<[EventTarget | null | undefined, string, (e: any) => void]>} */
  _createListeners() {
    const win = typeof window === 'undefined' ? null : window;
    const movePointer = (e) => this.toLogical?.(e.clientX, e.clientY, this._rawPointer);
    return [
      [
        win,
        'keydown',
        (e) => {
          if (KEYS_THAT_SCROLL_THE_PAGE.has(e.code)) e.preventDefault();
          this.keyDown(e.code, e.repeat);
        },
      ],
      [win, 'keyup', (e) => this.keyUp(e.code)],
      [win, 'blur', () => this.reset()],
      [
        this.canvas,
        'pointerdown',
        (e) => {
          if (!e.isPrimary) return;
          this.canvas.setPointerCapture?.(e.pointerId);
          movePointer(e);
          this.pointerDown();
        },
      ],
      [this.canvas, 'pointermove', (e) => e.isPrimary && movePointer(e)],
      [
        this.canvas,
        'pointerup',
        (e) => {
          if (!e.isPrimary) return;
          movePointer(e);
          this.pointerUp();
        },
      ],
      [this.canvas, 'pointercancel', () => this.pointerUp()],
    ];
  }
}
