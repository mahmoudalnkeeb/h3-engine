# Contributing

Thanks for wanting to help. Bug reports, fixes, docs improvements and new examples are all welcome. For larger changes, such as a new module or an API change, please open an issue first so we can agree on the approach before you spend time on it.

## Setup

You need Node.js 20.11 or newer.

```bash
git clone https://github.com/mahmoudalnkeeb/h3-engine.git
cd h3-engine
npm install
npm run dev     # examples at http://localhost:5173/examples/
```

## Before you open a pull request

Run all four checks. CI runs the same ones.

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

`npm run format` fixes most lint complaints automatically. To run a single test file, use `npx vitest run test/Scene.test.js`; to run tests by name, use `npx vitest run -t "defers adds"`.

## Rules for code in `src/`

The engine aims to be small enough to read in an afternoon, and most of these rules exist to keep it that way.

- **No runtime dependencies.** The full bundle must stay under 20 KB minified and gzipped; `npm run build` fails if it doesn't.
- **ES modules, named exports only.** One class per file, named after the class. Export anything public from `src/index.js`.
- **JSDoc on public API, no other comments.** Document types, units, side effects and thrown errors that the signature doesn't show. Skip descriptions that just restate the name. Private `_` members and function bodies get no comments; if a line needs explaining, give it a better name or pull out a named constant or helper. Longer explanations go in the guide in `docs/`.
- **Units:** seconds for time (never milliseconds), pixels for distance, radians for angles. `y` points down.
- **No per-frame allocations in hot paths.** The loop, rendering and collision code reuse objects instead of creating new ones each frame.
- **No globals**, and nothing that touches `window` or `document` when a module is imported. Tests run in Node without a DOM.

If you change public behavior, update the JSDoc and the matching guide page in `docs/` in the same pull request. If you change `examples/dodge`, keep `docs/01-your-first-game.md` in sync.

## Tests

Unit tests cover the logic: math, collision, loop timing, scene add/remove queues, input state, timers and tweens. Rendering is checked by running the examples, not by pixel snapshots.

Every bug fix comes with a test that fails without the fix. `test/helpers.js` has `fakeGame()` and `step()` for running scenes without a browser.

## Commits and pull requests

Commit messages follow [Conventional Commits](https://www.conventionalcommits.org/): `feat:`, `fix:`, `docs:`, `refactor:`, `test:`, `chore:`. Keep pull requests focused on one change, and fill in the template. Note anything user-visible in `CHANGELOG.md` under "Unreleased".

By contributing, you agree that your contributions are licensed under the [MIT License](LICENSE). Please follow the [code of conduct](CODE_OF_CONDUCT.md).
