/**
 * @typedef {object} PlayOptions
 * @property {number} [volume=1] 0..1, multiplied by the master volume.
 * @property {boolean} [loop=false]
 * @property {number} [rate=1] Playback speed; also shifts pitch.
 */

/**
 * @typedef {object} ToneOptions
 * @property {number} [freq=440] Start frequency in Hz.
 * @property {number} [to] End frequency in Hz. The pitch slides from `freq` to `to` over the duration.
 * @property {number} [duration=0.1] Seconds.
 * @property {OscillatorType} [type='square']
 * @property {number} [volume=0.2] 0..1.
 */

const SILENT = 0.0001;

/**
 * Web Audio wrapper. The AudioContext is created on first use; browsers keep
 * it silent until a user gesture, so {@link Audio#attach} unlocks it on the
 * first pointer or key press. Sounds played before then are dropped.
 */
export class Audio {
  constructor() {
    this._ctx = null;
    this._master = null;
    this._volume = 1;
    this._muted = false;
    /** Where {@link Audio#play} looks up sounds by key. Set by the game. @type {import('./Assets.js').Assets | null} */
    this.assets = null;
    this._unlock = () => this.unlock();
  }

  /** The AudioContext, or null if Web Audio is unavailable. @type {AudioContext | null} */
  get ctx() {
    if (!this._ctx) this._createContext();
    return this._ctx;
  }

  /** Unlock audio on the first pointer or key press. Called by {@link Game#start}. */
  attach() {
    window.addEventListener('pointerdown', this._unlock, { once: true });
    window.addEventListener('keydown', this._unlock, { once: true });
  }

  /** Resume a suspended context. Must run inside a user gesture to take effect. */
  unlock() {
    const ctx = this.ctx;
    if (ctx && ctx.state === 'suspended') ctx.resume();
  }

  /**
   * @param {ArrayBuffer} buffer Encoded audio file contents.
   * @returns {Promise<AudioBuffer | null>} Null when Web Audio is unavailable.
   */
  decode(buffer) {
    const ctx = this.ctx;
    return ctx ? ctx.decodeAudioData(buffer) : Promise.resolve(null);
  }

  /** Master volume, 0..1. */
  get volume() {
    return this._volume;
  }

  set volume(value) {
    this._volume = value;
    this._applyVolume();
  }

  /** Silences all output without changing {@link Audio#volume}. */
  get muted() {
    return this._muted;
  }

  set muted(value) {
    this._muted = value;
    this._applyVolume();
  }

  /**
   * @param {string | AudioBuffer} sound Asset key or decoded buffer.
   * @param {PlayOptions} [options]
   * @returns {AudioBufferSourceNode | null} Handle for {@link Audio#stop}, or null if audio is unavailable.
   * @throws {Error} If `sound` is a key that hasn't been loaded.
   */
  play(sound, { volume = 1, loop = false, rate = 1 } = {}) {
    const ctx = this.ctx;
    if (!ctx) return null;
    const buffer = typeof sound === 'string' ? this.assets?.sound(sound) : sound;
    if (!buffer) return null;

    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = loop;
    source.playbackRate.value = rate;
    source.connect(this._gainNode(volume)).connect(this._master);
    source.start();
    return source;
  }

  /**
   * Stop a sound started with {@link Audio#play}. Ignores null and already-stopped handles.
   * @param {AudioBufferSourceNode | null} handle
   */
  stop(handle) {
    try {
      handle?.stop();
    } catch {
      return;
    }
  }

  /**
   * Play a synthesized beep that fades out. Does nothing until audio is unlocked.
   * @param {ToneOptions} [options]
   * @example
   * audio.tone({ freq: 300, to: 600, duration: 0.1 }); // rising jump blip
   */
  tone({ freq = 440, to, duration = 0.1, type = 'square', volume = 0.2 } = {}) {
    const ctx = this.ctx;
    if (ctx?.state !== 'running') return;
    const now = ctx.currentTime;
    const end = now + duration;

    const oscillator = ctx.createOscillator();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(freq, now);
    if (to !== undefined) oscillator.frequency.exponentialRampToValueAtTime(Math.max(to, 1), end);

    const gain = this._gainNode(volume);
    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(SILENT, end);

    oscillator.connect(gain).connect(this._master);
    oscillator.start(now);
    oscillator.stop(end);
  }

  _createContext() {
    const AudioContextClass = globalThis.AudioContext ?? globalThis.webkitAudioContext;
    if (!AudioContextClass) return;
    this._ctx = new AudioContextClass();
    this._master = this._ctx.createGain();
    this._master.connect(this._ctx.destination);
    this._applyVolume();
  }

  _gainNode(volume) {
    const gain = this._ctx.createGain();
    gain.gain.value = volume;
    return gain;
  }

  _applyVolume() {
    if (this._master) this._master.gain.value = this._muted ? 0 : this._volume;
  }
}
