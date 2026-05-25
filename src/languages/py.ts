import type { CodeSymbol, LanguageExtractor } from '../types.js';

const PATTERNS: Array<{ re: RegExp; kind: CodeSymbol['kind'] }> = [
  { re: /^async\s+def\s+(\w+)/, kind: 'function' },
  { re: /^def\s+(\w+)/, kind: 'function' },
  { re: /^class\s+(\w+)/, kind: 'class' },
  { re: /^([A-Z][A-Z0-9_]+)\s*=/, kind: 'const' },
];

export const pyExtractor: LanguageExtractor = {
  matches(path: string): boolean {
    return /\.pyi?$/.test(path);
  },
  extract(lines: string[]): CodeSymbol[] {
    const symbols: CodeSymbol[] = [];
    const seen = new Set<string>();
    for (const line of lines) {
      for (const { re, kind } of PATTERNS) {
        const m = re.exec(line);
        if (m && m[1]) {
          const name = m[1];
          const exported = !name.startsWith('_');
          const key = `${kind}:${name}:${exported}`;
          if (!seen.has(key)) {
            seen.add(key);
            symbols.push({ kind, name, exported });
          }
          break;
        }
      }
    }
    return symbols;
  },
};
