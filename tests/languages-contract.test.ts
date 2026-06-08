import { describe, expect, it } from 'vitest';
import type { LanguageExtractor } from '../src/types.js';
import { csExtractor } from '../src/languages/cs.js';
import { goExtractor } from '../src/languages/go.js';
import { pyExtractor } from '../src/languages/py.js';
import { tsExtractor } from '../src/languages/ts.js';

const cases: Array<{
  name: string;
  ex: LanguageExtractor;
  classLine: string;
  callLine: string;
}> = [
  {
    name: 'ts',
    ex: tsExtractor,
    classLine: 'export class Foo {}',
    callLine: 'export function bar() {}',
  },
  { name: 'py', ex: pyExtractor, classLine: 'class Foo:', callLine: 'def bar():' },
  {
    name: 'cs',
    ex: csExtractor,
    classLine: 'public class Foo {}',
    callLine: 'public delegate int Bar();',
  },
  { name: 'go', ex: goExtractor, classLine: 'type Foo struct {}', callLine: 'func Bar() {}' },
];

describe('Language contract', () => {
  it.each(cases)('$name extracts a class-like kind from classLine', ({ ex, classLine }) => {
    const [sym] = ex.extract([classLine]);
    expect(sym).toBeDefined();
    expect(['class', 'interface', 'type']).toContain(sym!.kind);
  });

  it.each(cases)('$name extracts a callable kind from callLine', ({ ex, callLine }) => {
    const [sym] = ex.extract([callLine]);
    expect(sym).toBeDefined();
    expect(['function', 'type']).toContain(sym!.kind);
  });

  it.each(cases)('$name de-duplicates symbols', ({ ex, classLine }) => {
    const syms = ex.extract([classLine, classLine]);
    expect(syms).toHaveLength(1);
  });

  it.each(cases)('$name order preserves', ({ ex, classLine, callLine }) => {
    const syms = ex.extract([classLine, callLine]);
    expect(syms).toHaveLength(2);
    expect(['class', 'type']).toContain(syms[0].kind);
    expect(['function', 'type']).toContain(syms[1].kind);
  });

  it.each(cases)('$name empty input -> empty output', ({ ex }) => {
    const syms = ex.extract([]);
    expect(syms).toEqual([]);
  });

  it.each(cases)('$name callable with no args has params === ""', ({ ex, callLine }) => {
    const [sym] = ex.extract([callLine]);
    expect(sym).toBeDefined();
    expect(sym!.params).toBe('');
  });

  it.each(cases)('$name non-callable class-like has no params', ({ ex, classLine }) => {
    const [sym] = ex.extract([classLine]);
    expect(sym).toBeDefined();
    expect(sym!.params).toBeUndefined();
  });
});
