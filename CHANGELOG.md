# @razakadam74/gitmsg

## 0.8.0

### Minor Changes

- 0e2c696: Add Rust language extractor for symbol-aware subject lines on `.rs` files. Recognises top-level `fn`, `struct`, `enum`, `trait`, `type` aliases, and `const` declarations — including generics, `async`/`unsafe`/`const`/`extern "C"` function qualifiers, and `unsafe` auto traits. Visibility comes from the `pub` line prefix, so `pub(crate)`/`pub(super)` read as non-exported. Methods (indented inside `impl`/`trait` blocks), inline-module items, `static`, `union`, and `macro_rules!` are out of scope; see [`docs/languages/rust.md`](https://github.com/razakadam74/gitmsg/blob/main/docs/languages/rust.md) for the full pattern ladder and blind spots.

## 0.7.0

### Minor Changes

- e214e47: Add Java language extractor for symbol-aware subject lines on `.java` files. Recognises `class`, `interface` (incl. `@interface` annotation types), `enum`, and `record` declarations — including bounded generics (`<T extends Comparable<T>>`), `sealed`/`non-sealed`/`final`/`abstract` modifiers, package-private visibility, and inner classes. Visibility is inferred from the `public` line prefix (same model as C#). Methods, fields, constructors, and `.kt`/`.scala`/`.class`/`.jsp` files are deliberately out of scope; see [`docs/languages/java.md`](https://github.com/razakadam74/gitmsg/blob/main/docs/languages/java.md) for the full pattern ladder and blind spots.

## 0.6.0

### Minor Changes

- bb95e00: Detect signature changes of exported functions as breaking changes. Closes #61

## 0.5.1

### Patch Changes

- e8c7ae5: Filter neutral config files (`.gitignore`, `.editorconfig`, `.prettierrc*`, etc.) before type classification so a single `.gitignore` tweak doesn't drag a docs- or src-only commit into the `feat: refactor module` fallback. If the entire diff is neutrals, the type is `chore`. Closes #64.

## 0.5.0

### Minor Changes

- 902338d: Detect breaking changes when a public export is removed or renamed. Adds the `!` mark to the header and a `BREAKING CHANGE:` footer. Closes #49 (rules 1 and 4 — removed export, renamed export). Removed CLI flag detection (rule 2) and signature-change detection (rule 3) are deferred to follow-up issues.

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
