import { describe, expect, it } from 'vitest';
import { Input } from '../src/platform/Input.js';
import { Camera } from '../src/render/Camera.js';

describe('Input keyboard', () => {
  it('reports justPressed for exactly one step', () => {
    const input = new Input();
    input.keyDown('Space');
    input.poll();
    expect(input.justPressed('Space')).toBe(true);
    expect(input.isDown('Space')).toBe(true);
    input.poll();
    expect(input.justPressed('Space')).toBe(false);
    expect(input.isDown('Space')).toBe(true);
  });

  it('catches a tap shorter than one step', () => {
    const input = new Input();
    input.keyDown('KeyZ');
    input.keyUp('KeyZ');
    input.poll();
    expect(input.justPressed('KeyZ')).toBe(true);
    expect(input.justReleased('KeyZ')).toBe(true);
    expect(input.isDown('KeyZ')).toBe(true);
    input.poll();
    expect(input.isDown('KeyZ')).toBe(false);
  });

  it('ignores key repeat', () => {
    const input = new Input();
    input.keyDown('KeyA');
    input.poll();
    input.keyDown('KeyA', true);
    input.poll();
    expect(input.justPressed('KeyA')).toBe(false);
  });

  it('lists the codes pressed this step', () => {
    const input = new Input();
    input.keyDown('KeyQ');
    input.poll();
    expect([...input.pressedCodes]).toEqual(['KeyQ']);
    input.poll();
    expect(input.pressedCodes.size).toBe(0);
  });

  it('accepts key lists and computes axes', () => {
    const input = new Input();
    input.keyDown('KeyD');
    input.poll();
    expect(input.isDown(['ArrowRight', 'KeyD'])).toBe(true);
    expect(input.axis(['ArrowLeft', 'KeyA'], ['ArrowRight', 'KeyD'])).toBe(1);
    input.keyDown('ArrowLeft');
    input.poll();
    expect(input.axis(['ArrowLeft', 'KeyA'], ['ArrowRight', 'KeyD'])).toBe(0);
  });

  it('releases everything on reset (window blur)', () => {
    const input = new Input();
    input.keyDown('ArrowUp');
    input.poll();
    input.reset();
    input.poll();
    expect(input.isDown('ArrowUp')).toBe(false);
    expect(input.justReleased('ArrowUp')).toBe(true);
  });
});

describe('Input pointer', () => {
  it('tracks presses and converts to world coordinates through the camera', () => {
    const input = new Input();
    const camera = new Camera(320, 180);
    camera.x = 1000;
    camera.y = 500;
    input.pointerMove(160, 90);
    input.pointerDown();
    input.poll(camera);
    expect(input.pointer).toMatchObject({ x: 160, y: 90, worldX: 1000, worldY: 500, down: true, justPressed: true });
    input.pointerUp();
    input.poll(camera);
    expect(input.pointer).toMatchObject({ down: false, justPressed: false, justReleased: true });
  });
});
