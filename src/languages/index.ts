import type {
  CodeSymbol,
  FileChange,
  LanguageExtractor,
  ModifiedSymbol,
  SymbolDelta,
} from '../types.js';
import { csExtractor } from './cs.js';
import { goExtractor } from './go.js';
import { javaExtractor } from './java.js';
import { pyExtractor } from './py.js';
import { rustExtractor } from './rust.js';
import { tsExtractor } from './ts.js';

export const extractors: LanguageExtractor[] = [
  tsExtractor,
  pyExtractor,
  csExtractor,
  goExtractor,
  javaExtractor,
  rustExtractor,
];

export function extractorFor(path: string): LanguageExtractor | undefined {
  return extractors.find((e) => e.matches(path));
}

export function symbolDelta(files: FileChange[]): SymbolDelta {
  const added: CodeSymbol[] = [];
  const removed: CodeSymbol[] = [];
  const modified: ModifiedSymbol[] = [];

  for (const file of files) {
    const ex = extractorFor(file.path);
    if (!ex) continue;
    const inAdded = ex.extract(file.addedLines);
    const inRemoved = ex.extract(file.removedLines);

    // Net delta: a symbol that appears in both is just modified, not added/removed.
    const removedByKey = new Map(inRemoved.map((s) => [symKey(s), s] as const));
    const addedKeys = new Set(inAdded.map(symKey));

    for (const a of inAdded) {
      const r = removedByKey.get(symKey(a));
      if (!r) {
        added.push(a);
        continue;
      }

      // same identifier in both old and new, but something changed about it - count as modified
      if (a.params !== undefined && r.params !== undefined && a.params !== r.params) {
        modified.push({ from: r, to: a });
      }
      // else treat as unchanged and ignore
    }

    for (const r of inRemoved) {
      if (!addedKeys.has(symKey(r))) {
        removed.push(r);
      }
    }
  }

  return { added, removed, modified };
}

function symKey(s: CodeSymbol): string {
  return `${s.kind}:${s.name}`;
}
