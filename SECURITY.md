# Security policy

## Supported versions

h3-engine is pre-1.0. Only the latest release on `main` gets fixes; there are no backports to older versions.

## Reporting a vulnerability

Please don't open a public issue for security problems.

Report it privately through GitHub instead: go to the repository's **Security** tab, choose **Report a vulnerability**, and describe:

- what the problem is and what an attacker could do with it,
- the steps or code needed to reproduce it,
- the version or commit you tested.

You should get a reply within a week. Once the problem is confirmed, I'll work on a fix, credit you in the release notes unless you'd rather stay anonymous, and publish an advisory when the fix is out.

## Scope

h3-engine runs entirely in the browser and has no server component and no runtime dependencies. Things that count as vulnerabilities include:

- code in `src/` that executes or injects content it shouldn't (for example, unsafe handling of loaded asset data),
- a way for one page's game to read or affect state outside its own canvas and listeners,
- problems in the published package itself, such as unexpected files or install scripts.

Things that don't count:

- bugs in games built with the engine. Those belong to the game's author.
- the development tools (`scripts/serve.js` is a local dev server and isn't meant to be exposed to a network),
- issues in dev dependencies that don't reach the published bundle. Dependabot tracks those.
