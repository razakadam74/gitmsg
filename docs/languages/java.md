# Java

Symbol extraction for `.java` files.

Source: [`src/languages/java.ts`](../../src/languages/java.ts).

## Pattern ladder

Five regex patterns. First match per line wins. All patterns are `^\s*` anchored — Java declarations can be top-level or nested inside another class (inner classes), so leading whitespace is allowed.

| #   | Pattern shape         | Kind        |
| --- | --------------------- | ----------- |
| 1   | `… @interface NAME …` | `interface` |
| 2   | `… interface NAME …`  | `interface` |
| 3   | `… enum NAME …`       | `type`      |
| 4   | `… record NAME(…) …`  | `class`     |
| 5   | `… class NAME …`      | `class`     |

Row 1 **must** precede row 2: the bare `interface` row would otherwise miss annotation-type declarations (`public @interface Audited`). The leading `@` keeps `\w+` from accidentally consuming `@interface` in row 2, so the precedence is defensive rather than strictly required — but pinning it via order is cheaper than another negative lookahead.

Modifiers are eaten by `(?:[\w-]+\s+)*?` before the keyword. The hyphen in the character class lets `non-sealed` through (it's the only hyphenated Java modifier). All other modifiers — `public`, `private`, `protected`, `static`, `final`, `abstract`, `sealed`, `default`, `strictfp` — are pure `\w+`.

Generic type parameters (`<T>`, `<T extends Comparable<T>>`) are not captured because the pattern stops at the bare name; the angle-bracket list is part of the declaration, not the name.

### Visibility (the headline decision)

> 💡 **Decision:** Visibility comes from the **line prefix**: `exported = /^\s*public\s+/.test(line)`. Same model as C#. Java's package-private (no modifier), `private`, and `protected` all read as `exported: false`; only the explicit `public` keyword exports.

This is the fifth visibility model in the codebase:

| Extractor | Source          | Computation                      |
| --------- | --------------- | -------------------------------- |
| TS        | regex row       | `export` literal in the pattern  |
| Python    | name            | `!name.startsWith('_')`          |
| C#        | line prefix     | `/^\s*public\s/.test(line)`      |
| Go        | name            | `/^[A-Z]/.test(name)`            |
| **Java**  | **line prefix** | **`/^\s*public\s+/.test(line)`** |

Java and C# share the same model because they share the same syntactic shape: a leading access modifier on the declaration line. The two could collapse into a single line-prefix helper later, but the modifier-eater regex differs slightly (`non-sealed` etc.), so for now they live in parallel.

## Dedup key

Per-file extraction uses `${kind}:${name}:${exported}`. Same shape as every other extractor — see the [heuristics overview](../heuristics.md#the-dedup-key-distinction) for the cross-file vs per-file rationale.

## v1 blind spots

Documented limitations, accepted as tradeoffs against the "single-line regex, no parser" design:

- **Methods, fields, constructors.** `public int process(Order o)` and `public String name;` are **not** extracted. Java has no top-level functions — every callable is a class member — so there's nothing for the `function`/`method` kinds to point at. The honest fallback (`update OrderHandler.java`) is better than over-claiming a method-level subject.
- **Multi-line type parameter lists.** `class Foo<\n  T extends Comparable<T>,\n  U\n> {` is not matched — the regex needs the entire signature on the declaring line. Tree-sitter territory.
- **Block comments masking declarations.** `/* public class Foo {` will still match the `class` row because the regex doesn't track multi-line comment state. Real codebases rarely declare types inside block comments; accepted false positive.
- **Multiple top-level types.** A `.java` file can legally contain multiple top-level types as long as only one is `public` (the file-name rule). Both will be extracted; the visibility flag distinguishes them.

These are the right places for a future tree-sitter upgrade to land. Until then, the fix for "this exact codebase trips a blind spot" is a fixture.

## File extensions

Match regex: `/\.java$/`. Covers:

- `.java` — Java source files

Deliberately **not** matched:

- `.kt` — Kotlin (different language, different keywords like `fun`, `object`, `data class`)
- `.scala` — Scala (different grammar entirely)
- `.class` — compiled bytecode (binary, not source)
- `.jav` — not a real Java extension
- `.jsp` — JSP templates (HTML + scriptlets, not Java source)
