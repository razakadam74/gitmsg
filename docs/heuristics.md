# Heuristics

How `gitmsg` decides what to say. Every rule is testable; if you disagree with one, add a fixture under `tests/fixtures/` that demonstrates the bad output. We change rules to fit fixtures, not the other way around.

For language-specific symbol extraction, see [`languages/`](./languages/).

## 1. Commit type detection

An 11-rung ladder. First match wins; precedence encodes specificity.

| Rung | Condition                                                                   | Type                   |
| ---- | --------------------------------------------------------------------------- | ---------------------- |
| 1    | No files in diff                                                            | `chore`                |
| 2    | Every file matches `TEST_PATTERN`                                           | `test`                 |
| 3    | Every file matches `DOC_PATTERN` or `MARKDOWN_PATTERN`                      | `docs`                 |
| 4    | Every file matches `CI_PATTERN`                                             | `ci`                   |
| 5    | Every file matches `DEPS_PATTERN`                                           | `chore` (scope `deps`) |
| 6    | Every file matches `BUILD_PATTERN`                                          | `build`                |
| 7    | Every file is a rename with no content change                               | `refactor`             |
| 8    | Every file is whitespace-only                                               | `style`                |
| 9    | A comment-line edit on an existing file contains a fix-shaped keyword       | `fix`                  |
| 10   | Any new source file present                                                 | `feat`                 |
| 11   | Added lines > removed × 1.5 → `feat`; reverse → `refactor`; else `refactor` | (default)              |

### Path patterns

Lives in `src/analyze/type.ts`. Patterns are regex tests against the file path.

| Pattern            | Matches                                                                                                                                                                                  |
| ------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `TEST_PATTERN`     | `__tests__/`, `test/`, `tests/`, `spec/`, or `.test.ext` / `.spec.ext`                                                                                                                   |
| `DOC_PATTERN`      | `docs/`, `doc/`, `README`, `CHANGELOG`, `CONTRIBUTING`, `LICENSE`, `CODE_OF_CONDUCT`, `SECURITY`                                                                                         |
| `MARKDOWN_PATTERN` | `.md`, `.mdx`, `.rst`, `.adoc`                                                                                                                                                           |
| `CI_PATTERN`       | `.github/workflows/`, `.github/actions/`, `.gitlab-ci.yml`, `.travis.yml`, `azure-pipelines.yml`, `Jenkinsfile`, `.circleci/`                                                            |
| `BUILD_PATTERN`    | `tsup.config.*`, `vite.config.*`, `rollup.config.*`, `webpack.config.*`, `esbuild.*`, `Makefile`, `Dockerfile`, `.dockerignore`, `build.gradle`, `pom.xml`, `setup.py`, `pyproject.toml` |
| `DEPS_PATTERN`     | See sidebar below                                                                                                                                                                        |

### Helpers

- **`every`** — wraps `Array.prototype.every` but returns `false` on an empty array. JS's vacuous-truth would otherwise let every "every-file-is-X" guard fire on empty input.
- **`isWhitespaceOnly`** — compares whitespace-stripped added/removed lines. A rename with no content change is whitespace-only by definition.
- **`looksLikeFix`** — inspects only comment-line additions (`//`, `#`, `/*`) on already-existing files. Adding `// fix the off-by-one` is fix-shaped signal; an `if (bug)` line isn't.

> 💡 **Decision:** `every([])` returns `true` in JavaScript. Our helper returns `false` so an empty diff falls through to rung 1 instead of satisfying every guard simultaneously.

> 💡 **Decision:** The `*1.5` margin on rung 11 is a confidence threshold. A diff with 101 additions and 100 removals shouldn't flap between `feat` and `refactor` — neither side has earned the verdict.

### Sidebar: dependency-file detection

The `DEPS_PATTERN` regex lives in `src/analyze/patterns.ts` and is **anchored** with `(^|\/)…$` so it matches actual lockfiles, not files that happen to contain a lockfile name (`pnpm-lock.yaml.bak`, `examples/package.json.template`).

Covers `package.json`, `package-lock.json`, `yarn.lock`, `pnpm-lock.yaml`, `requirements.txt`, `Pipfile`, `Pipfile.lock`, `go.mod`, `go.sum`, `Cargo.toml`, `Cargo.lock`, `Gemfile`, `Gemfile.lock`, `composer.json`, `composer.lock`.

> 💡 **Decision:** Constants used by ≥ 2 analyzer modules live in `patterns.ts`; everything else stays module-local. When only one consumer remains, demote back.

