# TypeScript / JavaScript

Symbol extraction for `.ts`, `.tsx`, `.js`, `.jsx`, `.mjs`, `.cjs`.

Source: [`src/languages/ts.ts`](../../src/languages/ts.ts).

## Pattern ladder

Eight regex patterns, ordered exported-first. First match per line wins.

| #   | Pattern shape                                               | Kind        | Exported |
| --- | ----------------------------------------------------------- | ----------- | -------- |
| 1   | `export default function NAME` (incl. `async`)              | `function`  | yes      |
| 2   | `export function NAME` (incl. `async`)                      | `function`  | yes      |
| 3   | `export class NAME` (incl. `abstract`)                      | `class`     | yes      |
| 4   | `export interface NAME`                                     | `interface` | yes      |
| 5   | `export type NAME =`                                        | `type`      | yes      |
| 6   | `export const NAME` / `export let NAME` / `export var NAME` | `const`     | yes      |
| 7   | `function NAME` (incl. `async`)                             | `function`  | no       |
| 8   | `class NAME` (incl. `abstract`)                             | `class`     | no       |

> 💡 **Decision:** Pattern order is defense-in-depth. Today no two patterns overlap, but loosening any regex in the future could collide. Exported variants come before private variants; declaration keywords (`function`, `class`, `const`) are never optional in their pattern, while modifier keywords (`async`, `abstract`) are.

## Dedup key

Per-file extraction uses `${kind}:${name}:${exported}`. Two `export function foo` lines in one file collapse to one record. A private-to-public flip across the diff produces two distinct records (intentional — it's a meaningful change).

Cross-file cancellation uses `${kind}:${name}` (drops `exported`). See the [heuristics overview](../heuristics.md#the-dedup-key-distinction) for the rationale.

## v1 blind spots

Documented limitations, accepted as tradeoffs against the "single-line regex, no parser" design:

- **Class methods.** A method `foo()` declared inside a class is not extracted. Only top-level `function`/`class`/`interface`/`type`/`const` declarations.
- **Arrow-function consts.** `export const foo = () => …` is captured as `kind: 'const'`, not `kind: 'function'`. The signal that it's callable is lost.
- **Re-exports.** `export { foo } from './bar.js'` is not extracted.
- **Multi-line signatures.** A `function foo(` that spans multiple lines (one parameter per line) is not extracted unless the name appears on the first line.

These are the right places for a future tree-sitter upgrade to land. Until then, the fix for "this exact codebase trips a blind spot" is a fixture.

## File extensions

Match regex: `/\.(tsx?|jsx?|mjs|cjs)$/`. Covers:

- `.ts`, `.tsx` — TypeScript
- `.js`, `.jsx` — JavaScript
- `.mjs` — ES module JavaScript
- `.cjs` — CommonJS JavaScript

`.d.ts` files match the pattern but typically contain only declarations the extractor already handles (`export type`, `export interface`, `export function`).
