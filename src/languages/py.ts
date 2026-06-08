import type { CodeSymbol, LanguageExtractor } from '../types.js';
import { runPatterns } from './runner.js';

const PATTERNS: Array<{ re: RegExp; kind: CodeSymbol['kind']; callable?: boolean }> = [
  { re: /^async\s+def\s+(\w+)/, kind: 'function', callable: true },
  { re: /^def\s+(\w+)/, kind: 'function', callable: true },
  { re: /^class\s+(\w+)/, kind: 'class' },
  { re: /^([A-Z][A-Z0-9_]+)\s*=/, kind: 'const' },
];

export const pyExtractor: LanguageExtractor = {
  matches(path: string): boolean {
    return /\.pyi?$/.test(path);
  },
  extract(lines: string[]) {
    return runPatterns(lines, PATTERNS, (_line, name) => !name.startsWith('_'));
  },
};
