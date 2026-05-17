import { describe, expect, it } from 'vitest';
import type { CodeSymbol } from '../src/types.js';
import { tsExtractor } from '../src/languages/ts.js';

describe('tsExtractor', () => {
  describe('matches', () => {
    it.each(['a.ts', 'a.tsx', 'a.js', 'a.jsx', 'a.mjs', 'a.cjs'])('matches %s', (p) =>
      expect(tsExtractor.matches(p)).toBe(true),
    );
    it.each(['a.py', 'a.tsbuildinfo', 'a.md', 'a', 'a.cs', 'a.ps1'])('does not match %s', (p) =>
      expect(tsExtractor.matches(p)).toBe(false),
    );
  });

  describe('extract', () => {
    it.each<{ name: string; line: string; expected: CodeSymbol }>([
      {
        name: 'export default function',
        line: 'export default function foo() {}',
        expected: { kind: 'function', name: 'foo', exported: true },
      },
      {
        name: 'export function',
        line: 'export function bar(a: T) {}',
        expected: { kind: 'function', name: 'bar', exported: true },
      },
      {
        name: 'export async function',
        line: 'export async function baz() {}',
        expected: { kind: 'function', name: 'baz', exported: true },
      },
      {
        name: 'export class',
        line: 'export class Widget {}',
        expected: { kind: 'class', name: 'Widget', exported: true },
      },
      {
        name: 'export abstract class',
        line: 'export abstract class Base {}',
        expected: { kind: 'class', name: 'Base', exported: true },
      },
      {
        name: 'export interface',
        line: 'export interface Options {}',
        expected: { kind: 'interface', name: 'Options', exported: true },
      },
      {
        name: 'export type alias',
        line: 'export type ID = string;',
        expected: { kind: 'type', name: 'ID', exported: true },
      },
      {
        name: 'export const',
        line: 'export const VERSION = "1";',
        expected: { kind: 'const', name: 'VERSION', exported: true },
      },
      {
        name: 'private function',
        line: 'function helper() {}',
        expected: { kind: 'function', name: 'helper', exported: false },
      },
      {
        name: 'private class',
        line: 'class Internal {}',
        expected: { kind: 'class', name: 'Internal', exported: false },
      },
    ])('extracts $name', ({ line, expected }) => {
      expect(tsExtractor.extract([line])).toEqual([expected]);
    });

    it('dedupes identical symbols within one call', () => {
      const lines = ['export function foo() {}', 'export function foo() {}'];
      expect(tsExtractor.extract(lines)).toEqual([
        { kind: 'function', name: 'foo', exported: true },
      ]);
    });

    it('returns empty for non-declaration lines', () => {
      expect(tsExtractor.extract(['  return 42;', '// a comment'])).toEqual([]);
    });
    it('preserves declaration order across lines', () => {
      expect(tsExtractor.extract(['export class A {}', 'export class B {}'])).toEqual([
        { kind: 'class', name: 'A', exported: true },
        { kind: 'class', name: 'B', exported: true },
      ]);
    });
  });
});
