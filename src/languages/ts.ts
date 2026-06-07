import type { CodeSymbol, LanguageExtractor } from '../types.js';

const PATTERNS: Array<{
  re: RegExp;
  kind: CodeSymbol['kind'];
  exported: boolean;
  callable?: boolean;
}> = [
  {
    re: /^\s*export\s+default\s+(?:async\s+)?function\s+(\w+)/,
    kind: 'function',
    exported: true,
    callable: true,
  },
  {
    re: /^\s*export\s+(?:async\s+)?function\s+(\w+)/,
    kind: 'function',
    exported: true,
    callable: true,
  },
  { re: /^\s*export\s+(?:abstract\s+)?class\s+(\w+)/, kind: 'class', exported: true },
  { re: /^\s*export\s+interface\s+(\w+)/, kind: 'interface', exported: true },
  { re: /^\s*export\s+type\s+(\w+)\s*=/, kind: 'type', exported: true },
  { re: /^\s*export\s+(?:const|let|var)\s+(\w+)/, kind: 'const', exported: true },
  { re: /^\s*(?:async\s+)?function\s+(\w+)/, kind: 'function', exported: false, callable: true },
  { re: /^\s*(?:abstract\s+)?class\s+(\w+)/, kind: 'class', exported: false },
];

export const tsExtractor: LanguageExtractor = {
  matches(path: string): boolean {
    return /\.(tsx?|jsx?|mjs|cjs)$/.test(path);
  },
  extract(lines: string[]): CodeSymbol[] {
    const symbols: CodeSymbol[] = [];
    const seen = new Set<string>();
    for (const line of lines) {
      for (const { re, kind, exported, callable } of PATTERNS) {
        const m = re.exec(line);
        if (m && m[1]) {
          const key = `${kind}:${m[1]}:${exported}`;
          if (!seen.has(key)) {
            seen.add(key);
            const sym: CodeSymbol = { kind, name: m[1], exported };
            if (callable) {
              const p = /\(([^)]*)\)/.exec(line);
              if (p) sym.params = p[1] ?? '';
            }
            symbols.push(sym);
          }
          break;
        }
      }
    }
    return symbols;
  },
};
