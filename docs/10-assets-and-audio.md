# Assets and audio

## Loading files

Images, sounds and JSON files have to be downloaded before you can use them, and downloading takes time. The cleanest place to do it is the `preload` of the scene that needs them:

```js
class Level extends Scene {
  async preload(assets) {
    await assets.load({
      images: { hero: 'img/hero.png', tiles: 'img/tiles.png' },
      audio: { jump: 'sfx/jump.wav', music: 'sfx/theme.mp3' },
      json: { level1: 'data/level1.json' },
    });
  }

  enter() {
    const map = this.ctx.assets.json('level1');
  }
}
```

The engine waits for `preload` before calling `enter`, and draws a progress bar while it waits. Each file gets a key (`hero`, `jump`, `level1`), and that key is how you get it back:

```js
assets.image('hero')    // an HTMLImageElement, ready for r.image()
assets.sound('jump')    // an AudioBuffer, ready for audio.play()
assets.json('level1')   // the parsed JSON
```

Keys are cached. Loading the same key again later is instant, so it's fine for every level to list the files it needs, even if an earlier level already loaded them.

Asking for a key that was never loaded throws `Asset "hero" not loaded (images)`, rather than failing quietly with an invisible sprite. If a file is missing, `load` fails with the URL in the message. Check the browser's network tab for the 404.

Paths are relative to the HTML page, not to your JavaScript file. That trips up nearly everyone once.

If you want your own loading screen instead of the bar, pass a progress callback to `load` and draw it however you like. The callback receives a number from 0 to 1.

## The audio unlock rule

Browsers don't let a web page make noise until the user has interacted with it: a click, a tap or a key press. Before that, all audio is silently blocked.

The engine handles this. On the first pointer press or key press anywhere on the page, it unlocks audio. Your game's "Press Space to start" screen does the unlocking for free, which is one more reason most browser games have one.

The practical consequence: sounds you play before the first interaction just won't be heard. Don't try to play music on the very first frame.

## Playing sounds

```js
const handle = this.ctx.audio.play('jump');
this.ctx.audio.play('coin', { volume: 0.5, rate: 1.2 });   // quieter, higher pitched
const music = this.ctx.audio.play('music', { loop: true });

this.ctx.audio.stop(music);
```

`rate` changes speed and pitch together. Randomizing it slightly (`rate: rand(0.9, 1.1)`) stops repeated sounds, like footsteps or coin pickups, from sounding mechanical.

## Sounds without any files

`audio.tone()` generates a simple beep in code. Both example games get all of their sound from it, without a single audio file:

```js
audio.tone({ freq: 300, to: 600, duration: 0.1, volume: 0.1 });               // jump: pitch slides up
audio.tone({ freq: 988, to: 1319, duration: 0.08, volume: 0.1 });             // coin: short high blip
audio.tone({ freq: 440, to: 80, duration: 0.6, type: 'sawtooth', volume: 0.15 }); // death: long slide down
```

| Option | Meaning |
| --- | --- |
| `freq` | Starting pitch in Hz. 440 is the A above middle C. Higher numbers sound higher. |
| `to` | Optional end pitch. The tone slides from `freq` to `to`. |
| `duration` | Seconds. Most sound effects are under 0.2. |
| `type` | The waveform: `'square'` (buzzy, retro), `'triangle'` (soft), `'sawtooth'` (harsh), `'sine'` (pure). |
| `volume` | 0 to 1. Keep effects around 0.1 to 0.2; it adds up fast. |

Rising pitch reads as positive (jump, pickup, power-up). Falling pitch reads as negative (damage, death). A quick run of rising notes makes a decent victory jingle; see `fanfare` in `examples/breakout/audio.js`.

It's a great way to prototype. Swap in real sound files later if you want.

## Volume and mute

```js
audio.volume = 0.5;   // master volume for everything
audio.muted = true;   // mute everything, keeping the volume setting
```

A mute key is a nice touch: `if (input.justPressed('KeyM')) audio.muted = !audio.muted;`.
