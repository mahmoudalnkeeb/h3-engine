import { Collision, Pool, pick, Scene } from '../../../src/index.js';
import { fanfare, sfx } from '../audio.js';
import { FONT, H, LAUNCH, PAUSE, TOP, W } from '../config.js';
import { Ball } from '../entities/Ball.js';
import { Brick } from '../entities/Brick.js';
import { Paddle } from '../entities/Paddle.js';
import { Particle } from '../entities/Particle.js';
import { POWERUPS, PowerUp } from '../entities/PowerUp.js';
import { LAYOUTS } from '../levels.js';

export class PlayScene extends Scene {
  enter({ level = 1, score = 0, lives = 3 } = {}) {
    this.level = level;
    this.score = score;
    this.lives = lives;
    /** 'intro' while bricks fly in, then 'play', then 'clear' or 'over'. */
    this.state = 'intro';
    this.particles = new Pool(() => new Particle(), 80);
    this.wideTimer = null;
    this.offHidden = this.game.on('hidden', () => {
      if (this.game.scenes.current === this) this.game.scenes.push('pause');
    });
    this.paddle = this.add(new Paddle());
    this.buildLevel();
    this.serve();
    this.timer.after(0.9, () => {
      if (this.state === 'intro') this.state = 'play';
    });
  }

  get ballSpeed() {
    return Math.min(300 + (this.level - 1) * 30, 480);
  }

  buildLevel() {
    const layout = LAYOUTS[(this.level - 1) % LAYOUTS.length];
    const bonusHp = Math.floor((this.level - 1) / LAYOUTS.length);
    layout.forEach((line, row) => {
      for (let col = 0; col < line.length; col++) {
        if (line[col] === '.') continue;
        const y = 64 + row * 22;
        const brick = this.add(new Brick(22 + col * 60, y - 260, row, Math.min(Number(line[col]) + bonusHp, 4)));
        brick.alpha = 0;
        const delay = (row * 10 + col) * 0.008;
        this.tween(brick.pos, { y }, 0.6, 'backOut', { delay });
        this.tween(brick, { alpha: 1 }, 0.25, 'linear', { delay });
      }
    });
  }

  exit() {
    this.offHidden();
  }

  serve() {
    this.add(new Ball(this.ballSpeed));
  }

  update(_dt, { input }) {
    if (input.justPressed(PAUSE)) this.game.scenes.push('pause');
    if (this.state === 'play' && (input.justPressed(LAUNCH) || input.pointer.justPressed)) {
      for (const ball of this.find('ball')) if (ball.stuck) ball.launch();
    }
    Collision.check(this, 'powerup', 'paddle', (p) => {
      p.destroy();
      this.applyPowerUp(p.kind);
    });
  }

  brickHit(brick) {
    if (!brick.hit()) {
      sfx(this.ctx.audio, 'armor');
      return;
    }
    brick.destroy();
    this.score += 10 * brick.maxHp;
    sfx(this.ctx.audio, 'brick', brick.row);
    for (let i = 0; i < 10; i++) {
      this.add(this.particles.get().spawn(brick.cx, brick.cy, brick.color, this.particles));
    }
    if (Math.random() < 0.12) this.add(new PowerUp(brick.cx - 14, brick.cy, pick(Object.keys(POWERUPS))));
    if (this.count('brick') === 0) this.levelClear();
  }

  applyPowerUp(kind) {
    sfx(this.ctx.audio, 'power');
    this.score += 50;
    if (kind === 'wide') {
      if (this.wideTimer) this.wideTimer.cancel();
      else this.paddle.resize(this.paddle.baseW * 1.6);
      this.wideTimer = this.timer.after(10, () => {
        this.wideTimer = null;
        this.paddle.resize(this.paddle.baseW);
      });
    } else if (kind === 'multi') {
      const balls = this.find('ball').filter((b) => !b.stuck);
      for (const ball of balls) {
        for (const turn of [-0.4, 0.4]) {
          if (this.count('ball') >= 8) return;
          const copy = this.add(new Ball(ball.speed));
          copy.pos.copy(ball.pos);
          copy.launch(ball.vel.angle() + turn);
        }
      }
    }
  }

  ballLost() {
    if (this.state !== 'play' || this.count('ball') > 0) return;
    this.lives--;
    sfx(this.ctx.audio, 'lose');
    this.camera.shake(8, 0.4);
    for (const p of this.find('powerup')) p.destroy();
    if (this.wideTimer) {
      this.wideTimer.cancel();
      this.wideTimer = null;
      this.paddle.resize(this.paddle.baseW);
    }
    if (this.lives <= 0) {
      this.state = 'over';
      this.timer.after(1, () => this.game.scenes.switch('gameover', { score: this.score, level: this.level }));
    } else {
      this.timer.after(0.6, () => this.serve());
    }
  }

  levelClear() {
    this.state = 'clear';
    for (const ball of this.find('ball')) ball.active = false;
    fanfare(this.timer, this.ctx.audio);
    this.timer.after(1.6, () =>
      this.game.scenes.switch('play', { level: this.level + 1, score: this.score, lives: this.lives }),
    );
  }

  render(r) {
    r.rect(0, 0, W, TOP, '#1b1b2f');
    r.rect(0, TOP - 2, W, 2, '#33335a');
    const font = `bold 16px ${FONT}`;
    r.text(`SCORE ${this.score}`, 12, 8, { font });
    r.text(`LEVEL ${this.level}`, W / 2, 8, { font, align: 'center' });
    for (let i = 0; i < this.lives; i++) r.rect(W - 34 - i * 30, 12, 24, 7, '#c9c9ff');

    if (this.state === 'play' && this.find('ball').some((b) => b.stuck)) {
      r.text('Click or press Space to launch', W / 2, H - 80, {
        font: `16px ${FONT}`,
        color: '#8888aa',
        align: 'center',
      });
    } else if (this.state === 'clear') {
      r.text('LEVEL CLEAR', W / 2, H / 2, { font: `bold 40px ${FONT}`, align: 'center', baseline: 'middle' });
    } else if (this.state === 'over') {
      r.text('GAME OVER', W / 2, H / 2, {
        font: `bold 40px ${FONT}`,
        color: '#f25f5c',
        align: 'center',
        baseline: 'middle',
      });
    }
  }
}
