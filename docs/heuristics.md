# Heuristics

How `gitmsg` decides what to say. Every rule is testable; if you disagree with one, add a fixture under `tests/fixtures/` that demonstrates the bad output. We change rules to fit fixtures, not the other way around.

For language-specific symbol extraction, see [`languages/`](./languages/).

## 1. Commit type detection

An 11-rung ladder. First match wins; precedence encodes specificity.

Before the ladder runs, files matching `NEUTRAL_PATTERN` (`.gitignore`, `.gitattributes`, `.editorconfig`, `.prettierignore`, `.prettierrc*`, `.npmignore`) are filtered out. They carry no category intent of their own and would otherwise veto every-file checks (a single `.gitignore` tweak alongside a docs-only diff used to fall through to `feat`). If the entire diff is neutrals, the type is `chore`.

| Rung | Condition                                                                    | Type                   |
| ---- | ---------------------------------------------------------------------------- | ---------------------- |
| 1    | No files in diff, or only neutral files                                      | `chore`                |
| 2    | Every signal file matches `TEST_PATTERN`                                     | `test`                 |
| 3    | Every signal file matches `DOC_PATTERN` or `MARKDOWN_PATTERN`                | `docs`                 |
| 4    | Every signal file matches `CI_PATTERN`                                       | `ci`                   |
| 5    | Every signal file matches `DEPS_PATTERN`                                     | `chore` (scope `deps`) |
| 6    | Every signal file matches `BUILD_PATTERN`                                    | `build`                |
| 7    | Every signal file is a rename with no content change                         | `refactor`             |
| 8    | Every signal file is whitespace-only                                         | `style`                |
| 9    | A comment-line edit on an existing signal file contains a fix-shaped keyword | `fix`                  |
| 10   | Any new source file present in the signal set                                | `feat`                 |
| 11   | Added lines > removed × 1.5 → `feat`; reverse → `refactor`; else `refactor`  | (default)              |

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
| `NEUTRAL_PATTERN`  | `.gitignore`, `.gitattributes`, `.editorconfig`, `.npmignore`, `.prettierignore`, `.prettierrc*` (filtered before voting)                                                                |

### Helpers

- **`every`** — wraps `Array.prototype.every` but returns `false` on an empty array. JS's vacuous-truth would otherwise let every "every-file-is-X" guard fire on empty input.
- **`isWhitespaceOnly`** — compares whitespace-stripped added/removed lines. A rename with no content change is whitespace-only by definition.
- **`looksLikeFix`** — inspects only comment-line additions (`//`, `#`, `/*`) on already-existing files. Adding `// fix the off-by-one` is fix-shaped signal; an `if (bug)` line isn't.

> 💡 **Decision:** `every([])` returns `true` in JavaScript. Our helper returns `false` so an empty diff falls through to rung 1 instead of satisfying every guard simultaneously.

> 💡 **Decision:** The `*1.5` margin on rung 11 is a confidence threshold. A diff with 101 additions and 100 removals shouldn't flap between `feat` and `refactor` — neither side has earned the verdict.

> 💡 **Decision:** Neutral config files are _filtered before voting_, not classified as their own type. A `.gitignore` tweak shipped alongside docs is still a docs commit; a `.gitignore` tweak shipped alongside src is still a feat. Only when the _entire_ diff is neutral does the type become `chore`. Mirror of `scope.ts` rung 4: drop noise, classify on what's left.

### Sidebar: dependency-file detection

The `DEPS_PATTERN` regex lives in `src/analyze/patterns.ts` and is **anchored** with `(^|\/)…$` so it matches actual lockfiles, not files that happen to contain a lockfile name (`pnpm-lock.yaml.bak`, `examples/package.json.template`).

Covers `package.json`, `package-lock.json`, `yarn.lock`, `pnpm-lock.yaml`, `requirements.txt`, `Pipfile`, `Pipfile.lock`, `go.mod`, `go.sum`, `Cargo.toml`, `Cargo.lock`, `Gemfile`, `Gemfile.lock`, `composer.json`, `composer.lock`.

> 💡 **Decision:** Constants used by ≥ 2 analyzer modules live in `patterns.ts`; everything else stays module-local. When only one consumer remains, demote back.

## 2. Scope detection

Four-rung algorithm. Returns `undefined` rather than guessing when no scope is obvious.

1. **Strict monorepo** — if every file matches `(packages|apps|libs)/X/…` and every match has the same `X`, the scope is `X`. Mixed packages → no scope.
2. **Common prefix** — otherwise, strip a leading `src/`, `lib/`, `app/`, or `source/` (single pass), then take the common first path segment if every file shares it.
3. **Dominant first segment** — if rung 2 fails because one or two files break the share (typically root-level `README.md`, `CONTRIBUTING.md`, or a stray config), take the most common first segment when it covers **≥ 50% of files AND at least 2 files**, with a single clear winner. Noise-segment names (see filter below) and monorepo roots can never _win_ rung 3, but they still **count toward the denominator** — a 2-of-4 cluster where the other 2 are in `tests/` is still 2-of-4, not 2-of-2.
4. **Signal-only intersection** — if rung 3 also fails, drop noise files (`tests/`, `docs/`, `.github/`, `.changeset/`, monorepo-root containers) and root-level files entirely; if **2 or more** signal-bearing files survive _and_ they all share the same first segment (post-`src/` strip), that segment is the scope. This catches the case where a real cluster is outvoted by the test/doc/changeset files that ship alongside it — e.g. a new language extractor PR with 2 source files, 4 test files, 2 doc files, and a changeset.

