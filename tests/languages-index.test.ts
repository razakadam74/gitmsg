import { describe, expect, it } from 'vitest';
import type { FileChange } from '../src/types.js';
import { extractorFor, extractors, symbolDelta } from '../src/languages/index.js';
import { csExtractor } from '../src/languages/cs.js';
import { goExtractor } from '../src/languages/go.js';
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

  it('includes csExtractor', () => {
    expect(extractors).toContain(csExtractor);
  });

  it('includes goExtractor', () => {
    expect(extractors).toContain(goExtractor);
  });
});

describe('extractorFor', () => {
  it.each(['a.ts', 'a.tsx', 'a.js', 'a.jsx', 'a.mjs', 'a.cjs'])('returns tsExtractor for %s', (p) =>
    expect(extractorFor(p)).toBe(tsExtractor),
  );

  it.each(['a.py', 'a.pyi'])('returns pyExtractor for %s', (p) =>
    expect(extractorFor(p)).toBe(pyExtractor),
  );

  it.each(['a.cs', 'a.csx'])('returns csExtractor for %s', (p) =>
    expect(extractorFor(p)).toBe(csExtractor),
  );

  it.each(['a.go', 'main_test.go', 'pkg/foo/bar.go'])('returns goExtractor for %s', (p) =>
    expect(extractorFor(p)).toBe(goExtractor),
  );

  it.each([
    'a.rs',
    'a.gohtml',
    'a.tmpl',
    'go.mod',
    'go.sum',
    'a.md',
    'image.png',
    'a.tsbuildinfo',
    'a.pyc',
    'a.pyx',
    'a.csproj',
    'a.razor',
    'a.cshtml',
    'a.vb',
  ])('returns undefined for %s', (p) => expect(extractorFor(p)).toBeUndefined());
});

describe('symbolDelta', () => {
  it('returns empty delta for empty input', () => {
    expect(symbolDelta([])).toEqual({ added: [], removed: [], modified: [] });
  });

  it('skips files with no extractor', () => {
    const f = file({
      path: 'image.png',
      addedLines: ['export function foo() {}'], // would extract if ts, but png is skipped
    });
    expect(symbolDelta([f])).toEqual({ added: [], removed: [], modified: [] });
  });

  it('reports a pure addition', () => {
    const f = file({
      kind: 'add',
      addedLines: ['export function rotateRefreshToken() {}'],
    });
    expect(symbolDelta([f])).toEqual({
      added: [{ kind: 'function', name: 'rotateRefreshToken', exported: true, params: '' }],
      removed: [],
      modified: [],
    });
  });

  it('reports a pure removal', () => {
    const f = file({
      kind: 'delete',
      removedLines: ['export function parseLegacyToken(s: string) {}'],
    });
    expect(symbolDelta([f])).toEqual({
      added: [],
      removed: [
        { kind: 'function', name: 'parseLegacyToken', exported: true, params: 's: string' },
      ],
      modified: [],
    });
  });

  it('cancels a symbol whose params match (no false modified)', () => {
    const f = file({
      addedLines: ['export function rotate(token: string) {}', '  // body'],
      removedLines: ['export function rotate(token: string) {}', '  // body'],
    });
    expect(symbolDelta([f])).toEqual({ added: [], removed: [], modified: [] });
  });

  it('reports a signature change as modified, not added/removed', () => {
    const f = file({
      addedLines: ['export function rotate(token: string, ttl: number) {}'],
      removedLines: ['export function rotate(token: string) {}'],
    });
    expect(symbolDelta([f])).toEqual({
      added: [],
      removed: [],
      modified: [
        {
          from: { kind: 'function', name: 'rotate', exported: true, params: 'token: string' },
          to: {
            kind: 'function',
            name: 'rotate',
            exported: true,
            params: 'token: string, ttl: number',
          },
        },
      ],
    });
  });

  it('cancels across exported flip (private → public is a modification, not added/removed)', () => {
    const f = file({
      addedLines: ['export function foo() {}'],
      removedLines: ['function foo() {}'],
    });
    expect(symbolDelta([f])).toEqual({ added: [], removed: [], modified: [] });
  });

  it('does not put non-callable kinds in modified (no params on either side → cancel)', () => {
    const f = file({
      addedLines: ['export class Widget {}'],
      removedLines: ['export class Widget {}'],
    });
    expect(symbolDelta([f])).toEqual({ added: [], removed: [], modified: [] });
  });

  it('aggregates across multiple files', () => {
    const a = file({ path: 'src/a.ts', addedLines: ['export class A {}'] });
    const b = file({ path: 'src/b.ts', removedLines: ['export class B {}'] });
    expect(symbolDelta([a, b])).toEqual({
      added: [{ kind: 'class', name: 'A', exported: true }],
      removed: [{ kind: 'class', name: 'B', exported: true }],
      modified: [],
    });
  });

  it('aggregates modifications across multiple files', () => {
    const a = file({
      path: 'src/a.ts',
      addedLines: ['export function alpha(x: string, y: number) {}'],
      removedLines: ['export function alpha(x: string) {}'],
    });
    const b = file({
      path: 'src/b.ts',
      addedLines: ['export function beta(p: T) {}'],
      removedLines: ['export function beta() {}'],
    });
    const result = symbolDelta([a, b]);
    expect(result.added).toEqual([]);
    expect(result.removed).toEqual([]);
    expect(result.modified).toHaveLength(2);
    expect(result.modified.map((m) => m.to.name)).toEqual(['alpha', 'beta']);
  });

  it('preserves duplicates across files (no cross-file dedup)', () => {
    const a = file({ path: 'src/a.ts', addedLines: ['export function foo() {}'] });
    const b = file({ path: 'src/b.ts', addedLines: ['export function foo() {}'] });
    expect(symbolDelta([a, b]).added).toHaveLength(2);
  });
});
