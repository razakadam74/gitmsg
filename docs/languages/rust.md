# Rust

Symbol extraction for `.rs` files.

Source: [`src/languages/rust.ts`](../../src/languages/rust.ts).

## Pattern ladder

Six regex patterns. First match per line wins. All patterns are anchored at `^`
(column 0, no leading whitespace) — see the anchor decision below.

| #   | Pattern shape     | Kind        |
| --- | ----------------- | ----------- |
| 1   | `… fn NAME(…)`    | `function`  |
| 2   | `… struct NAME`   | `class`     |
| 3   | `… enum NAME`     | `type`      |
| 4   | `… trait NAME`    | `interface` |
| 5   | `… type NAME …`   | `type`      |
| 6   | `… const NAME: …` | `const`     |

Every row starts with the same optional visibility prefix
`(?:pub(?:\([^)]*\))?\s+)?` — it eats `pub` or a restricted form like
`pub(crate)` / `pub(super)` / `pub(in path)` before the keyword. Visibility
itself is computed separately (see below); the prefix only exists so the keyword
and name still line up when a `pub` is present.

The `fn` row carries two extra eaters: `(?:(?:async|unsafe|const)\s+)*` for
function qualifiers and `(?:extern\s+"[^"]*"\s+)?` for `extern "C"`-style ABI
markers. The `trait` row eats an optional leading `unsafe` (auto traits like
`unsafe trait Send`).

Row 1 (`fn`) **must** precede row 6 (`const`): a `const fn` is a function, not a
const. Two things pin this — `fn` is listed first, and the `const` row requires a
trailing `:` (`const NAME:`), which a `const fn foo()` declaration never has. So
even if the order were swapped, `const fn` would still fall through to the `fn`
row.

Generic type parameters (`<T>`, `<T: Trait>`, `<const N: usize>`) are not
captured — the name capture stops at the bare identifier, and the angle-bracket
list is part of the declaration, not the name.

### The anchor (the first decision)

> 💡 **Decision:** All rows anchor at `^` (column 0), like Go — **not** `^\s*`
> like C#/Java. Rust methods live inside indented `impl` and `trait` blocks and
> are syntactically identical to free functions (`fn name(...)`). A column-0
> anchor is the only single-line way to tell a free function from a method: free
> items sit at column 0, members are indented. The cost is that items declared
> inside an inline `mod foo { … }` block (also indented) are missed — accepted,
> because file-based modules (`mod foo;` + `foo.rs`) are the norm.

### Visibility (the headline decision)

> 💡 **Decision:** Visibility comes from the **line prefix**:
> `exported = /^pub\s/.test(line)`. Only a bare `pub` followed by whitespace
> exports. `pub(crate)`, `pub(super)`, and `pub(in path)` all read as
> `exported: false` — after `pub` comes a `(`, not whitespace, so the test
> fails. Items with no `pub` are private and also read as `exported: false`.

This is the sixth visibility model in the codebase:

| Extractor | Source          | Computation                     |
| --------- | --------------- | ------------------------------- |
| TS        | regex row       | `export` literal in the pattern |
| Python    | name            | `!name.startsWith('_')`         |
| C#        | line prefix     | `/^\s*public\s/.test(line)`     |
| Go        | name            | `/^[A-Z]/.test(name)`           |
| Java      | line prefix     | `/^\s*public\s+/.test(line)`    |
| **Rust**  | **line prefix** | **`/^pub\s/.test(line)`**       |

Rust is a hybrid: it shares the **line-prefix** visibility model with C#/Java,
but the **column-0 anchor** with Go. The line prefix carries no `\s*` because the
column-0 anchor already forbids leading whitespace — restricted visibility
(`pub(crate)`) is excluded by the absence of a space after `pub`, not by the
anchor.

## Dedup key

Per-file extraction uses `${kind}:${name}:${exported}`. Same shape as every other
extractor — see the [heuristics overview](../heuristics.md#the-dedup-key-distinction)
for the cross-file vs per-file rationale.

## v1 blind spots

Documented limitations, accepted as tradeoffs against the "single-line regex, no
parser" design:

- **Methods.** `fn` declarations inside `impl`/`trait` blocks are indented, so the
  column-0 anchor skips them. A struct's inherent methods (`impl Foo { pub fn new() }`)
  are not extracted; only the `struct Foo` line is. Same philosophy as Java —
  naming the type is honest; over-claiming every method is not.
- **Inline-module items.** Items inside `mod foo { … }` are indented and therefore
  missed. File-based modules are unaffected (their items are at column 0).
- **`static` items.** `static MAX: u32 = …` is not extracted (no row). Globals are
  rarer than `const` in public APIs; add a row if a real codebase needs it.
- **`union` and `macro_rules!`.** Unions (FFI-only, rare) and declarative macros
  have no row.
- **`pub(crate) fn` parameter capture.** The shared callable helper scans the line
  for the first `(…)`. For `pub(crate) fn foo(a: i32)` that first paren is the
  visibility `(crate)`, so `params` becomes `"crate"` instead of `"a: i32"`. The
  symbol is non-exported anyway, so this only affects signature-change detection of
  crate-private functions — accepted. Plain `pub fn` and private `fn` capture params
  correctly.
- **Block comments masking declarations.** `/* pub fn foo() {` still matches the
  `fn` row; the regex doesn't track multi-line comment state.

These are the right places for a future tree-sitter upgrade to land. Until then,
the fix for "this exact codebase trips a blind spot" is a fixture.

## File extensions

Match regex: `/\.rs$/`. Covers:

- `.rs` — Rust source files

Deliberately **not** matched:

- `.rss` — RSS feeds (not Rust)
- `.rlib` — compiled Rust library (binary, not source)
- `Cargo.toml` / `Cargo.lock` — manifests, not source
