# Go

Symbol extraction for `.go` files.

Source: [`src/languages/go.ts`](../../src/languages/go.ts).

## Pattern ladder

Five regex patterns. First match per line wins. All patterns are **column-0 anchored** (`^`, no leading whitespace) — Go has no analog to C#'s `namespace { }` block, so top-level-only is the right policy. The anchor also rejects method receivers (`func (r *Repo) Get()`) without needing an explicit negative lookahead, because `\w+` immediately after `func ` doesn't match a `(`.

| #   | Pattern shape               | Kind        |
| --- | --------------------------- | ----------- |
| 1   | `func NAME(…)`              | `function`  |
| 2   | `type NAME struct …`        | `class`     |
| 3   | `type NAME interface …`     | `interface` |
| 4   | `type NAME …` (alias/other) | `type`      |
| 5   | `const NAME …`              | `const`     |

Rows 2 and 3 **must** precede row 4: the generic `type` row would otherwise swallow every struct and interface declaration and emit them with `kind: 'type'`. Two precedence-discipline tests in `tests/languages-go.test.ts` pin the ordering so a future "simplification" can't silently regress this.

Every row that captures a name includes an optional `(?:\[[^\]]*\])?` between the name and the next anchor. That tolerates Go 1.18+ generic type parameters — `func Map[T, U any](…)` and `type Repository[T any] struct` both extract their bare names (`Map`, `Repository`). The type-parameter list is part of the declaration, not part of the name, so it's deliberately not captured.

### Visibility (the headline decision)

> 💡 **Decision:** Visibility comes from the **name**: `exported = /^[A-Z]/.test(name)`. Go's capitalization convention isn't style guidance — it's language spec: the compiler treats capitalized identifiers as exported and lowercase as package-private. Reading visibility from the captured name is the same place the compiler reads it from.

This is the fourth visibility model in the codebase:

| Extractor | Source      | Computation                     |
| --------- | ----------- | ------------------------------- |
| TS        | regex row   | `export` literal in the pattern |
| Python    | name        | `!name.startsWith('_')`         |
| C#        | line prefix | `/^\s*public\s/.test(line)`     |
| **Go**    | **name**    | **`/^[A-Z]/.test(name)`**       |

Python and Go both source visibility from the captured name, with opposite signals (leading underscore vs leading capital). The `LanguageExtractor` interface only requires the bool be meaningful within the language's rules — see the [heuristics overview](../heuristics.md#5-language-extractors) for why that generality matters.

## Dedup key

Per-file extraction uses `${kind}:${name}:${exported}`. Same shape as every other extractor — see the [heuristics overview](../heuristics.md#the-dedup-key-distinction) for the cross-file vs per-file rationale.

## v1 blind spots

Documented limitations, accepted as tradeoffs against the "single-line regex, no parser" design:

- **Methods.** A `func (r *Repo) Get() error` is **not** extracted — the function row's `^func\s+(\w+)\s*\(` anchor requires a word character immediately after `func `, but a receiver declaration starts with `(`. A diff that adds methods to an existing receiver type falls through to a path-led subject (`update repo.go`). Bland, never wrong.
- **`var` declarations.** Package-level `var Logger = log.New()` is **not** extracted. Variables are noisier than `const` in Go (lazy singletons, mutable state, configured globals, test helpers). Following Python's UPPER_SNAKE-only constant precedent, we keep the noise floor low by skipping `var` entirely. The honest fallback (`update logger.go`) is better than an over-claiming `add Logger` subject.
- **Block declarations.** `type ( A int; B string )` and `const ( A = 1; B = 2 )` span multiple lines after a bare `type (` or `const (` opener. The single-line regex sees `type (` / `const (` and matches nothing useful. Multi-statement blocks are tree-sitter territory.
- **`init()` edge case.** `func init()` (Go's special package-init function) is captured as an unexported function. A subject line "add init" would be misleading, but `init` rarely lands solo in a diff — it usually accompanies the type or function that needs initialization, and first-declaration order means the headline goes to whichever symbol appears first in the file. Accepted edge case.
- **Multi-line type parameter lists.** `type Foo[\n  T any,\n  U comparable,\n] struct` is not matched — the regex needs the `[…]` group on the declaring line.

These are the right places for a future tree-sitter upgrade to land. Until then, the fix for "this exact codebase trips a blind spot" is a fixture.

## File extensions

Match regex: `/\.go$/`. Covers:

- `.go` — Go source files (including `_test.go`, which the test-type detector also matches at a different layer; the extractor and the type detector are independent and both correctly fire)

Deliberately **not** matched:

- `.gohtml` / `.tmpl` — Go template files (text/template grammar, not Go source)
- `go.mod` / `go.sum` — module manifests (caught by `DEPS_PATTERN` at the type-detection layer; no symbols to extract)
