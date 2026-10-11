import { Collision, Pool, Scene } from '../../src/index.js';
import { Backdrop, Coin, Flag, H, JUMP, Particle, Player, Slime, W } from './entities.js';
import { Level } from './Level.js';
import { LEVELS } from './levels.js';

const START = ['Space', 'Enter'];
const PAUSE = ['KeyP', 'Escape'];
const FONT = 'monospace';

/** Draw text with a 1px drop shadow so it reads over any background. */
const label = (r, str, x, y, { size = 8, color = '#fff', align = 'center' } = {}) => {
  const font = `bold ${size}px ${FONT}`;
  r.text(str, x + 1, y + 1, { font, color: 'rgba(0,0,0,0.5)', align });
  r.text(str, x, y, { font, color, align });
};

export class TitleScene extends Scene {
  enter() {
    this.t = 0;
    this.add(new Backdrop());
  }

  update(dt, { input }) {
    this.t += dt;
    this.camera.x += dt * 20; // drift the backdrop
    if (input.justPressed(START)) this.game.scenes.switch('play');
  }

  render(r) {
    r.rect(0, H - 24, W, 24, '#8b5a2b');
    r.rect(0, H - 24, W, 4, '#5ec44a');
    label(r, 'PIXEL HOP', W / 2, 44, { size: 24, color: '#ff5e5b' });
    label(r, 'made with h3-engine', W / 2, 74, { size: 8, color: '#1d3b5c' });
    if (Math.floor(this.t * 2) % 2 === 0) label(r, 'PRESS SPACE TO START', W / 2, 104, { size: 10 });
    label(r, 'ARROWS/WASD move   SPACE/Z jump   P pause', W / 2, 136, { size: 8, color: '#1d3b5c' });
  }
}

export class PlayScene extends Scene {
  enter({ level = 0, lives = 3, score = 0, coins = 0 } = {}) {
    this.levelIndex = level;
    this.lives = lives;
    this.score = score;
    this.coins = coins;
    // Restarting after a death resets the level to how it was on entry.
    this.entry = { level, lives, score, coins };
    /** 'play', 'dead' or 'won'. */
    this.state = 'play';
    this.particles = new Pool(() => new Particle(), 60);
    this.game.debug.watch('particles', () => this.count('fx'));
    this.game.debug.watch('player', () => `${this.player.vel.x | 0},${this.player.vel.y | 0} ${this.state}`);

    const def = LEVELS[level];
    this.level = this.add(new Level(def.map));
    this.add(new Backdrop());
    for (const { ch, x, y } of this.level.spawns) {
      if (ch === 'P') this.player = this.add(new Player(x, y));
      else if (ch === 'e') this.add(new Slime(x, y));
      else if (ch === 'o') this.add(new Coin(x, y));
      else if (ch === 'F') this.flag = this.add(new Flag(x, y));
    }

    this.camera.follow(this.player, { lerp: 0.15, offsetY: -16 });
    this.camera.setBounds(0, 0, this.level.w, this.level.h);
    this.camera.roundPixels = true;
    this.camera.snap();

    this.banner = { text: def.name, alpha: 1 };
    this.tween(this.banner, { alpha: 0 }, 0.6, 'quadIn', { delay: 1.4 });
  }

  update(_dt, { input }) {
    if (input.justPressed(PAUSE)) this.game.scenes.push('pause');
    if (this.state !== 'play') return;

    Collision.check(this, 'player', 'coin', (_p, coin) => {
      coin.destroy();
      this.coins++;
      this.score += 10;
      this.sfx('coin');
      this.burst(coin.cx, coin.cy, '#ffd166', 6);
    });

    Collision.check(this, 'player', 'enemy', (p, enemy) => {
      if (this.state !== 'play') return;
      // Falling onto an enemy's top stomps it; any other contact hurts.
      const stomp = p.vel.y > 0 && p.pos.y + p.h - enemy.pos.y < 8;
      if (stomp) {
        enemy.destroy();
        p.jump(input.isDown(JUMP) ? 300 : 200);
        this.score += 100;
        this.sfx('stomp');
        this.burst(enemy.cx, enemy.cy, '#7bd389', 10);
        this.camera.shake(2, 0.15);
      } else {
        this.playerDie();
      }
    });

    Collision.check(this, 'player', 'goal', () => this.reachGoal());
  }

  exit() {
    this.game.debug.unwatch('particles');
    this.game.debug.unwatch('player');
  }

