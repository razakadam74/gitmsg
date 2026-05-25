import { describe, expect, it } from 'vitest';
import type { FileChange } from '../src/types.js';
import { extractorFor, extractors, symbolDelta } from '../src/languages/index.js';
import { pyExtractor } from '../src/languages/py.js';
import { tsExtractor } from '../src/languages/ts.js';

const file = (overrides: Partial<FileChange> = {}): FileChange => ({
  path: 'src/a.ts',
  kind: 'modify',
  addedLines: [],
  removedLines: [],
  ...overrides,
});

describe('extractors registry', () => {
  it('includes tsExtractor', () => {
    expect(extractors).toContain(tsExtractor);
  });

  it('includes pyExtractor', () => {
    expect(extractors).toContain(pyExtractor);
  });
});

describe('extractorFor', () => {
  it.each(['a.ts', 'a.tsx', 'a.js', 'a.jsx', 'a.mjs', 'a.cjs'])('returns tsExtractor for %s', (p) =>
    expect(extractorFor(p)).toBe(tsExtractor),
  );

  it.each(['a.py', 'a.pyi'])('returns pyExtractor for %s', (p) =>
    expect(extractorFor(p)).toBe(pyExtractor),
  );

  it.each(['a.go', 'a.rs', 'a.md', 'image.png', 'a.tsbuildinfo', 'a.pyc', 'a.pyx'])(
    'returns undefined for %s',
    (p) => expect(extractorFor(p)).toBeUndefined(),
  );
});

describe('symbolDelta', () => {
  it('returns empty delta for empty input', () => {
    expect(symbolDelta([])).toEqual({ added: [], removed: [] });
  });

  it('skips files with no extractor', () => {
    const f = file({
      path: 'image.png',
      addedLines: ['export function foo() {}'], // would extract if ts, but png is skipped
    });
    expect(symbolDelta([f])).toEqual({ added: [], removed: [] });
  });

  it('reports a pure addition', () => {
    const f = file({
      kind: 'add',
      addedLines: ['export function rotateRefreshToken() {}'],
    });
    expect(symbolDelta([f])).toEqual({
      added: [{ kind: 'function', name: 'rotateRefreshToken', exported: true }],
      removed: [],
    });
  });

  it('reports a pure removal', () => {
    const f = file({
      kind: 'delete',
      removedLines: ['export function parseLegacyToken(s: string) {}'],
    });
    expect(symbolDelta([f])).toEqual({
      added: [],
      removed: [{ kind: 'function', name: 'parseLegacyToken', exported: true }],
    });
  });

  it('cancels a symbol that appears on both sides (modification)', () => {
    const f = file({
      addedLines: ['export function rotate(refreshToken: string) {}'],
      removedLines: ['export function rotate(token: string) {}'],
    });
    expect(symbolDelta([f])).toEqual({ added: [], removed: [] });
  });

  it('cancels across exported flip (private → public is a modification)', () => {
    const f = file({
      addedLines: ['export function foo() {}'],
      removedLines: ['function foo() {}'],
    });
    expect(symbolDelta([f])).toEqual({ added: [], removed: [] });
  });

  it('aggregates across multiple files', () => {
    const a = file({ path: 'src/a.ts', addedLines: ['export class A {}'] });
    const b = file({ path: 'src/b.ts', removedLines: ['export class B {}'] });
    expect(symbolDelta([a, b])).toEqual({
      added: [{ kind: 'class', name: 'A', exported: true }],
      removed: [{ kind: 'class', name: 'B', exported: true }],
    });
  });

  it('preserves duplicates across files (no cross-file dedup)', () => {
    const a = file({ path: 'src/a.ts', addedLines: ['export function foo() {}'] });
    const b = file({ path: 'src/b.ts', addedLines: ['export function foo() {}'] });
    expect(symbolDelta([a, b]).added).toHaveLength(2);
  });
});
