import { describe, expect, it } from 'vitest';
import type { LanguageExtractor } from '../src/types.js';
import { csExtractor } from '../src/languages/cs.js';
import { goExtractor } from '../src/languages/go.js';
import { javaExtractor } from '../src/languages/java.js';
import { pyExtractor } from '../src/languages/py.js';
import { rustExtractor } from '../src/languages/rust.js';
import { tsExtractor } from '../src/languages/ts.js';

const allCases: Array<{ name: string; ex: LanguageExtractor; classLine: string }> = [
  { name: 'ts', ex: tsExtractor, classLine: 'export class Foo {}' },
  { name: 'py', ex: pyExtractor, classLine: 'class Foo:' },
  { name: 'cs', ex: csExtractor, classLine: 'public class Foo {}' },
  { name: 'go', ex: goExtractor, classLine: 'type Foo struct {}' },
  { name: 'java', ex: javaExtractor, classLine: 'public class Foo {}' },
  { name: 'rust', ex: rustExtractor, classLine: 'pub struct Foo {}' },
];

const callableCases: Array<{
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
  {
    name: 'rust',
    ex: rustExtractor,
    classLine: 'pub struct Foo {}',
    callLine: 'pub fn bar() {}',
  },
];

describe('Language contract — all extractors', () => {
  it.each(allCases)('$name extracts a class-like kind from classLine', ({ ex, classLine }) => {
    const [sym] = ex.extract([classLine]);
    expect(sym).toBeDefined();
    expect(['class', 'interface', 'type']).toContain(sym!.kind);
  });

  it.each(allCases)('$name de-duplicates symbols', ({ ex, classLine }) => {
    const syms = ex.extract([classLine, classLine]);
    expect(syms).toHaveLength(1);
  });

  it.each(allCases)('$name empty input -> empty output', ({ ex }) => {
    const syms = ex.extract([]);
    expect(syms).toEqual([]);
  });

  it.each(allCases)('$name non-callable class-like has no params', ({ ex, classLine }) => {
    const [sym] = ex.extract([classLine]);
    expect(sym).toBeDefined();
    expect(sym!.params).toBeUndefined();
  });
});

describe('Language contract — extractors with top-level callables', () => {
  it.each(callableCases)('$name extracts a callable kind from callLine', ({ ex, callLine }) => {
    const [sym] = ex.extract([callLine]);
    expect(sym).toBeDefined();
    expect(['function', 'type']).toContain(sym!.kind);
  });

  it.each(callableCases)(
    '$name preserves declaration order across class + callable',
    ({ ex, classLine, callLine }) => {
      const syms = ex.extract([classLine, callLine]);
      expect(syms).toHaveLength(2);
      expect(['class', 'type']).toContain(syms[0].kind);
      expect(['function', 'type']).toContain(syms[1].kind);
    },
  );

  it.each(callableCases)('$name callable with no args has params === ""', ({ ex, callLine }) => {
    const [sym] = ex.extract([callLine]);
    expect(sym).toBeDefined();
    expect(sym!.params).toBe('');
  });
});
