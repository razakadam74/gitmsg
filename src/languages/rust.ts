import type { CodeSymbol, LanguageExtractor } from '../types.js';
import { runPatterns } from './runner.js';

const PATTERNS: Array<{ re: RegExp; kind: CodeSymbol['kind']; callable?: boolean }> = [
  {
    re: /^(?:pub(?:\([^)]*\))?\s+)?(?:(?:async|unsafe|const)\s+)*(?:extern\s+"[^"]*"\s+)?fn\s+(\w+)/,
    kind: 'function',
    callable: true,
  },
  { re: /^(?:pub(?:\([^)]*\))?\s+)?struct\s+(\w+)/, kind: 'class' },
  { re: /^(?:pub(?:\([^)]*\))?\s+)?enum\s+(\w+)/, kind: 'type' },
  { re: /^(?:pub(?:\([^)]*\))?\s+)?(?:unsafe\s+)?trait\s+(\w+)/, kind: 'interface' },
  { re: /^(?:pub(?:\([^)]*\))?\s+)?type\s+(\w+)/, kind: 'type' },
  { re: /^(?:pub(?:\([^)]*\))?\s+)?const\s+(\w+)\s*:/, kind: 'const' },
];

const EXPORT_RE = /^pub\s/;

export const rustExtractor: LanguageExtractor = {
  matches(path: string): boolean {
    return /\.rs$/.test(path);
  },
  extract(lines: string[]) {
    return runPatterns(lines, PATTERNS, (line) => EXPORT_RE.test(line));
  },
};