A sanitizer (`sanitizeScope`) lowercases the result, replaces non-alphanumerics with `-`, collapses runs, and trims. Output capped at 24 characters.

### Noise filter

First-segment values that are never valid scopes:

- `tests`, `test`, `__tests__`, `spec`, `specs`
- `docs`, `doc`
- `.github`, `.changeset`
- `packages`, `apps`, `libs` (only valid when followed by an inner package name)

> 💡 **Decision:** Source-prefix stripping is **single-pass**. `src/lib/foo.ts` strips to `lib/foo.ts`, not `foo.ts`. If your repo literally has `src/lib/`, `lib` is probably your scope.

> 💡 **Decision:** The noise filter checks only the **first** segment. `packages/auth/tests/jwt.test.ts` produces scope `auth` — the inner `tests/` is the package's internal layout, not a top-level concern.

> 💡 **Decision:** Single-segment paths like `README.md` produce no scope. The `s.length > 1` guard rejects "the scope of this commit is `README.md`".

> 💡 **Decision:** Rung 3 counts noise files in the denominator but bars them from winning. The alternative — exclude noise entirely — would let a 1-of-1 `src/auth` + 3-of-3 `tests/` diff emit `auth`, which over-claims the scope of a mostly-test change. Path-only conservatism: heuristics should depend only on what's visible at the path level, and prefer `undefined` under uncertainty.

> 💡 **Decision:** Rung 3 requires a strict majority (`bestCount / total ≥ 0.5`) **and** at least two files in the winning segment. A single straggler outvoting a single feature file (1-of-2 = 50%) needs the second file to confirm the cluster is real, not coincidence.

> 💡 **Decision:** Rung 4 is more permissive than rung 3 _on which files vote_ (it drops noise entirely instead of counting it) but **equally strict on what counts as agreement** — it requires all surviving signal files to share the same first segment, not just a plurality. The `≥ 2 survivors` guard preserves rung 3's conservatism by mechanism rather than by threshold: a 1-src + N-tests diff has only one signal survivor and bails. Lowering rung 3's threshold to fix the same case was rejected because it would also let low-confidence clusters claim scope on diffs where the signal really is split.

> 💡 **Decision:** `.changeset` is in the noise list because every PR in this repo ships with a changeset by recipe — it must not "count" as content for scope inference. Removing it from `NOISE_SCOPES` will cause rung 4 to stop firing on most real PRs; the `'.changeset alone -> undefined'` test row in `tests/analyze-scope.test.ts` pins this assumption.

> 💡 **Decision:** "Signal" vs "noise" reflects a source-first project layout. A tests-first or docs-as-product repo would reasonably disagree with these defaults; user-configurable noise lists are deferred to the `.gitmsgrc` work (Phase 7.8).

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

## 3.5 Breaking-change detection

Lives in `src/analyze/breaking.ts`. Pure function — `SymbolDelta → string | undefined`. When defined, the orchestrator sets `message.breaking`, which makes `format.ts` append `!` to the header (`feat(api)!: …`) and emit a `BREAKING CHANGE:` footer.

| Delta shape                                                              | Footer wording                              |
| ------------------------------------------------------------------------ | ------------------------------------------- |
| Exactly 1 exported symbol removed AND 1 exported symbol added, same kind | `rename exported <old> to <new>`            |
| 1 exported symbol removed                                                | `remove exported <name>`                    |
| 2–3 exported symbols removed                                             | `remove exported <a>, <b>[, <c>]`           |
| ≥ 4 exported symbols removed                                             | `remove exported <a>, <b>, <c>, and N more` |

> 💡 **Decision:** Only **exported** removals trigger this. Removing an internal helper is a normal refactor; removing a public symbol breaks every downstream consumer. The `exported` field is set by each language extractor per its own visibility rules (see §5).

> 💡 **Decision:** The rename rung requires same `kind` so that `function foo` → `class Foo` is reported as `remove exported foo` rather than a misleading rename. Different kinds with the same name are still two distinct API breakages.

> 💡 **Decision:** No similarity check on the rename rung — same reason as the subject heuristic. A 1-removed-export + 1-added-export diff is overwhelmingly a rename in practice, regardless of name similarity.

> 💡 **Deferred:** Signature changes (different param count of an existing exported function) are not detected in v1 — that requires extending `CodeSymbol` with a `params` field across all language extractors. Removed CLI flags (regex scan on deleted lines, scoped to bin files) are similarly deferred; both are tracked as separate issues.

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

A new-language PR touches these files, every time:

