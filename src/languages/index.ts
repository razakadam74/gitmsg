import type { CodeSymbol, FileChange, LanguageExtractor, SymbolDelta } from '../types.js';
import { tsExtractor } from './ts.js';

export const extractors: LanguageExtractor[] = [tsExtractor];

export function extractorFor(path: string): LanguageExtractor | undefined {
  return extractors.find((e) => e.matches(path));
}

export function symbolDelta(files: FileChange[]): SymbolDelta {
  const added: CodeSymbol[] = [];
  const removed: CodeSymbol[] = [];

  for (const file of files) {
    const ex = extractorFor(file.path);
    if (!ex) continue;
    const inAdded = ex.extract(file.addedLines);
    const inRemoved = ex.extract(file.removedLines);

    // Net delta: a symbol that appears in both is just modified, not added/removed.
    const removedKeys = new Set(inRemoved.map(symKey));
    const addedKeys = new Set(inAdded.map(symKey));

    for (const s of inAdded) {
      if (!removedKeys.has(symKey(s))) {
        added.push(s);
      }
    }

    for (const s of inRemoved) {
      if (!addedKeys.has(symKey(s))) {
        removed.push(s);
      }
    }
  }

  return { added, removed };
}

function symKey(s: CodeSymbol): string {
  return `${s.kind}:${s.name}`;
}
