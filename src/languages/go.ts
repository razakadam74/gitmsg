import type { CodeSymbol, LanguageExtractor } from '../types.js';
import { runPatterns } from './runner.js';

const PATTERNS: Array<{ re: RegExp; kind: CodeSymbol['kind']; callable?: boolean }> = [
  { re: /^func\s+(\w+)(?:\[[^\]]*\])?\s*\(/, kind: 'function', callable: true },
  { re: /^type\s+(\w+)(?:\[[^\]]*\])?\s+struct\b/, kind: 'class' },
  { re: /^type\s+(\w+)(?:\[[^\]]*\])?\s+interface\b/, kind: 'interface' },
  { re: /^type\s+(\w+)(?:\[[^\]]*\])?\s/, kind: 'type' },
  { re: /^const\s+(\w+)\s/, kind: 'const' },
];

const EXPORT_RE = /^[A-Z]/;

export const goExtractor: LanguageExtractor = {
  matches(path: string): boolean {
    return /\.go$/.test(path);
  },
  extract(lines: string[]) {
    return runPatterns(lines, PATTERNS, (_line, name) => EXPORT_RE.test(name));
  },
};
