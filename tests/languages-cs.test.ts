import { describe, expect, it } from 'vitest';
import type { CodeSymbol } from '../src/types.js';
import { csExtractor } from '../src/languages/cs.js';

describe('csExtractor', () => {
  describe('matches', () => {
    it.each(['a.cs', 'a.csx'])('matches %s', (p) => expect(csExtractor.matches(p)).toBe(true));
    it.each(['a.razor', 'a.cshtml', 'a.vb', 'a.csproj', 'a.md', 'a'])('does not match %s', (p) =>
      expect(csExtractor.matches(p)).toBe(false),
    );
  });

  describe('extract', () => {
    it.each<{ name: string; line: string; expected: CodeSymbol }>([
      {
        name: 'public class',
        line: 'public class OrderService {',
        expected: { kind: 'class', name: 'OrderService', exported: true },
      },
      {
        name: 'public sealed partial class with generic',
        line: 'public sealed partial class Repository<T> where T : new()',
        expected: { kind: 'class', name: 'Repository', exported: true },
      },
      {
        name: 'internal class',
        line: 'internal class Helper {',
        expected: { kind: 'class', name: 'Helper', exported: false },
      },
      {
        name: 'no-modifier class (defaults to internal)',
        line: 'class Anonymous {',
        expected: { kind: 'class', name: 'Anonymous', exported: false },
      },
      {
        name: 'indented public class (inside namespace block)',
        line: '    public class Nested {',
        expected: { kind: 'class', name: 'Nested', exported: true },
      },
      {
        name: 'public interface',
        line: 'public interface IOrderService {',
        expected: { kind: 'interface', name: 'IOrderService', exported: true },
      },
      {
        name: 'public struct',
        line: 'public struct Point {',
        expected: { kind: 'class', name: 'Point', exported: true },
      },
      {
        name: 'public record (positional)',
        line: 'public record Dto(int Id, string Name);',
        expected: { kind: 'class', name: 'Dto', exported: true },
      },
      {
        name: 'public record class',
        line: 'public record class Customer { }',
        expected: { kind: 'class', name: 'Customer', exported: true },
      },
      {
        name: 'public enum',
        line: 'public enum OrderStatus {',
        expected: { kind: 'type', name: 'OrderStatus', exported: true },
      },
      {
        name: 'public delegate (simple return)',
        line: 'public delegate int Handler(string s);',
        expected: { kind: 'type', name: 'Handler', exported: true },
      },
      {
        name: 'public delegate (generic return type)',
        line: 'public delegate Task<List<Foo>> AsyncProcessor(int id);',
        expected: { kind: 'type', name: 'AsyncProcessor', exported: true },
      },
      {
        name: 'public generic delegate',
        line: 'public delegate T Mapper<T, U>(U input);',
        expected: { kind: 'type', name: 'Mapper', exported: true },
      },
    ])('extracts $name', ({ line, expected }) => {
      expect(csExtractor.extract([line])).toEqual([expected]);
    });

    it.each([
      '// public class Foo',
      'public Task<int> GetCountAsync() {',
      'public string Name { get; set; }',
      'public const int MAX_RETRIES = 10;',
      'namespace Foo.Bar;',
      'using System.Linq;',
      'var d = delegate(int x) { return x; };',
    ])('does not extract %s', (line) => {
      expect(csExtractor.extract([line])).toEqual([]);
    });

    it('dedupes identical symbols within one call', () => {
      const lines = ['public class Foo {', 'public class Foo {'];
      expect(csExtractor.extract(lines)).toEqual([{ kind: 'class', name: 'Foo', exported: true }]);
    });

    it('preserves declaration order across lines', () => {
      expect(csExtractor.extract(['public class A {', 'public class B {'])).toEqual([
        { kind: 'class', name: 'A', exported: true },
        { kind: 'class', name: 'B', exported: true },
      ]);
    });

    it('extracts both outer and nested public types', () => {
      expect(csExtractor.extract(['public class Outer {', '    public class Inner {'])).toEqual([
        { kind: 'class', name: 'Outer', exported: true },
        { kind: 'class', name: 'Inner', exported: true },
      ]);
    });
  });
});
