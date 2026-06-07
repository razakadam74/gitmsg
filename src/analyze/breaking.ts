import type { CodeSymbol, SymbolDelta } from '../types.js';

/**
 * Detect breaking changes by inspecting the symbol delta.
 *
 * Rules (precedence top → bottom):
 *   1. Any removed *exported* symbol → "remove exported X" (or "rename X to Y" for 1-for-1 same-kind swaps).
 *   3. Any *exported* symbol whose signature changed (params differ on both sides) → "signature of exported X changed".
 *
 * Rule 1 takes precedence — a diff with both a removal and a signature change reports the removal only.
 *
 * Deferred for follow-ups:
 *   - Removed CLI flags (regex on removed lines, scoped to bin files) — issue #60
 */
export function detectBreaking(symbols: SymbolDelta): string | undefined {
  const removedExports = symbols.removed.filter((s) => s.exported);

  if (removedExports.length > 0) {
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

  const signatureChanged = symbols.modified.filter((m) => m.from.exported && m.to.exported);
  if (signatureChanged.length > 0) {
    return `signature of exported ${formatList(signatureChanged.map((m) => m.to))} changed`;
  }

  return undefined;
}

function formatList(syms: CodeSymbol[]): string {
  const names = syms.map((s) => s.name);
  if (names.length === 1) return names[0]!;
  if (names.length <= 3) return names.join(', ');
  const head = names.slice(0, 3).join(', ');
  return `${head}, and ${names.length - 3} more`;
}
