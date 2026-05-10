# Contributing to gitmsg

Thanks for considering a contribution! gitmsg is a small, focused tool, and the most valuable contributions are usually:

1. **New fixtures** — real diffs that produce bad commit messages.
2. **Heuristic improvements** — better type/scope/subject detection.
3. **Language extractors** — symbol extraction for new languages.

## Ground rules

- Keep dependencies minimal. New runtime deps need a strong justification.
- Every behaviour change ships with a test.
- Be kind. See [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md).

## Development setup

```bash
git clone https://github.com/razakadam74/gitmsg.git
cd gitmsg
npm install
npm test
```

Requires Node `>=20`.

Common scripts:

| Script                 | What it does                |
| ---------------------- | --------------------------- |
| `npm run build`        | Build with tsup             |
| `npm run dev`          | Build in watch mode         |
| `npm test`             | Run vitest                  |
| `npm run test:watch`   | Run vitest in watch mode    |
| `npm run lint`         | ESLint                      |
| `npm run typecheck`    | `tsc --noEmit`              |
| `npm run format`       | Prettier write              |
| `npm run format:check` | Prettier check (used in CI) |

## Pull request workflow

1. Fork, branch off `main`, push to your fork.
2. Open a PR against `razakadam74/gitmsg:main`.
3. CI runs lint, typecheck, tests, and build on Node 20/22/24 across Linux, macOS, and Windows. All checks must pass.
4. Maintainer reviews and squash-merges.

## Pull request checklist

- [ ] Tests added or updated (when code changes)
- [ ] `npm run format:check && npm run lint && npm run typecheck && npm test && npm run build` all pass locally
- [ ] No new runtime dependencies (or strong justification in PR description)
- [ ] Commit message follows [Conventional Commits](https://www.conventionalcommits.org/) — appropriate, since this is gitmsg

## Reporting security issues

Please **do not** open a public issue. See [SECURITY.md](SECURITY.md).

## Code of conduct

Participation in this project is governed by our [Code of Conduct](CODE_OF_CONDUCT.md).
