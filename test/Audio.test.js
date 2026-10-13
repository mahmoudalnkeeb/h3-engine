import { afterEach, describe, expect, it, vi } from 'vitest';
import { Audio } from '../src/platform/Audio.js';

const fakeNode = (kind) => ({
  kind,
  connectedTo: null,
  connect(next) {
    this.connectedTo = next;
    return next;
  },
});

class FakeAudioContext {
  state = 'running';
  currentTime = 0;
  destination = fakeNode('destination');

  createGain() {
    const param = { value: 1, setValueAtTime() {}, exponentialRampToValueAtTime() {} };
    return Object.assign(fakeNode('gain'), { gain: param });
  }

  createBufferSource() {
    return Object.assign(fakeNode('source'), { playbackRate: { value: 1 }, start: vi.fn(), stop: vi.fn() });
  }

  createOscillator() {
    const frequency = { setValueAtTime() {}, exponentialRampToValueAtTime() {} };
    return Object.assign(fakeNode('oscillator'), { frequency, start() {}, stop() {} });
  }
}

const createAudio = () => {
  vi.stubGlobal('AudioContext', FakeAudioContext);
  return new Audio();
};

describe('Audio', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('creates each bus once, feeding the master gain', () => {
    const audio = createAudio();
    const music = audio.bus('music');
    expect(audio.bus('music')).toBe(music);
    expect(audio.bus('sfx')).not.toBe(music);
    expect(music.connectedTo).toBe(audio._master);
  });

  it('routes play through its own gain into the named bus, with loop points', () => {
    const audio = createAudio();
    const handle = audio.play({}, { volume: 0.5, loop: true, loopStart: 1, loopEnd: 9, bus: 'music' });
    expect(handle.source.connectedTo).toBe(handle.gain);
    expect(handle.gain.gain.value).toBe(0.5);
    expect(handle.gain.connectedTo).toBe(audio.bus('music'));
    expect(handle.source.loopStart).toBe(1);
    expect(handle.source.loopEnd).toBe(9);
    audio.stop(handle);
    expect(handle.source.stop).toHaveBeenCalled();
  });

  it('sends play and tone straight to master without a bus', () => {
    const audio = createAudio();
    const handle = audio.play({});
    expect(handle.gain.connectedTo).toBe(audio._master);
    expect(audio._buses.size).toBe(0);
    audio.tone({ bus: 'sfx' });
    expect(audio._buses.has('sfx')).toBe(true);
  });
});
