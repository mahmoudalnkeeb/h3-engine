import { Collision, Pool, Scene } from '../../../src/index.js';
import { fanfare, sfx } from '../audio.js';
import { JUMP, PAUSE, W } from '../config.js';
import { Backdrop } from '../entities/Backdrop.js';
import { Coin } from '../entities/Coin.js';
import { Flag } from '../entities/Flag.js';
import { Level } from '../entities/Level.js';
import { Particle } from '../entities/Particle.js';
import { Player } from '../entities/Player.js';
import { Slime } from '../entities/Slime.js';
import { LEVELS } from '../levels.js';
import { label } from '../ui.js';

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
      sfx(this.ctx.audio, 'coin');
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
        sfx(this.ctx.audio, 'stomp');
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
    sfx(this.ctx.audio, 'die');
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
    fanfare(this.timer, this.ctx.audio);
    this.timer.after(2.2, () => {
      const next = this.levelIndex + 1;
      const data = { level: next, lives: this.lives, score: this.score, coins: this.coins };
      if (next < LEVELS.length) this.game.scenes.switch('play', data);
      else this.game.scenes.switch('win', data);
    });
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
