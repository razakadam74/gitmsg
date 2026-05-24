# gitmsg

> Fast, offline, deterministic Conventional Commit message generator. **No LLM. No API key. No network.**

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

## Why

There are roughly three options for commit messages today:

1. Write lazy ones (`fix stuff`, `wip`, `update`).
2. Use AI-powered tools — they cost money, need API keys, send your code to third parties, and are slow.
3. Hand-craft Conventional Commits and get tired of it.

`gitmsg` is the boring middle ground: fast, deterministic, free, and private. Good enough 90% of the time — and the other 10%, just edit it.

## Status

🚧 Early development. v0.1.0 is published as [`@razakadam74/gitmsg`](https://www.npmjs.com/package/@razakadam74/gitmsg). APIs and behaviour may still change before v1.0.

## Contributing

Contributions and ideas are welcome once the v0.1 baseline is in place. For now, feel free to open an issue with feedback or a feature request.

## License

[MIT](LICENSE) © razakadam74
