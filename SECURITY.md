# Security Policy

## Supported Versions

The latest minor release on npm is supported. Older versions receive fixes only for severe vulnerabilities.

## Reporting a Vulnerability

**Please do not open public GitHub issues for security problems.**

Use [GitHub's private vulnerability reporting](https://github.com/razakadam74/gitmsg/security/advisories/new) instead. We aim to:

- Acknowledge receipt within 72 hours
- Provide a remediation timeline within 7 days
- Credit reporters in release notes (unless anonymity is requested)

## Threat Model

`gitmsg` reads your staged git diff and writes a commit message. It runs as your user, has no network code paths, and does not modify files outside `.git/COMMIT_EDITMSG` (when `--commit` or `--edit` is used) or `.git/hooks/prepare-commit-msg` (when `--hook` is used).

In scope:

- Code execution via crafted diff content
- Path traversal via crafted file names in diffs
- Arbitrary command execution via shell metacharacters in spawned `git` calls
- Supply-chain integrity of published artifacts

Out of scope:

- Any vulnerability requiring an attacker who already has commit access to your repo
- The contents of generated commit messages (subjective quality is not a CVE)

## Verifying releases

Published packages on npm include [provenance attestations](https://docs.npmjs.com/generating-provenance-statements). You can verify with:

```bash
npm audit signatures
```
