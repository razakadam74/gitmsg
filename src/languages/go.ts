import type { CodeSymbol, LanguageExtractor } from '../types.js';

const PATTERNS: Array<{ re: RegExp; kind: CodeSymbol['kind'] }> = [
  { re: /^func\s+(\w+)(?:\[[^\]]*\])?\s*\(/, kind: 'function' },
  { re: /^type\s+(\w+)(?:\[[^\]]*\])?\s+struct\b/, kind: 'class' },
  { re: /^type\s+(\w+)(?:\[[^\]]*\])?\s+interface\b/, kind: 'interface' },
  { re: /^type\s+(\w+)(?:\[[^\]]*\])?\s/, kind: 'type' },
  { re: /^const\s+(\w+)\s/, kind: 'const' },
];

export const goExtractor: LanguageExtractor = {
  matches(path: string): boolean {
    return /\.go$/.test(path);
  },
  extract(lines: string[]): CodeSymbol[] {
    const symbols: CodeSymbol[] = [];
    const seen = new Set<string>();

    for (const line of lines) {
      for (const { re, kind } of PATTERNS) {
        const m = re.exec(line);
        if (m && m[1]) {
          const name = m[1];
          const exported = /^[A-Z]/.test(name);
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
