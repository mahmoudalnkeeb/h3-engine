import { Collision, clamp, Entity, Game, rand, randInt, Scene } from '../../src/index.js';

const W = 480;
const H = 270;
const LEFT = ['ArrowLeft', 'KeyA'];
const RIGHT = ['ArrowRight', 'KeyD'];

class Player extends Entity {
  constructor() {
    super({ x: W / 2 - 12, y: H - 32, w: 24, h: 24, tags: ['player'] });
    this.speed = 220;
  }

  update(dt, { input }) {
    this.pos.x += input.axis(LEFT, RIGHT) * this.speed * dt;
    this.pos.x = clamp(this.pos.x, 0, W - this.w);
  }

  render(r) {
    r.rect(this.pos.x, this.pos.y, this.w, this.h, '#4cc9f0');
  }
}

class Rock extends Entity {
  constructor() {
    const size = randInt(12, 28);
    super({ x: rand(0, W - size), y: -size, w: size, h: size, tags: ['rock'] });
    this.vel.y = rand(120, 220);
  }

  update(dt) {
    super.update(dt);
    if (this.pos.y > H) this.destroy();
  }

  render(r) {
    r.rect(this.pos.x, this.pos.y, this.w, this.h, '#f25f5c');
  }
}

class PlayScene extends Scene {
  enter() {
    this.time = 0;
    this.over = false;
    this.add(new Player());
    this.timer.every(0.5, () => this.add(new Rock()));
  }

  update(dt) {
    this.time += dt;
    Collision.check(this, 'player', 'rock', () => {
      if (this.over) return;
      this.over = true;
      this.game.scenes.switch('over', { time: this.time });
    });
  }

  render(r) {
    r.text(`${this.time.toFixed(1)}s`, 8, 8);
  }
}

class GameOverScene extends Scene {
  enter({ time }) {
    this.time = time;
  }

  update(_dt, { input }) {
    if (input.justPressed('Space')) this.game.scenes.switch('play');
  }

  render(r) {
    r.text('Game over', W / 2, 100, { font: 'bold 32px sans-serif', align: 'center' });
    r.text(`You lasted ${this.time.toFixed(1)} seconds`, W / 2, 145, { align: 'center' });
    r.text('Press Space to try again', W / 2, 175, { font: '14px sans-serif', color: '#8888aa', align: 'center' });
  }
}

const game = new Game({ canvas: '#game', width: W, height: H, background: '#10101a' });
game.scenes.add('play', PlayScene).add('over', GameOverScene);
game.start('play');

globalThis.game = game;
