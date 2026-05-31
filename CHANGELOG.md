# @razakadam74/gitmsg

## 0.4.1

### Patch Changes

- 7dbbdc5: Infer scope from signal files when noise (tests, docs, changesets) outnumbers the real cluster. Adds a fourth rung to `detectScope`: after dropping noise files entirely, if two or more signal-bearing files survive and all share the same first path segment, that segment becomes the scope. Closes #54.

## 0.4.0

### Minor Changes

- 8772643: Add Go language extractor for symbol-aware subject lines on `.go` files. Recognises top-level `func`, `type … struct`, `type … interface`, type aliases/named types, and `const` declarations, including Go 1.18+ generic type parameters. Visibility is sourced from the leading-capital convention (`Foo` exported, `foo` package-private), matching the language spec.

## 0.3.1

### Patch Changes

- 06cf372: Add frequency-based scope fallback for multi-root diffs (closes #46).

  When a diff has a clear cluster of files sharing a first path segment (e.g. 3 of 4 files under `src/auth/`) but one or two stragglers (e.g. a root-level `README.md`) prevent the strict-share rule from firing, scope detection now picks the dominant segment as long as it covers at least 50% of the files and at least 2 files. Noise segments (`tests/`, `docs/`, `.github`, monorepo roots) can never win the fallback but still count toward the denominator, keeping the rule conservative under uncertainty.

## 0.3.0

### Minor Changes

- d962393: Add C# language extractor for symbol-aware subject lines on `.cs` and `.csx` files. Recognises `class`, `interface`, `struct`, `record` (incl. `record class` / `record struct`), `enum`, and `delegate` declarations — including generic delegates and generic return types. Visibility is inferred from the `public` line prefix. Methods, properties, fields, and Razor/`.csproj` files are deliberately out of scope; see [`docs/languages/cs.md`](https://github.com/razakadam74/gitmsg/blob/main/docs/languages/cs.md) for the full pattern ladder and blind spots.

## 0.2.0

### Minor Changes

- 495c9cc: Add Python language extractor for symbol-aware subject lines on .py and .pyi files

## 0.1.0

### Minor Changes

- e15dbad: Initial public release.
