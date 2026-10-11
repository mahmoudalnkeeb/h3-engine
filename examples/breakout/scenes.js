import { Collision, Pool, pick, Scene } from '../../src/index.js';
import { Ball, Brick, H, Paddle, Particle, POWERUPS, PowerUp, ROW_COLORS, TOP, W } from './entities.js';

const START = ['Space', 'Enter'];
const LAUNCH = ['Space', 'ArrowUp', 'KeyW'];
const PAUSE = ['KeyP', 'Escape'];
const FONT = 'system-ui, sans-serif';

const BEST_KEY = 'h3-breakout-best';
const loadBest = () => {
  try {
    return Number(localStorage.getItem(BEST_KEY)) || 0;
  } catch {
    return 0;
  }
};
const saveBest = (score) => {
  try {
    localStorage.setItem(BEST_KEY, String(score));
  } catch {
    // storage unavailable (private mode); best score just isn't kept
  }
};

/**
 * Brick layout for a level as rows of characters: '.' empty, '1'-'3' hit points.
 * Levels past the last one reuse the layouts with tougher bricks.
 */
const LAYOUTS = [
  ['1111111111', '1111111111', '1111111111', '1111111111', '1111111111'],
  ['2222222222', '2111111112', '2111111112', '2111111112', '2222222222', '1111111111'],
  ['....33....', '...2222...', '..111111..', '.22222222.', '1111111111', '.22222222.', '..111111..', '...2222...'],
  ['3.3.3.3.3.', '.2.2.2.2.2', '1111111111', '2.2.2.2.2.', '.1.1.1.1.1', '3333333333'],
];

export class TitleScene extends Scene {
  enter() {
    this.t = 0;
    this.best = loadBest();
  }

  update(dt, { input }) {
    this.t += dt;
    if (input.justPressed(START) || input.pointer.justPressed) this.game.scenes.switch('play');
  }

  render(r) {
    for (let row = 0; row < ROW_COLORS.length; row++) {
      const y = 40 + row * 22 + Math.sin(this.t * 2 + row * 0.6) * 4;
      for (let col = 0; col < 10; col++) r.rect(22 + col * 60, y, 56, 18, ROW_COLORS[row]);
    }
    r.text('BREAKOUT', W / 2, 250, { font: `bold 64px ${FONT}`, align: 'center' });
    r.text('made with h3-engine', W / 2, 322, { font: `14px ${FONT}`, color: '#8888aa', align: 'center' });
    if (Math.floor(this.t * 2) % 2 === 0) {
      r.text('Press Space or click to start', W / 2, 372, { font: `20px ${FONT}`, align: 'center' });
    }
    r.text('Move: mouse / touch / arrows   Launch: click / Space   Pause: P', W / 2, 430, {
      font: `13px ${FONT}`,
      color: '#8888aa',
      align: 'center',
    });
    if (this.best > 0)
      r.text(`Best ${this.best}`, W / 2, 452, { font: `13px ${FONT}`, color: '#ffd166', align: 'center' });
  }
}

export class PlayScene extends Scene {
  enter({ level = 1, score = 0, lives = 3 } = {}) {
    this.level = level;
    this.score = score;
    this.lives = lives;
    /** 'intro' while bricks fly in, then 'play', then 'clear' or 'over'. */
    this.state = 'intro';
    this.particles = new Pool(() => new Particle(), 80);
    this.wideTimer = null;
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
      this.sfx('armor');
      return;
    }
    brick.destroy();
    this.score += 10 * brick.maxHp;
    this.sfx('brick', brick.row);
    for (let i = 0; i < 10; i++) {
      this.add(this.particles.get().spawn(brick.cx, brick.cy, brick.color, this.particles));
    }
    if (Math.random() < 0.12) this.add(new PowerUp(brick.cx - 14, brick.cy, pick(Object.keys(POWERUPS))));
    if (this.count('brick') === 0) this.levelClear();
  }

  applyPowerUp(kind) {
    this.sfx('power');
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
    this.sfx('lose');
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
    [523, 659, 784, 1047].forEach((freq, i) => {
      this.timer.after(i * 0.12, () => this.ctx.audio.tone({ freq, duration: 0.15, type: 'triangle' }));
    });
    this.timer.after(1.6, () =>
      this.game.scenes.switch('play', { level: this.level + 1, score: this.score, lives: this.lives }),
    );
  }

  sfx(kind, row = 0) {
    const audio = this.ctx.audio;
    if (kind === 'wall') audio.tone({ freq: 300, duration: 0.04, volume: 0.1 });
    else if (kind === 'paddle') audio.tone({ freq: 220, duration: 0.06, volume: 0.15 });
    else if (kind === 'brick') audio.tone({ freq: 880 - row * 60, duration: 0.07, volume: 0.12 });
    else if (kind === 'armor') audio.tone({ freq: 160, duration: 0.05, type: 'sawtooth', volume: 0.1 });
    else if (kind === 'power') audio.tone({ freq: 440, to: 1320, duration: 0.2, type: 'triangle' });
    else if (kind === 'lose') audio.tone({ freq: 330, to: 60, duration: 0.5, type: 'sawtooth', volume: 0.15 });
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

export class PauseScene extends Scene {
  update(_dt, { input }) {
    if (input.justPressed([...PAUSE, 'Space']) || input.pointer.justPressed) this.game.scenes.pop();
  }

  render(r) {
    r.rect(0, 0, W, H, 'rgba(8, 8, 12, 0.7)');
    r.text('PAUSED', W / 2, H / 2 - 10, { font: `bold 48px ${FONT}`, align: 'center', baseline: 'middle' });
    r.text('Press P or click to resume', W / 2, H / 2 + 34, {
      font: `16px ${FONT}`,
      color: '#8888aa',
      align: 'center',
    });
  }
}

export class GameOverScene extends Scene {
  enter({ score = 0, level = 1 } = {}) {
    this.score = score;
    this.level = level;
    this.best = loadBest();
    this.newBest = score > this.best;
    if (this.newBest) saveBest(score);
    this.ready = false;
    this.timer.after(0.6, () => (this.ready = true)); // don't skip the screen with a stray click
  }

  update(_dt, { input }) {
    if (!this.ready) return;
    if (input.justPressed('Escape')) this.game.scenes.switch('title');
    else if (input.justPressed(START) || input.pointer.justPressed) this.game.scenes.switch('play');
  }

  render(r) {
    r.text('GAME OVER', W / 2, 150, { font: `bold 56px ${FONT}`, color: '#f25f5c', align: 'center' });
    r.text(`Score ${this.score}   ·   Level ${this.level}`, W / 2, 240, { font: `22px ${FONT}`, align: 'center' });
    const best = this.newBest ? 'New best!' : `Best ${this.best}`;
    r.text(best, W / 2, 276, { font: `18px ${FONT}`, color: '#ffd166', align: 'center' });
    if (this.ready) {
      r.text('Space or click to play again   ·   Esc for title', W / 2, 360, {
        font: `16px ${FONT}`,
        color: '#8888aa',
        align: 'center',
      });
    }
  }
}
