import { describe, expect, it } from 'vitest';
import type { CodeSymbol } from '../src/types.js';
import { pyExtractor } from '../src/languages/py.js';

describe('pyExtractor', () => {
  describe('matches', () => {
    it.each(['a.py', 'a.pyi'])('matches %s', (p) => expect(pyExtractor.matches(p)).toBe(true));
    it.each(['a.ts', 'a.pyc', 'a.pyx', 'a.md', 'a'])('does not match %s', (p) =>
      expect(pyExtractor.matches(p)).toBe(false),
    );
  });

  describe('extract', () => {
    it.each<{ name: string; line: string; expected: CodeSymbol }>([
      {
        name: 'def',
        line: 'def foo():',
        expected: { kind: 'function', name: 'foo', exported: true },
      },
      {
        name: 'async def',
        line: 'async def fetch():',
        expected: { kind: 'function', name: 'fetch', exported: true },
      },
      {
        name: 'private def',
        line: 'def _helper():',
        expected: { kind: 'function', name: '_helper', exported: false },
      },
      {
        name: 'dunder def',
        line: 'def __init__(self):',
        expected: { kind: 'function', name: '__init__', exported: false },
      },
      {
        name: 'class',
        line: 'class Widget:',
        expected: { kind: 'class', name: 'Widget', exported: true },
      },
      {
        name: 'class with base',
        line: 'class Widget(Base):',
        expected: { kind: 'class', name: 'Widget', exported: true },
      },
      {
        name: 'private class',
        line: 'class _Cache:',
        expected: { kind: 'class', name: '_Cache', exported: false },
      },
      {
        name: 'UPPER_SNAKE const',
        line: 'MAX_RETRIES = 3',
        expected: { kind: 'const', name: 'MAX_RETRIES', exported: true },
      },
      {
        name: 'multi-word UPPER_SNAKE',
        line: 'TWO_WORDS_OK = "x"',
        expected: { kind: 'const', name: 'TWO_WORDS_OK', exported: true },
      },
    ])('extracts $name', ({ line, expected }) => {
      expect(pyExtractor.extract([line])).toEqual([expected]);
    });

    it.each([
      'cache = {}',
      '    def method(self):',
      '    class Inner:',
      'N = 10',
      '@dataclass',
      '# def foo():',
      'foo()',
    ])('does not extract %s', (line) => {
      expect(pyExtractor.extract([line])).toEqual([]);
    });

    it('dedupes identical symbols within one call', () => {
      const lines = ['def foo():', 'def foo():'];
      expect(pyExtractor.extract(lines)).toEqual([
        { kind: 'function', name: 'foo', exported: true },
      ]);
    });

    it('preserves declaration order across lines', () => {
      expect(pyExtractor.extract(['class A:', 'class B:'])).toEqual([
        { kind: 'class', name: 'A', exported: true },
        { kind: 'class', name: 'B', exported: true },
      ]);
    });

    it('extracts the def, not the decorator', () => {
      expect(pyExtractor.extract(['@dataclass', 'class Point:'])).toEqual([
        { kind: 'class', name: 'Point', exported: true },
      ]);
    });
  });
});