## 2. Scope detection

Two-rung algorithm. Returns `undefined` rather than guessing when no scope is obvious.

1. **Strict monorepo** — if every file matches `(packages|apps|libs)/X/…` and every match has the same `X`, the scope is `X`. Mixed packages → no scope.
2. **Common prefix** — otherwise, strip a leading `src/`, `lib/`, `app/`, or `source/` (single pass), then take the common first path segment if every file shares it.

A sanitizer (`sanitizeScope`) lowercases the result, replaces non-alphanumerics with `-`, collapses runs, and trims. Output capped at 24 characters.

### Noise filter

First-segment values that are never valid scopes:

- `tests`, `test`, `__tests__`, `spec`, `specs`
- `docs`, `doc`
- `.github`
- `packages`, `apps`, `libs` (only valid when followed by an inner package name)

> 💡 **Decision:** Source-prefix stripping is **single-pass**. `src/lib/foo.ts` strips to `lib/foo.ts`, not `foo.ts`. If your repo literally has `src/lib/`, `lib` is probably your scope.

> 💡 **Decision:** The noise filter checks only the **first** segment. `packages/auth/tests/jwt.test.ts` produces scope `auth` — the inner `tests/` is the package's internal layout, not a top-level concern.

> 💡 **Decision:** Single-segment paths like `README.md` produce no scope. The `s.length > 1` guard rejects "the scope of this commit is `README.md`".

## 3. Subject wording

Operates on the commit type plus the `SymbolDelta` from language extractors plus the raw file list.

### Type-specific phrasing (early-exit)

| Type            | Single file                                                                               | Multi-file                   |
| --------------- | ----------------------------------------------------------------------------------------- | ---------------------------- |
| `docs`          | `update README` / `update changelog` / `update contributing guide` / `update <name> docs` | `update docs`                |
| `test`          | (depends on whether the file names share a subject) — see below                           | `add tests` / `update tests` |
| `ci`            | `update <name> workflow`                                                                  | `update CI configuration`    |
| `build`         | `update <name> build config`                                                              | `update build configuration` |
| `chore` (deps)  | `update dependencies`                                                                     | `update dependencies`        |
| `chore` (other) | `misc maintenance`                                                                        | `misc maintenance`           |
| `style`         | `apply formatting`                                                                        | `apply formatting`           |

For `test`: the base names are stripped of `.test`/`.spec` suffixes and `test_`/`test-` prefixes. If all paths reduce to the same name, the subject is `add tests for <name>`; otherwise it falls back to `add tests` (if any file is new) or `update tests`.

### Symbol-driven phrasing (`feat` / `fix` / `refactor` / `perf`)

When language extractors produced a symbol delta:

| Delta                | Subject                       |
| -------------------- | ----------------------------- |
| 1 add, 0 removed     | `add <name>`                  |
| 0 added, 1 removed   | `remove <name>`               |
| 1 add, 1 removed     | `rename <removed> to <added>` |
| ≥ 2 added, 0 removed | `add <first> and others`      |

> 💡 **Decision:** Multi-add wording uses "and others", not "and N more". The exact count carries no actionable information and invites reader bikeshedding.

> 💡 **Decision:** No similarity check on the 1+1 rename rung. Real-world 1-symbol-added + 1-symbol-removed diffs are renames with high prior — including refactor-renames where names share no characters (`OldFooManager` → `BarService`).

> 💡 **Decision:** When multiple symbols are added, **first-declared wins** as the headline. The reader expects the source file's first export to be the most important thing in the commit.

### Fallback (no symbols extractable)

In order: all-rename → `rename <old> to <new>` or `rename files`; single add → `add <name>`; single delete → `remove <name>`; single-file modify → `<verb> <name>` where verb is `fix` / `optimize` / `update` per type; multi-file modify → `fix bugs` / `optimize hot paths` / `refactor module`.

Empty diff returns `empty commit`.

## 4. Subject formatting

Lives in `src/format.ts`. Pure function — `CommitMessage → string`.

- Header shape: `type(scope)!?: subject`. `scope` and `!` are omitted when absent.
- Body and breaking-change footer rendered after a blank line each.
- Subject capped at `maxSubjectLength` (default 72). Overflow trimmed with a trailing `…`.

> 💡 **Decision:** Body generation is not yet implemented in the analyzer. The formatter supports it — output is always empty in v1.

## 5. Language extractors

The contributor entry point for adding new language support.

### Interface contract

