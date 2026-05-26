import type { CodeSymbol, LanguageExtractor } from '../types.js';

const PATTERNS: Array<{ re: RegExp; kind: CodeSymbol['kind'] }> = [
  { re: /^\s*(?:\w+\s+)*?delegate\s+.+?(\w+)(?:\s*<[^>]*>)?\s*\(/, kind: 'type' },
  { re: /^\s*(?:\w+\s+)*?interface\s+(\w+)/, kind: 'interface' },
  { re: /^\s*(?:\w+\s+)*?enum\s+(\w+)/, kind: 'type' },
  { re: /^\s*(?:\w+\s+)*?record\s+(?:class\s+|struct\s+)?(\w+)/, kind: 'class' },
  { re: /^\s*(?:\w+\s+)*?struct\s+(\w+)/, kind: 'class' },
  { re: /^\s*(?:\w+\s+)*?class\s+(\w+)/, kind: 'class' },
];

export const csExtractor: LanguageExtractor = {
  matches(path: string): boolean {
    return /\.csx?$/.test(path);
  },
  extract(lines: string[]): CodeSymbol[] {
    const symbols: CodeSymbol[] = [];
    const seen = new Set<string>();

    for (const line of lines) {
      for (const { re, kind } of PATTERNS) {
        const m = re.exec(line);
        if (m && m[1]) {
          const name = m[1];
          const exported = /^\s*public\s/.test(line);
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
