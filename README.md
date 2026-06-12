# gitmsg

![gitmsg demo](docs/demo.gif)

> Fast, offline, deterministic Conventional Commit message generator. **No LLM. No API key. No network.**

[![npm](https://img.shields.io/npm/v/@razakadam74/gitmsg.svg)](https://www.npmjs.com/package/@razakadam74/gitmsg)
[![CI](https://github.com/razakadam74/gitmsg/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/razakadam74/gitmsg/actions/workflows/ci.yml)
[![npm provenance](https://img.shields.io/badge/npm%20provenance-verified-brightgreen)](https://www.npmjs.com/package/@razakadam74/gitmsg#provenance)
[![license](https://img.shields.io/npm/l/@razakadam74/gitmsg.svg)](LICENSE)
[![Node](https://img.shields.io/node/v/@razakadam74/gitmsg.svg)](https://nodejs.org/)

```bash
$ git add .
$ gitmsg
feat(auth): add login
```

## Install

```bash
npm i -g @razakadam74/gitmsg
```

The binary on your `PATH` is `gitmsg` — the scoped package name is only used at install time. The unscoped `gitmsg` name on npm is currently held by an inactive maintainer; this project publishes under a personal scope until that resolves.

## What it does

`gitmsg` reads your staged git diff and prints a [Conventional Commit](https://www.conventionalcommits.org/) message in milliseconds. It runs entirely offline, sends nothing anywhere, and produces the same output for the same diff every time.

## Usage

```bash
# Print the suggested message (default — pipe-friendly)
gitmsg

# Commit directly with the suggested message
gitmsg --commit

# Pre-fill your editor so you can tweak before committing
gitmsg --edit

# Structured output for tooling / scripts
gitmsg --json

# Install as a prepare-commit-msg hook (one-time, per-repo)
gitmsg --hook

# Cap subject length (default 72)
gitmsg --max 50
```

See `gitmsg --help` for the full flag list.

## Languages

Symbol-aware subject lines (e.g. `feat(auth): add rotateRefreshToken`) are supported for:

| Language                | Extensions                                   |
| ----------------------- | -------------------------------------------- |
| TypeScript / JavaScript | `.ts`, `.tsx`, `.js`, `.jsx`, `.mjs`, `.cjs` |
| Python                  | `.py`, `.pyi`                                |
| C#                      | `.cs`, `.csx`                                |
| Go                      | `.go`                                        |
| Java                    | `.java`                                      |
| Rust                    | `.rs`                                        |

Files in other languages still get a sensible commit message — the subject just falls back to a generic verb (e.g. `docs: update README`, `feat(parser): refactor module`) instead of naming specific symbols. Adding a language is a small, well-scoped contribution; see the recipe in [`docs/heuristics.md`](docs/heuristics.md#adding-a-new-language).

## Why

There are roughly three options for commit messages today:

1. Write lazy ones (`fix stuff`, `wip`, `update`).
2. Use AI-powered tools — they cost money, need API keys, send your code to third parties, and are slow.
3. Hand-craft Conventional Commits and get tired of it.

`gitmsg` is the boring middle ground: fast, deterministic, free, and private. Good enough 90% of the time — and the other 10%, just edit it.

## FAQ

**Why not just use an AI?**
Three reasons in one: cost (every call charges you), privacy (your staged diff leaves your machine), and latency (round-trips are slow). For the 90% of commits that are mechanical — a renamed function, a new file, a dependency bump — a deterministic rule-based tool is faster and cheaper. For the 10% that genuinely need prose, you should be writing them yourself anyway.

**Does this send my code anywhere?**
No. `gitmsg` makes zero network calls. It reads `git diff --staged`, runs regex on the result, and prints a string. There is no telemetry, no opt-in cloud feature, no LLM endpoint. Verify with [`npm audit signatures`](https://docs.npmjs.com/cli/v10/commands/npm-audit#signatures) — every release is published with [npm provenance](https://docs.npmjs.com/generating-provenance-statements) so you can confirm the published artifact matches the source on GitHub.

**Can I use it offline?**
Yes. After `npm i -g @razakadam74/gitmsg` once with network access, the tool works completely offline. No daemon, no background sync, no first-run dial-home.

**What does "deterministic" mean here?**
The same staged diff always produces the same commit message. No randomness, no model temperature, no provider-side drift. If you run it twice and get different output, that's a bug — please file an issue with the diff attached.

**How does it pick the type / scope / subject?**
See [`docs/heuristics.md`](docs/heuristics.md) for the full ruleset. Short version: type comes from file paths (`docs/` → `docs`, `.github/workflows/` → `ci`, etc.), scope comes from the common path prefix (`src/auth/jwt.ts` → `auth`), and subject comes from the symbols you added or removed (resolved via a regex-based extractor per language).

**What if it's wrong?**
Edit the message — `gitmsg --edit` opens your editor pre-filled. If a particular diff consistently produces a bad message, please open a [bad-message issue](https://github.com/razakadam74/gitmsg/issues/new?template=bad-message.yml) with the diff and the expected output; we add it to the fixture suite.

## Status

🚧 Early development. Published as [`@razakadam74/gitmsg`](https://www.npmjs.com/package/@razakadam74/gitmsg) with TypeScript/JavaScript, Python, C#, Go, Java, and Rust extractors. APIs and behaviour may still change before v1.0.

## Contributing

Contributions and ideas are welcome. Start with [`CONTRIBUTING.md`](CONTRIBUTING.md) for the workflow and [`docs/heuristics.md`](docs/heuristics.md) for the rules behind the tool. Good first issues: adding a new language extractor (see the recipe), adding a fixture for a diff shape that confuses the current heuristics, or improving an FAQ answer.

## License

[MIT](LICENSE) © razakadam74
