import { describe, expect, it } from 'vitest';
import { Loop } from '../src/core/Loop.js';

const makeLoop = (opts = {}) => {
  const calls = { updates: 0, renders: [] };
  const loop = new Loop({
    update: () => calls.updates++,
    render: (alpha) => calls.renders.push(alpha),
    raf: () => 1,
    caf: () => {},
    ...opts,
  });
  return { loop, calls };
};

// Drive the loop with a fake clock: `frames` frames of `frameMs` each.
const run = (loop, frames, frameMs, start = 0) => {
  for (let i = 0; i <= frames; i++) loop.tick(start + i * frameMs);
};

describe('Loop', () => {
  it('runs 60 updates per second on a 60 Hz display', () => {
    const { loop, calls } = makeLoop();
    loop.start();
    run(loop, 60, 1000 / 60);
    expect(calls.updates).toBe(60);
  });

  it('runs 60 updates per second on a 144 Hz display', () => {
    const { loop, calls } = makeLoop();
    loop.start();
    run(loop, 144, 1000 / 144);
    expect(calls.updates).toBe(60);
    expect(calls.renders.length).toBe(145);
  });

  it('runs 60 updates per second on a 30 Hz display', () => {
    const { loop, calls } = makeLoop();
    loop.start();
    run(loop, 30, 1000 / 30);
    expect(calls.updates).toBe(60);
  });

  it('clamps long frames so a stalled tab does not spiral', () => {
    const { loop, calls } = makeLoop();
    loop.start();
    loop.tick(0);
    loop.tick(5000); // 5 s hitch
    expect(calls.updates).toBe(15); // 0.25 s max frame at 60 Hz
  });

  it('reports alpha as the leftover fraction of a step', () => {
    const { loop, calls } = makeLoop({ step: 0.1 });
    loop.start();
    loop.tick(0);
    loop.tick(150);
    expect(calls.updates).toBe(1);
    expect(calls.renders.at(-1)).toBeCloseTo(0.5);
  });

  it('does nothing while paused and does not catch up after resume', () => {
    const { loop, calls } = makeLoop();
    loop.start();
    run(loop, 10, 1000 / 60);
    const before = calls.updates;
    loop.pause();
    run(loop, 60, 1000 / 60, 200);
    expect(calls.updates).toBe(before);
    loop.resume();
    loop.tick(5000);
    loop.tick(5000 + 1000 / 60);
    expect(calls.updates).toBe(before + 1);
  });

  it('stops ticking after stop()', () => {
    const { loop, calls } = makeLoop();
    loop.start();
    loop.tick(0);
    loop.stop();
    loop.tick(1000);
    expect(calls.updates).toBe(0);
  });
});
