import { describe, expect, it } from 'vitest';
import { detectBreaking } from '../src/analyze/breaking.js';
import type { CodeSymbol, SymbolDelta } from '../src/types.js';

function sym(name: string, partial: Partial<CodeSymbol> = {}): CodeSymbol {
  return { kind: 'function', name, exported: true, ...partial };
}

function delta(added: CodeSymbol[] = [], removed: CodeSymbol[] = []): SymbolDelta {
  return { added, removed };
}

describe('detectBreaking', () => {
  it('returns undefined when nothing was removed', () => {
    expect(detectBreaking(delta([sym('foo')], []))).toBeUndefined();
  });

  it('returns undefined when only non-exported symbols were removed', () => {
    expect(detectBreaking(delta([], [sym('foo', { exported: false })]))).toBeUndefined();
  });

  it('flags a single removed exported function', () => {
    expect(detectBreaking(delta([], [sym('rotateToken')]))).toBe('remove exported rotateToken');
  });

  it('flags a single removed exported class', () => {
    expect(detectBreaking(delta([], [sym('AuthError', { kind: 'class' })]))).toBe(
      'remove exported AuthError',
    );
  });

  it('describes a 1-for-1 same-kind swap as a rename', () => {
    expect(detectBreaking(delta([sym('rotate')], [sym('rotateToken')]))).toBe(
      'rename exported rotateToken to rotate',
    );
  });

  it('does not rename across kinds (function -> class stays a removal)', () => {
    expect(detectBreaking(delta([sym('Token', { kind: 'class' })], [sym('makeToken')]))).toBe(
      'remove exported makeToken',
    );
  });

  it('does not rename when there are unexported additions only', () => {
    expect(detectBreaking(delta([sym('replacement', { exported: false })], [sym('old')]))).toBe(
      'remove exported old',
    );
  });

  it('ignores non-exported removals when paired with exported removals', () => {
    expect(
      detectBreaking(delta([], [sym('keepInternal', { exported: false }), sym('publicGone')])),
    ).toBe('remove exported publicGone');
  });

  it('lists 2 removed exports comma-separated', () => {
    expect(detectBreaking(delta([], [sym('a'), sym('b')]))).toBe('remove exported a, b');
  });

  it('lists 3 removed exports comma-separated', () => {
    expect(detectBreaking(delta([], [sym('a'), sym('b'), sym('c')]))).toBe(
      'remove exported a, b, c',
    );
  });

  it('summarizes 4+ removed exports with "and N more"', () => {
    expect(detectBreaking(delta([], [sym('a'), sym('b'), sym('c'), sym('d'), sym('e')]))).toBe(
      'remove exported a, b, c, and 2 more',
    );
  });

  it('does not rename when both sides have more than 1 export', () => {
    expect(detectBreaking(delta([sym('a'), sym('b')], [sym('c'), sym('d')]))).toBe(
      'remove exported c, d',
    );
  });
});
