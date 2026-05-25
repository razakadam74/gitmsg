# Python

Symbol extraction for `.py` and `.pyi` files.

Source: [`src/languages/py.ts`](../../src/languages/py.ts).

## Pattern ladder

Four regex patterns. First match per line wins. All patterns anchor to the start of the line with `^` — leading whitespace is **not** tolerated, so only top-level (column-0) declarations are extracted.

| #   | Pattern shape                          | Kind       |
| --- | -------------------------------------- | ---------- |
| 1   | `async def NAME`                       | `function` |
| 2   | `def NAME`                             | `function` |
| 3   | `class NAME` (with or without bases)   | `class`    |
| 4   | `NAME = …` where `NAME` is UPPER_SNAKE | `const`    |

> 💡 **Decision:** Python has no `export` keyword. Visibility is computed from the **name**, not the line context: `exported = !name.startsWith('_')`. This honours [PEP 8's leading-underscore convention](https://peps.python.org/pep-0008/#descriptive-naming-styles) (`_private`, `__dunder__` → not exported). Module-level public symbols (`def foo`, `class Widget`, `MAX_RETRIES`) → exported.

## Dedup key

Per-file extraction uses `${kind}:${name}:${exported}`. Same shape as the TypeScript extractor — see the [heuristics overview](../heuristics.md#the-dedup-key-distinction) for the cross-file vs per-file rationale.

## v1 blind spots

Documented limitations, accepted as tradeoffs against the "single-line regex, no parser" design:

- **Class methods.** An indented `def foo(self):` inside a class is **not** extracted. The `^def` anchor (no `\s*` prefix) is the mechanism. A diff that adds methods to an existing class falls through to a path-led subject (`update auth.py`) — bland but never wrong.
- **Lowercase module-level bindings.** `cache = {}`, `logger = logging.getLogger(...)`, `_internal = ...` are **not** extracted. Only UPPER_SNAKE_CASE assignments are treated as constants. Lowercase bindings are typically configuration or lazy state, not newsworthy declarations.
- **Single-letter constants.** `N = 10`, `K = 3` are **not** extracted (the regex requires at least two characters: `[A-Z][A-Z0-9_]+`). Single-letter module-level names are almost always loop bounds or throwaway state.
- **Decorators are not symbols.** `@dataclass` and `@pytest.fixture` lines themselves don't match any pattern. The decorated `def`/`class` line that follows is what gets extracted. `feat: add Point` (the dataclass) is the newsworthy headline, not `feat: add dataclass` (a stdlib import).
- **PEP 695 type aliases.** `type Vec = list[float]` is **not** extracted. Could be added later if Python codebases adopt it widely.
- **Multi-line signatures.** A `def foo(` that spans multiple lines (one parameter per line) is extracted by its first line — `def foo` captures the name even if `(` continues on later lines. A name that wraps across lines (rare) is missed.
- **`__all__` declarations.** We don't read `__all__` to refine exported-ness. The underscore convention is the proxy.

These are the right places for a future tree-sitter upgrade to land. Until then, the fix for "this exact codebase trips a blind spot" is a fixture.

## File extensions

Match regex: `/\.pyi?$/`. Covers:

- `.py` — regular Python source
- `.pyi` — [PEP 561 type stub files](https://peps.python.org/pep-0561/) (declaration-only — same syntax for `def` / `class` / UPPER_SNAKE)

Deliberately **not** matched:

- `.pyc` — compiled bytecode (binary, never appears in a text diff)
- `.pyd` — Windows compiled extension (binary)
- `.pyx` — [Cython](https://cython.org/) source (different grammar; out of scope)
