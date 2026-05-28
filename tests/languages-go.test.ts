import { describe, expect, it } from 'vitest';
import type { CodeSymbol } from '../src/types.js';
import { goExtractor } from '../src/languages/go.js';

describe('goExtractor', () => {
  describe('matches', () => {
    it.each(['a.go', 'main_test.go', 'pkg/foo/bar.go'])('matches %s', (p) =>
      expect(goExtractor.matches(p)).toBe(true),
    );
    it.each(['a.gohtml', 'a.tmpl', 'go.mod', 'go.sum', 'a.md', 'a'])('does not match %s', (p) =>
      expect(goExtractor.matches(p)).toBe(false),
    );
  });

  describe('extract', () => {
    it.each<{ name: string; line: string; expected: CodeSymbol }>([
      // function rows
      {
        name: 'exported function',
        line: 'func ProcessOrder(o Order) error {',
        expected: { kind: 'function', name: 'ProcessOrder', exported: true },
      },
      {
        name: 'unexported function',
        line: 'func parseToken(s string) (*Token, error) {',
        expected: { kind: 'function', name: 'parseToken', exported: false },
      },
      {
        name: 'generic function',
        line: 'func Map[T, U any](in []T, fn func(T) U) []U {',
        expected: { kind: 'function', name: 'Map', exported: true },
      },
      {
        name: 'no-arg function',
        line: 'func init() {',
        expected: { kind: 'function', name: 'init', exported: false },
      },
      // type rows (struct, interface, alias, named)
      {
        name: 'exported struct',
        line: 'type OrderHandler struct {',
        expected: { kind: 'class', name: 'OrderHandler', exported: true },
      },
      {
        name: 'unexported struct',
        line: 'type cache struct {',
        expected: { kind: 'class', name: 'cache', exported: false },
      },
      {
        name: 'generic struct',
        line: 'type Repository[T any] struct {',
        expected: { kind: 'class', name: 'Repository', exported: true },
      },
      {
        name: 'exported interface',
        line: 'type Reader interface {',
        expected: { kind: 'interface', name: 'Reader', exported: true },
      },
      {
        name: 'unexported iface',
        line: 'type closer interface {',
        expected: { kind: 'interface', name: 'closer', exported: false },
      },
      {
        name: 'type alias',
        line: 'type UserID = string',
        expected: { kind: 'type', name: 'UserID', exported: true },
      },
      {
        name: 'named primitive',
        line: 'type Status int',
        expected: { kind: 'type', name: 'Status', exported: true },
      },
      // const row
      {
        name: 'exported const',
        line: 'const MaxRetries = 3',
        expected: { kind: 'const', name: 'MaxRetries', exported: true },
      },
      {
        name: 'unexported const',
        line: 'const defaultTimeout = 5',
        expected: { kind: 'const', name: 'defaultTimeout', exported: false },
      },
    ])('extracts $name', ({ line, expected }) => {
      expect(goExtractor.extract([line])).toEqual([expected]);
    });

    it.each([
      '// func Hidden() {}', // commented
      'func (r *Repo) Get() error {', // method (receiver)
      'func (s Service) process() {', // method (value receiver)
      '    func Inner() {}', // indented (not column-0)
      'var Logger = log.New()', // var (excluded)
      'type (', // block opener
      'const (', // block opener
      'package api', // package decl
      'import "fmt"', // import
      'x := func() {}', // assignment, not declaration
    ])('does not extract %s', (line) => {
      expect(goExtractor.extract([line])).toEqual([]);
    });

    it('dedupes identical symbols within one call', () => {
      const lines = ['func Foo() {', 'func Foo() {'];
      expect(goExtractor.extract(lines)).toEqual([
        { kind: 'function', name: 'Foo', exported: true },
      ]);
    });

    it('preserves declaration order across lines', () => {
      expect(goExtractor.extract(['type A struct {', 'func B() {', 'const C = 1'])).toEqual([
        { kind: 'class', name: 'A', exported: true },
        { kind: 'function', name: 'B', exported: true },
        { kind: 'const', name: 'C', exported: true },
      ]);
    });

    it('struct row beats generic type row for the same name', () => {
      expect(goExtractor.extract(['type Foo struct {'])).toEqual([
        { kind: 'class', name: 'Foo', exported: true },
      ]);
    });

    it('interface row beats generic type row for the same name', () => {
      expect(goExtractor.extract(['type Foo interface {'])).toEqual([
        { kind: 'interface', name: 'Foo', exported: true },
      ]);
    });
  });
});
