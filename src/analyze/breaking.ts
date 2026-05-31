import type { CodeSymbol, SymbolDelta } from '../types.js';

/**
 * Detect breaking changes by inspecting the symbol delta.
 *
 * v1 rules (issue #49):
 *   - Any removed *exported* symbol = breaking (consumers can no longer import it).
 *   - When exactly 1 exported symbol is removed and 1 is added with the same kind,
 *     describe it as a rename rather than a removal.
 *
 * Deferred for follow-ups:
 *   - Signature changes (needs CodeSymbol.params)
 *   - Removed CLI flags (regex on removed lines, scoped to bin files)
 */
export function detectBreaking(symbols: SymbolDelta): string | undefined {
  const removedExports = symbols.removed.filter((s) => s.exported);
  if (removedExports.length === 0) return undefined;

  const addedExports = symbols.added.filter((s) => s.exported);

  if (
    removedExports.length === 1 &&
    addedExports.length === 1 &&
    removedExports[0]!.kind === addedExports[0]!.kind
  ) {
    return `rename exported ${removedExports[0]!.name} to ${addedExports[0]!.name}`;
  }

  return `remove exported ${formatList(removedExports)}`;
}

function formatList(syms: CodeSymbol[]): string {
  const names = syms.map((s) => s.name);
  if (names.length === 1) return names[0]!;
  if (names.length <= 3) return names.join(', ');
  const head = names.slice(0, 3).join(', ');
  return `${head}, and ${names.length - 3} more`;
}
