import { EndScene } from './EndScene.js';

export class WinScene extends EndScene {
  render(r) {
    this.renderEnd(r, 'YOU WIN!', '#ffd166');
  }
}
