# Contributing to gitmsg

Thanks for considering a contribution! gitmsg is a small, focused tool, and the most valuable contributions are usually:

1. **New fixtures** — real diffs that produce bad commit messages.
2. **Heuristic improvements** — better type/scope/subject detection. Start at [`docs/heuristics.md`](docs/heuristics.md).
3. **Language extractors** — symbol extraction for new languages. Start at [`docs/heuristics.md` § Language extractors](docs/heuristics.md#5-language-extractors) and [`docs/languages/`](docs/languages/).

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

## Adding a fixture

If `gitmsg` produced a wrong commit message on one of your diffs, the highest-leverage thing you can do is **add it as a fixture**. Five steps:

1. **Capture the diff.** From the repo where you saw the bad output, run:
   ```bash
   git diff --staged --no-color -U0 --find-renames > /tmp/my-fixture.diff
   ```
2. **Anonymise.** Strip paths, symbol names, credentials, and any other identifying content. Preserve the _shape_ (file count, scope-bearing prefixes, change kinds).
3. **Name it.** `tests/fixtures/<type>-<scope>-<noun>.diff`, e.g. `feat-billing-discount.diff`. The base name becomes the test name.
4. **Record the expected output.** Create an empty `<name>.expected.txt` and run `npm test -- fixtures` — your fixture will fail with a diff between empty and the _current_ output. Decide what the message _should_ be, then write that into the expected file. If the current output is correct, paste it in as-is.
5. **Commit.** A fixture-only PR doesn't need code review of `src/` — the reviewer reads the diff, reads the expected output, and asks "is this what we want?"

Trailing newlines in `.expected.txt` are trimmed before comparison; don't worry about them.

**If your fixture surfaces a bug**, the fix goes in a _separate_ PR. Fixture-as-regression-test first; behaviour change second. This makes the fix's PR show the message difference as a one-line `.expected.txt` change.

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
- [ ] If this PR changes a rule documented in [`docs/heuristics.md`](docs/heuristics.md) or [`docs/languages/`](docs/languages/), the doc was updated in the same PR

## Reporting security issues

Please **do not** open a public issue. See [SECURITY.md](SECURITY.md).

## Code of conduct

Participation in this project is governed by our [Code of Conduct](CODE_OF_CONDUCT.md).
