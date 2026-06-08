import type { CodeSymbol } from '../types.js';

type Pattern = {
  re: RegExp;
  kind: CodeSymbol['kind'];
  callable?: boolean;
  // Per-pattern static exported override. When set, exportedFn is not consulted.
  // Used by extractors (e.g. TS) where the export status is encoded in the pattern itself.
  exported?: boolean;
};

type ExportedFn = (line: string, name: string, p: Pattern) => boolean;

const CALLABLE_RE = /\(([^)]*)\)/;

export function runPatterns(
  lines: string[],
  patterns: Pattern[],
  exportedFn: ExportedFn,
): CodeSymbol[] {
  const symbols: CodeSymbol[] = [];
  const seen = new Set<string>();
  for (const line of lines) {
    for (const p of patterns) {
      const m = p.re.exec(line);
      if (m && m[1]) {
        const name = m[1];
        const exported = p.exported ?? exportedFn(line, name, p);
        const key = `${p.kind}:${name}:${exported}`;
        if (!seen.has(key)) {
          seen.add(key);
          const sym: CodeSymbol = { kind: p.kind, name, exported };
          if (p.callable) {
            const args = CALLABLE_RE.exec(line);
            if (args) sym.params = args[1] ?? '';
          }
          symbols.push(sym);
        }
        break;
      }
    }
  }
  return symbols;
}