```ts
interface LanguageExtractor {
  matches(path: string): boolean;
  extract(lines: string[]): CodeSymbol[];
}
```

Each extractor lives in `src/languages/<lang>.ts`, exports `<lang>Extractor: LanguageExtractor`, and is registered in the `extractors` array in `src/languages/index.ts`. For per-language specifics, see [`languages/`](./languages/).

### The dedup-key distinction

Two different keys, two different questions.

| Key                           | Used in                                 | Question                            |
| ----------------------------- | --------------------------------------- | ----------------------------------- |
| `${kind}:${name}:${exported}` | Per-file extraction (`extract`)         | "Are these the same record?"        |
| `${kind}:${name}`             | Cross-file cancellation (`symbolDelta`) | "Did these two records cancel out?" |

The cancellation key omits `exported`. A private-to-public flip (`function foo` → `export function foo`) cancels as a modification, not an add + remove pair.

> 💡 **Decision:** Two different questions justify two different keys. Identity includes attributes; cancellation is identity-only.

### Adding a new language

Design-first, code-second. Lock the calls before you write the regex.

1. **Decide the design calls before touching code.** Three questions, language-specific:
   - **Where does `exported` come from?** Three precedents: TypeScript reads it from the **regex row** (the `export` literal is in the pattern), Python reads it from the **name** (PEP 8 leading-underscore convention), C# reads it from the **line prefix** (`/^\s*public\s/`). Pick the model that fits the language's visibility rules; document it in `docs/languages/<lang>.md`.
   - **Top-level only, or any indentation?** Python uses `^` (column-0 only — methods are excluded by anchor). C# uses `^\s*` (declarations nested in `namespace { }` blocks are valid). The anchor is your blind-spot policy in disguise.
   - **Which symbol shapes earn a row?** Map language constructs onto the `SymbolKind` union (`function | class | const | interface | type | method`). C# `struct`/`record` → `class`; `enum`/`delegate` → `type`. Don't extend the union casually.
2. **Create `src/languages/<lang>.ts`** exporting `<lang>Extractor`. Keep the regex ladder small (4–6 rows is typical) and single-line — see the regex discipline note below.
3. **Register in the `extractors` array** in `src/languages/index.ts`.
4. **Update `tests/languages-index.test.ts`** — registry assertion (`expect(extractors).toContain(<lang>Extractor)`), positive-path `extractorFor` cases for matching extensions, and **negative** cases for sibling-but-different extensions (e.g. `.razor`/`.cshtml` for C#, `.pyx` for Python). Without these, a future regex tweak that accidentally widens `matches()` won't fail anything.
5. **Mirror `tests/languages-ts.test.ts`** — one test per declaration form, one for dedup, one negative-path on `matches()`. The positive/negative split exists to pin down both what is and isn't extracted; both halves are required.
6. **Add at least one fixture pair** under `tests/fixtures/` demonstrating a real diff in the language. `fixtures.test.ts` picks it up automatically by glob. This is a contract test against the whole pipeline (parse → analyze → format), not just the extractor.
7. **Add docs at `docs/languages/<lang>.md`** covering: file extensions (positive list and a deliberately-not-matched list), the pattern ladder, where `exported` comes from, blind spots, and any language-specific decisions.
8. **Create a changeset** with `npx changeset` (minor bump) — without it, the release PR won't fire. The changeset summary should name the language and what it enables, e.g. _"Add C# language extractor for symbol-aware subject lines on .cs and .csx files."_
9. **Run all 5 gates** before opening the PR: `npm run format:check && npm run lint && npm run typecheck && npm test && npm run build`.

Keep regex single-line. If your language genuinely needs multi-line parsing (Python multi-line `def` signatures, Rust trait bodies), file an issue rather than nesting state — the tree-sitter upgrade is the right vehicle.

## 6. Empty-diff handling

Empty staged input is a known shape, not a panic case. Handled in exactly three places:

1. `parseDiff` returns `{ files: [] }` on empty input — never throws.
2. `detectSubject` early-exits with `"empty commit"`.
3. `analyze`'s chore-deps scope override is guarded with `files.length > 0` so empty input doesn't get a spurious `scope: 'deps'`.

> 💡 **Decision:** Guards live at function entry, not at branch sites. Defense-in-depth inside a single function fragments the contract.

---

## Keeping this document current

If your PR changes a rule documented here, **update the doc in the same PR**. Code-and-doc drift is real; bundling prevents it. The PR checklist in [`CONTRIBUTING.md`](../CONTRIBUTING.md) calls this out explicitly.
