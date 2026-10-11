/**
 * Asset keys mapped to URLs. URLs are relative to the HTML page.
 * @typedef {object} AssetManifest
 * @property {Record<string, string>} [images]
 * @property {Record<string, string>} [audio]
 * @property {Record<string, string>} [json]
 */

/**
 * @typedef {'images' | 'audio' | 'json'} AssetType
 */

/**
 * @typedef {object} AssetsOptions
 * @property {import('./Audio.js').Audio} [audio] Decodes loaded sounds into AudioBuffers. Without it, sounds stay as ArrayBuffers.
 * @property {Partial<Record<AssetType, (url: string) => Promise<any>>>} [loaders] Replace a loader, e.g. with a fake in tests.
 */

const ASSET_TYPES = ['images', 'audio', 'json'];

const loadImage = (url) =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load image "${url}"`));
    img.src = url;
  });

const fetchOrThrow = async (url) => {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Failed to load "${url}": ${response.status}`);
  return response;
};

/**
 * Loads images, sounds and JSON into a cache keyed by name. Keys that are
 * already cached are not loaded again.
 */
export class Assets {
  /** @param {AssetsOptions} [options] */
  constructor({ audio, loaders = {} } = {}) {
    this.audio = audio;
    /** Progress of the latest {@link Assets#load} call, 0..1. */
    this.progress = 1;
    this._loaders = {
      images: loaders.images ?? loadImage,
      audio: loaders.audio ?? ((url) => this._loadSound(url)),
      json: loaders.json ?? (async (url) => (await fetchOrThrow(url)).json()),
    };
    this._cache = { images: new Map(), audio: new Map(), json: new Map() };
  }

  /**
   * Load everything in the manifest in parallel.
   * @param {AssetManifest} manifest
   * @param {(progress: number) => void} [onProgress] Called after each file with progress 0..1.
   * @returns {Promise<void>} Rejects with the failing URL if any file fails to load.
   * @example
   * await assets.load({ images: { hero: 'img/hero.png' }, audio: { jump: 'sfx/jump.wav' } });
   */
  async load(manifest, onProgress) {
    const jobs = ASSET_TYPES.flatMap((type) =>
      Object.entries(manifest[type] ?? {}).map(([key, url]) => ({ type, key, url })),
    );
    let finished = 0;
    this.progress = jobs.length === 0 ? 1 : 0;
    await Promise.all(
      jobs.map(async ({ type, key, url }) => {
        const cache = this._cache[type];
        if (!cache.has(key)) cache.set(key, await this._loaders[type](url));
        finished++;
        this.progress = finished / jobs.length;
        onProgress?.(this.progress);
      }),
    );
  }

  /**
   * @param {string} key
   * @returns {HTMLImageElement}
   * @throws {Error} If the key hasn't been loaded.
   */
  image(key) {
    return this._get('images', key);
  }

  /**
   * @param {string} key
   * @returns {AudioBuffer}
   * @throws {Error} If the key hasn't been loaded.
   */
  sound(key) {
    return this._get('audio', key);
  }

  /**
   * @param {string} key
   * @returns {any} The parsed JSON.
   * @throws {Error} If the key hasn't been loaded.
   */
  json(key) {
    return this._get('json', key);
  }

  /**
   * @param {AssetType} type
   * @param {string} key
   * @returns {boolean}
   */
  has(type, key) {
    return this._cache[type].has(key);
  }

  _get(type, key) {
    const value = this._cache[type].get(key);
    if (value === undefined) throw new Error(`Asset "${key}" not loaded (${type})`);
    return value;
  }

  async _loadSound(url) {
    const buffer = await (await fetchOrThrow(url)).arrayBuffer();
    return this.audio ? this.audio.decode(buffer) : buffer;
  }
}
