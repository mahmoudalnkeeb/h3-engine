import { EndScene } from './EndScene.js';

export class GameOverScene extends EndScene {
  render(r) {
    this.renderEnd(r, 'GAME OVER', '#ff5e5b');
  }
}