| File                                             | Action                                                          |
| ------------------------------------------------ | --------------------------------------------------------------- |
| `src/languages/<lang>.ts`                        | create                                                          |
| `src/languages/index.ts`                         | register the new extractor in the `extractors` array            |
| `tests/languages-<lang>.test.ts`                 | create                                                          |
| `tests/languages-index.test.ts`                  | add registry assertion + positive/negative `extractorFor` cases |
| `tests/fixtures/<feat-name>.{diff,expected.txt}` | create one cross-layer fixture pair                             |
| `docs/languages/<lang>.md`                       | create                                                          |
| `.changeset/<slug>.md`                           | create via `npx changeset` (minor bump)                         |

Steps below expand each row.

1. **Decide the design calls before touching code.** Three questions, language-specific:
   - **Where does `exported` come from?** Four precedents: TypeScript reads it from the **regex row** (the `export` literal is in the pattern), Python reads it from the **name** (PEP 8 leading-underscore convention), C# reads it from the **line prefix** (`/^\s*public\s/`), Go reads it from the **name** (leading-capital language rule). Pick the model that fits the language's visibility rules; document it in `docs/languages/<lang>.md`.
   - **Top-level only, or any indentation?** Python and Go use `^` (column-0 only — methods/nested declarations are excluded by anchor). C# uses `^\s*` (declarations nested in `namespace { }` blocks are valid). The anchor is your blind-spot policy in disguise.
   - **Which symbol shapes earn a row?** Map language constructs onto the `SymbolKind` union (`function | class | const | interface | type | method`). C# `struct`/`record` → `class`; `enum`/`delegate` → `type`. Don't extend the union casually.
2. **Create `src/languages/<lang>.ts`** exporting `<lang>Extractor`. Keep the regex ladder small (4–6 rows is typical) and single-line — see the regex discipline note below. **If a general row could swallow what a specific row should match** (e.g. a generic `type NAME …` row alongside `type NAME struct` / `type NAME interface`), list the specific rows first and pin the order with tests in step 5.
3. **Register in the `extractors` array** in `src/languages/index.ts`.
4. **Add registry coverage in `tests/languages-index.test.ts`** — the registry assertion (`expect(extractors).toContain(<lang>Extractor)`), positive-path `extractorFor` cases for matching extensions, and **negative** cases for sibling-but-different extensions (e.g. `.razor`/`.cshtml` for C#, `.pyx` for Python, `.gohtml`/`.tmpl`/`go.mod`/`go.sum` for Go). Without these, a future regex tweak that accidentally widens `matches()` won't fail anything. **Easy to forget — it sits between two `create` steps; the table above is your reminder.**
5. **Mirror `tests/languages-ts.test.ts`** — one test per declaration form, one for dedup, one negative-path on `matches()`. The positive/negative split exists to pin down both what is and isn't extracted; both halves are required. **If your ladder has overlapping rows** (the general row would otherwise swallow a specific one), add precedence tests pinning the order — `tests/languages-go.test.ts` has the canonical examples (`struct row beats generic type row for the same name`).
6. **Add at least one fixture pair** under `tests/fixtures/` demonstrating a real diff in the language. `fixtures.test.ts` picks it up automatically by glob. This is a contract test against the whole pipeline (parse → analyze → format), not just the extractor. The `.expected.txt` file **ends with a trailing newline** (POSIX text-file convention; matches every other fixture).
7. **Add docs at `docs/languages/<lang>.md`** covering: file extensions (positive list and a deliberately-not-matched list), the pattern ladder, where `exported` comes from, blind spots, and any language-specific decisions.
8. **Create a changeset** with `npx changeset` (minor bump) — without it, the release PR won't fire. The changeset summary should name the language and what it enables, e.g. _"Add C# language extractor for symbol-aware subject lines on .cs and .csx files."_
9. **Run all 5 gates** before opening the PR: `npm run format:check && npm run lint && npm run typecheck && npm test && npm run build`.

Keep regex single-line. If your language genuinely needs multi-line parsing (Python multi-line `def` signatures, Rust trait bodies), file an issue rather than nesting state — the tree-sitter upgrade is the right vehicle.

Generic type parameters (Go `[T any]`, Rust `<T>`, Java `<T>`) belong **inside an existing row** as an optional non-capturing group, not as their own row. The captured name is the bare identifier; the parameter list is part of the declaration, not part of the name. Go's `(?:\[[^\]]*\])?` between the name and the next anchor is the reference pattern.

## 6. Empty-diff handling

Empty staged input is a known shape, not a panic case. Handled in exactly three places:

1. `parseDiff` returns `{ files: [] }` on empty input — never throws.
2. `detectSubject` early-exits with `"empty commit"`.
3. `analyze`'s chore-deps scope override is guarded with `files.length > 0` so empty input doesn't get a spurious `scope: 'deps'`.

> 💡 **Decision:** Guards live at function entry, not at branch sites. Defense-in-depth inside a single function fragments the contract.

---

## Keeping this document current

If your PR changes a rule documented here, **update the doc in the same PR**. Code-and-doc drift is real; bundling prevents it. The PR checklist in [`CONTRIBUTING.md`](../CONTRIBUTING.md) calls this out explicitly.
