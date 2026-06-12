import { describe, expect, it } from 'vitest';
import type { CodeSymbol } from '../src/types.js';
import { rustExtractor } from '../src/languages/rust.js';

describe('rustExtractor', () => {
  describe('matches', () => {
    it.each(['lib.rs', 'src/main.rs', 'a.rs', 'crates/core/src/parser.rs'])('matches %s', (p) =>
      expect(rustExtractor.matches(p)).toBe(true),
    );
    it.each(['a.rss', 'Cargo.toml', 'a.rlib', 'a.md', 'a', 'main.go'])('does not match %s', (p) =>
      expect(rustExtractor.matches(p)).toBe(false),
    );
  });

  describe('extract', () => {
    it.each<{ name: string; line: string; expected: CodeSymbol }>([
      {
        name: 'pub fn',
        line: 'pub fn tokenize(src: &str) -> Vec<Token> {',
        expected: { kind: 'function', name: 'tokenize', exported: true, params: 'src: &str' },
      },
      {
        name: 'private fn',
        line: 'fn helper() {',
        expected: { kind: 'function', name: 'helper', exported: false, params: '' },
      },
      {
        name: 'pub async fn',
        line: 'pub async fn fetch(url: &str) {',
        expected: { kind: 'function', name: 'fetch', exported: true, params: 'url: &str' },
      },
      {
        name: 'pub unsafe fn',
        line: 'pub unsafe fn raw() {',
        expected: { kind: 'function', name: 'raw', exported: true, params: '' },
      },
      {
        name: 'pub extern "C" fn',
        line: 'pub extern "C" fn ffi() {',
        expected: { kind: 'function', name: 'ffi', exported: true, params: '' },
      },
      {
        name: 'pub fn with generic',
        line: 'pub fn map<T>(items: Vec<T>) -> Vec<T> {',
        expected: { kind: 'function', name: 'map', exported: true, params: 'items: Vec<T>' },
      },
      {
        name: 'pub struct',
        line: 'pub struct Lexer {',
        expected: { kind: 'class', name: 'Lexer', exported: true },
      },
      {
        name: 'pub tuple struct',
        line: 'pub struct Point(i32, i32);',
        expected: { kind: 'class', name: 'Point', exported: true },
      },
      {
        name: 'private struct',
        line: 'struct Inner {',
        expected: { kind: 'class', name: 'Inner', exported: false },
      },
      {
        name: 'pub enum',
        line: 'pub enum Token {',
        expected: { kind: 'type', name: 'Token', exported: true },
      },
      {
        name: 'pub trait',
        line: 'pub trait Visitor {',
        expected: { kind: 'interface', name: 'Visitor', exported: true },
      },
      {
        name: 'pub unsafe trait',
        line: 'pub unsafe trait Sync {',
        expected: { kind: 'interface', name: 'Sync', exported: true },
      },
      {
        name: 'private trait',
        line: 'trait Helper {',
        expected: { kind: 'interface', name: 'Helper', exported: false },
      },
      {
        name: 'pub type alias',
        line: 'pub type NodeId = usize;',
        expected: { kind: 'type', name: 'NodeId', exported: true },
      },
      {
        name: 'pub const',
        line: 'pub const MAX_TOKENS: usize = 1024;',
        expected: { kind: 'const', name: 'MAX_TOKENS', exported: true },
      },
      {
        name: 'private const',
        line: 'const BUF: usize = 8;',
        expected: { kind: 'const', name: 'BUF', exported: false },
      },
    ])('extracts $name', ({ line, expected }) => {
      expect(rustExtractor.extract([line])).toEqual([expected]);
    });

    it.each([
      '// pub fn commented() {',
      '/// pub fn doc() {',
      'let x = 5;',
      'use std::collections::HashMap;',
      'mod parser;',
      'impl Lexer {',
      '#[derive(Debug)]',
      'macro_rules! vec_of {',
      'static GLOBAL: u32 = 0;',
      'union MyUnion {',
    ])('does not extract %s', (line) => {
      expect(rustExtractor.extract([line])).toEqual([]);
    });

    it('does not extract indented declarations (methods in impl/trait blocks)', () => {
      expect(rustExtractor.extract(['    pub fn method(&self) {', '    fn helper() {'])).toEqual(
        [],
      );
    });

    it('treats `const fn` as a function, not a const (row order)', () => {
      expect(rustExtractor.extract(['pub const fn floor(x: f64) -> f64 {'])).toEqual([
        { kind: 'function', name: 'floor', exported: true, params: 'x: f64' },
      ]);
    });

    it('treats `const NAME:` as a const', () => {
      expect(rustExtractor.extract(['pub const MAX: usize = 1;'])).toEqual([
        { kind: 'const', name: 'MAX', exported: true },
      ]);
    });

    it('treats pub(crate) as not exported', () => {
      expect(rustExtractor.extract(['pub(crate) struct Internal {'])).toEqual([
        { kind: 'class', name: 'Internal', exported: false },
      ]);
    });

    it('treats pub(super) as not exported', () => {
      expect(rustExtractor.extract(['pub(super) enum Mode {'])).toEqual([
        { kind: 'type', name: 'Mode', exported: false },
      ]);
    });

    it('blind spot: pub(crate) fn params capture the visibility paren, not the args', () => {
      expect(rustExtractor.extract(['pub(crate) fn internal(a: i32) {'])).toEqual([
        { kind: 'function', name: 'internal', exported: false, params: 'crate' },
      ]);
    });

    it('dedupes identical symbols within one call', () => {
      const lines = ['pub struct Foo {', 'pub struct Foo {'];
      expect(rustExtractor.extract(lines)).toEqual([
        { kind: 'class', name: 'Foo', exported: true },
      ]);
    });

    it('preserves declaration order across lines', () => {
      expect(rustExtractor.extract(['pub struct A {', 'pub struct B {'])).toEqual([
        { kind: 'class', name: 'A', exported: true },
        { kind: 'class', name: 'B', exported: true },
      ]);
    });

    it('sets params on fn but not on type-definition kinds', () => {
      const lines = [
        'pub fn run(cfg: Config) {',
        'pub struct S {',
        'pub enum E {',
        'pub trait T {',
        'pub type A = u8;',
        'pub const C: u8 = 1;',
      ];
      const result = rustExtractor.extract(lines);
      expect(result).toHaveLength(6);
      expect(result.find((s) => s.name === 'run')?.params).toBe('cfg: Config');
      for (const sym of result.filter((s) => s.name !== 'run')) {
        expect(sym.params).toBeUndefined();
      }
    });
  });
});
