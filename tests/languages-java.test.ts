import { describe, expect, it } from 'vitest';
import type { CodeSymbol } from '../src/types.js';
import { javaExtractor } from '../src/languages/java.js';

describe('javaExtractor', () => {
  describe('matches', () => {
    it.each(['Foo.java', 'a.java'])('matches %s', (p) =>
      expect(javaExtractor.matches(p)).toBe(true),
    );
    it.each(['a.jav', 'Foo.kt', 'Foo.scala', 'Foo.class', 'a.jsp', 'a.md', 'a'])(
      'does not match %s',
      (p) => expect(javaExtractor.matches(p)).toBe(false),
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
        name: 'public final class',
        line: 'public final class Repo {',
        expected: { kind: 'class', name: 'Repo', exported: true },
      },
      {
        name: 'public abstract class',
        line: 'public abstract class Base {',
        expected: { kind: 'class', name: 'Base', exported: true },
      },
      {
        name: 'public sealed class with permits',
        line: 'public sealed class Shape permits Circle, Square {',
        expected: { kind: 'class', name: 'Shape', exported: true },
      },
      {
        name: 'non-sealed class (hyphenated modifier)',
        line: 'public non-sealed class Square extends Shape {',
        expected: { kind: 'class', name: 'Square', exported: true },
      },
      {
        name: 'public class with bounded generic',
        line: 'public class Repository<T extends Comparable<T>> {',
        expected: { kind: 'class', name: 'Repository', exported: true },
      },
      {
        name: 'package-private class (no modifier)',
        line: 'class Helper {',
        expected: { kind: 'class', name: 'Helper', exported: false },
      },
      {
        name: 'private static nested class',
        line: '    private static class Inner {',
        expected: { kind: 'class', name: 'Inner', exported: false },
      },
      {
        name: 'indented public class',
        line: '    public class Nested {',
        expected: { kind: 'class', name: 'Nested', exported: true },
      },
      {
        name: 'public interface',
        line: 'public interface OrderService {',
        expected: { kind: 'interface', name: 'OrderService', exported: true },
      },
      {
        name: 'package-private interface',
        line: 'interface Helper {',
        expected: { kind: 'interface', name: 'Helper', exported: false },
      },
      {
        name: 'public annotation type (@interface)',
        line: 'public @interface Audited {',
        expected: { kind: 'interface', name: 'Audited', exported: true },
      },
      {
        name: 'package-private annotation type',
        line: '@interface Marker {',
        expected: { kind: 'interface', name: 'Marker', exported: false },
      },
      {
        name: 'public enum',
        line: 'public enum OrderStatus {',
        expected: { kind: 'type', name: 'OrderStatus', exported: true },
      },
      {
        name: 'public record (positional)',
        line: 'public record Dto(int id, String name) {}',
        expected: { kind: 'class', name: 'Dto', exported: true },
      },
      {
        name: 'package-private record',
        line: 'record Pair(int a, int b) {}',
        expected: { kind: 'class', name: 'Pair', exported: false },
      },
    ])('extracts $name', ({ line, expected }) => {
      expect(javaExtractor.extract([line])).toEqual([expected]);
    });

    it.each([
      '// public class Foo',
      ' * public class Foo (in javadoc)',
      'public void getCount() {',
      'public String getName() {',
      'public String name;',
      'private static final int MAX_RETRIES = 10;',
      'package com.foo;',
      'import java.util.List;',
      'import static java.util.Collections.emptyList;',
      '@Override',
    ])('does not extract %s', (line) => {
      expect(javaExtractor.extract([line])).toEqual([]);
    });

    it('dedupes identical symbols within one call', () => {
      const lines = ['public class Foo {', 'public class Foo {'];
      expect(javaExtractor.extract(lines)).toEqual([
        { kind: 'class', name: 'Foo', exported: true },
      ]);
    });

    it('preserves declaration order across lines', () => {
      expect(javaExtractor.extract(['public class A {', 'public class B {'])).toEqual([
        { kind: 'class', name: 'A', exported: true },
        { kind: 'class', name: 'B', exported: true },
      ]);
    });

    it('extracts both outer and nested public types', () => {
      expect(javaExtractor.extract(['public class Outer {', '    public class Inner {'])).toEqual([
        { kind: 'class', name: 'Outer', exported: true },
        { kind: 'class', name: 'Inner', exported: true },
      ]);
    });

    it('does not set params on any kind (java has no top-level callables)', () => {
      const lines = [
        'public class Foo {',
        'public interface Bar {',
        'public enum Status {',
        'public record Dto(int id, String name) {}',
        'public @interface Audited {',
      ];
      const result = javaExtractor.extract(lines);
      expect(result).toHaveLength(5);
      for (const sym of result) {
        expect(sym.params).toBeUndefined();
      }
    });

    it('does not confuse @interface with interface', () => {
      expect(javaExtractor.extract(['public @interface Audited {'])).toEqual([
        { kind: 'interface', name: 'Audited', exported: true },
      ]);
    });
  });
});
