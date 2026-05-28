---
'@razakadam74/gitmsg': patch
---

Add frequency-based scope fallback for multi-root diffs (closes #46).

When a diff has a clear cluster of files sharing a first path segment (e.g. 3 of 4 files under `src/auth/`) but one or two stragglers (e.g. a root-level `README.md`) prevent the strict-share rule from firing, scope detection now picks the dominant segment as long as it covers at least 50% of the files and at least 2 files. Noise segments (`tests/`, `docs/`, `.github`, monorepo roots) can never win the fallback but still count toward the denominator, keeping the rule conservative under uncertainty.
