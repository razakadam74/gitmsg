# C#

Symbol extraction for `.cs` and `.csx` files.

Source: [`src/languages/cs.ts`](../../src/languages/cs.ts).

## Pattern ladder

Six regex patterns. First match per line wins. All patterns allow leading whitespace (`^\s*`) so declarations nested inside a `namespace { }` block are extracted alongside top-level ones.

| #   | Pattern shape                                                | Kind        |
| --- | ------------------------------------------------------------ | ----------- |
| 1   | `… delegate RETURN NAME(…)` (incl. generic name & return)    | `type`      |
| 2   | `… interface NAME`                                           | `interface` |
| 3   | `… enum NAME`                                                | `type`      |
| 4   | `… record NAME` / `record class NAME` / `record struct NAME` | `class`     |
| 5   | `… struct NAME`                                              | `class`     |
| 6   | `… class NAME`                                               | `class`     |

The `(?:\w+\s+)*?` prefix on every row non-greedily absorbs any sequence of modifier-like tokens — `public`, `internal`, `static`, `sealed`, `partial`, `abstract`, `readonly`, in any order. No allow-list; if it looks like an identifier followed by whitespace before the keyword, it's tolerated.

> 💡 **Decision:** C# has no `export` keyword. Visibility is computed from the **line prefix**: `exported = /^\s*public\s/.test(line)`. This is the third visibility model in the codebase — TypeScript reads it from the regex row (`export` literal in the pattern), Python reads it from the name (leading underscore), C# reads it from the line. The `LanguageExtractor` interface intentionally leaves "where does `exported` come from?" to the language.

### The delegate row

The delegate pattern is the only one that has to skip over a return type — every other declaration puts the name immediately after the keyword. The shape:

```
^\s*(?:\w+\s+)*?delegate\s+.+?(\w+)(?:\s*<[^>]*>)?\s*\(
```

`.+?` non-greedily consumes the return type (which may itself contain `<`, `>`, `,`, spaces, `.`). The anchor is the parameter `(`. The `(?:\s*<[^>]*>)?` allows the captured name to be followed by generic type parameters (`Mapper<T, U>`). Examples that match:

- `public delegate int Handler(string s);` → `Handler`
- `public delegate Task<List<Foo>> AsyncProcessor(int id);` → `AsyncProcessor`
- `public delegate T Mapper<T, U>(U input);` → `Mapper`

The earlier design ("non-greedy `[^(]+?` stops at the first `(`") looked correct on paper but mis-captured generic returns — `[^(]+?` is minimal-match, so it grabbed the first character and let the inner `<` of `Task<…>` satisfy the boundary. Lesson banked: trace gnarly regexes in a tester, not in your head.

## Dedup key

Per-file extraction uses `${kind}:${name}:${exported}`. Same shape as the TypeScript and Python extractors — see the [heuristics overview](../heuristics.md#the-dedup-key-distinction) for the cross-file vs per-file rationale.

## v1 blind spots

Documented limitations, accepted as tradeoffs against the "single-line regex, no parser" design:

- **Methods, properties, fields, indexers.** A `public Task<int> GetCountAsync()` or `public string Name { get; set; }` inside a class is **not** extracted. None of these use the row keywords (`class`/`interface`/`struct`/`enum`/`record`/`delegate`). A diff that adds methods to an existing class falls through to a path-led subject (`update OrderHandler.cs`) — bland but never wrong.
- **`const` and `static readonly` fields.** No row matches `public const int MaxRetries = 3;`. Unlike Python's UPPER_SNAKE constants, C# class-scoped constants are noisy enough that the cost/benefit didn't justify a row.
- **Function pointers.** `public delegate*<int, int> Foo;` (C# 9+ `delegate*` syntax) is **not** extracted. The `delegate` row requires `delegate ` (with space), not `delegate*`.
- **Multi-line signatures.** A `public delegate Task<int> Foo(\n  int x,\n  int y\n);` that spans multiple lines is not matched — the regex needs the `(` on the declaring line.
- **Anonymous delegates.** `Action d = delegate(int x) { … };` is correctly rejected — `=` breaks the `(?:\w+\s+)*?` modifier prefix. (Anonymous methods aren't named symbols anyway.)
- **Generic constraints.** `where T : class` clauses are ignored; the name is captured before the clause.
- **Top-level statements** (C# 9+). A `Program.cs` that just calls methods without declaring a class produces nothing — there's no symbol to name.

These are the right places for a future tree-sitter upgrade to land. Until then, the fix for "this exact codebase trips a blind spot" is a fixture.

## File extensions

Match regex: `/\.csx?$/`. Covers:

- `.cs` — regular C# source
- `.csx` — C# script files (same grammar)

Deliberately **not** matched:

- `.csproj` — MSBuild project file (XML, not C# source)
- `.razor` / `.cshtml` — Razor templates (mixed C# and markup; would need a different extractor)
- `.vb` — Visual Basic .NET (different grammar)
