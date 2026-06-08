import type { CodeSymbol, LanguageExtractor } from '../types.js';
import { runPatterns } from './runner.js';

const PATTERNS: Array<{ re: RegExp; kind: CodeSymbol['kind']; callable?: boolean }> = [
  {
    re: /^\s*(?:\w+\s+)*?delegate\s+.+?(\w+)(?:\s*<[^>]*>)?\s*\(/,
    kind: 'type',
    callable: true,
  },
  { re: /^\s*(?:\w+\s+)*?interface\s+(\w+)/, kind: 'interface' },
  { re: /^\s*(?:\w+\s+)*?enum\s+(\w+)/, kind: 'type' },
  { re: /^\s*(?:\w+\s+)*?record\s+(?:class\s+|struct\s+)?(\w+)/, kind: 'class' },
  { re: /^\s*(?:\w+\s+)*?struct\s+(\w+)/, kind: 'class' },
  { re: /^\s*(?:\w+\s+)*?class\s+(\w+)/, kind: 'class' },
];

const EXPORT_RE = /^\s*public\s+/;

export const csExtractor: LanguageExtractor = {
  matches(path: string): boolean {
    return /\.csx?$/.test(path);
  },
  extract(lines: string[]) {
    return runPatterns(lines, PATTERNS, (line) => EXPORT_RE.test(line));
  },
};