  burst(x, y, color, count) {
    for (let i = 0; i < count; i++) this.add(this.particles.get().spawn(x, y, color, this.particles));
  }

  playerDie() {
    if (this.state !== 'play') return;
    this.state = 'dead';
    const p = this.player;
    p.alive = false;
    p.vel.set(0, -260);
    p.z = 10; // in front of everything while falling off screen
    this.camera.follow(null);
    this.camera.shake(4, 0.3);
    this.sfx('die');
    this.lives--;
    this.timer.after(1.6, () => {
      if (this.lives > 0) this.game.scenes.switch('play', { ...this.entry, lives: this.lives });
      else this.game.scenes.switch('gameover', { score: this.score, coins: this.coins });
    });
  }

  reachGoal() {
    if (this.state !== 'play') return;
    this.state = 'won';
    this.player.won = true;
    this.score += 500;
    this.tween(this.flag, { lowered: 1 }, 0.8, 'quadOut');
    [523, 659, 784, 1047].forEach((freq, i) => {
      this.timer.after(i * 0.12, () => this.ctx.audio.tone({ freq, duration: 0.15, type: 'triangle' }));
    });
    this.timer.after(2.2, () => {
      const next = this.levelIndex + 1;
      const data = { level: next, lives: this.lives, score: this.score, coins: this.coins };
      if (next < LEVELS.length) this.game.scenes.switch('play', data);
      else this.game.scenes.switch('win', data);
    });
  }

  sfx(kind) {
    const audio = this.ctx.audio;
    if (kind === 'jump') audio.tone({ freq: 300, to: 600, duration: 0.1, volume: 0.1 });
    else if (kind === 'coin') audio.tone({ freq: 988, to: 1319, duration: 0.08, volume: 0.1 });
    else if (kind === 'stomp') audio.tone({ freq: 220, to: 80, duration: 0.12, volume: 0.15 });
    else if (kind === 'die') audio.tone({ freq: 440, to: 80, duration: 0.6, type: 'sawtooth', volume: 0.15 });
  }

  render(r) {
    r.rect(0, 0, W, 14, 'rgba(0,0,0,0.35)');
    r.rect(4, 3, 6, 8, '#ffd166');
    label(r, `x${this.coins}`, 13, 3, { align: 'left' });
    label(r, `${String(this.score).padStart(6, '0')}`, W / 2, 3);
    for (let i = 0; i < this.lives; i++) r.rect(W - 12 - i * 10, 4, 7, 7, '#ff5e5b');
    if (this.banner.alpha > 0) {
      r.alpha = this.banner.alpha;
      label(r, this.banner.text.toUpperCase(), W / 2, 60, { size: 12 });
      r.alpha = 1;
    }
    if (this.state === 'won') label(r, 'COURSE CLEAR!', W / 2, 60, { size: 16, color: '#ffd166' });
  }
}

export class PauseScene extends Scene {
  update(_dt, { input }) {
    if (input.justPressed([...PAUSE, ...START])) this.game.scenes.pop();
  }

  render(r) {
    r.rect(0, 0, W, H, 'rgba(10, 20, 40, 0.6)');
    label(r, 'PAUSED', W / 2, H / 2 - 14, { size: 16 });
    label(r, 'P to resume', W / 2, H / 2 + 8, { size: 8, color: '#c0d0ff' });
  }
}

class EndScene extends Scene {
  enter({ score = 0, coins = 0 } = {}) {
    this.score = score;
    this.coins = coins;
    this.ready = false;
    this.timer.after(0.8, () => (this.ready = true));
    this.add(new Backdrop());
  }

  update(dt, { input }) {
    this.camera.x += dt * 20;
    if (this.ready && input.justPressed(START)) this.game.scenes.switch('title');
  }

  renderEnd(r, title, color) {
    label(r, title, W / 2, 46, { size: 20, color });
    label(r, `SCORE ${this.score}`, W / 2, 86, { size: 10 });
    label(r, `COINS ${this.coins}`, W / 2, 102, { size: 10, color: '#ffd166' });
    if (this.ready) label(r, 'PRESS SPACE', W / 2, 136, { size: 8, color: '#1d3b5c' });
  }
}

export class GameOverScene extends EndScene {
  render(r) {
    this.renderEnd(r, 'GAME OVER', '#ff5e5b');
  }
}

export class WinScene extends EndScene {
  render(r) {
    this.renderEnd(r, 'YOU WIN!', '#ffd166');
  }
}
