import { describe, expect, it } from 'vitest';
import { detectBreaking } from '../src/analyze/breaking.js';
import type { CodeSymbol, ModifiedSymbol, SymbolDelta } from '../src/types.js';

function sym(name: string, partial: Partial<CodeSymbol> = {}): CodeSymbol {
  return { kind: 'function', name, exported: true, ...partial };
}

function mod(
  name: string,
  fromParams: string,
  toParams: string,
  partial: Partial<CodeSymbol> = {},
): ModifiedSymbol {
  return {
    from: { kind: 'function', name, exported: true, params: fromParams, ...partial },
    to: { kind: 'function', name, exported: true, params: toParams, ...partial },
  };
}

function delta(
  added: CodeSymbol[] = [],
  removed: CodeSymbol[] = [],
  modified: ModifiedSymbol[] = [],
): SymbolDelta {
  return { added, removed, modified };
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

  describe('signature changes (rule 3)', () => {
    it('flags a single signature change on an exported function', () => {
      expect(
        detectBreaking(
          delta([], [], [mod('rotate', 'token: string', 'token: string, ttl: number')]),
        ),
      ).toBe('signature of exported rotate changed');
    });

    it('ignores signature changes on non-exported functions', () => {
      const m = mod('helper', 'a: string', 'a: string, b: number', { exported: false });
      expect(detectBreaking(delta([], [], [m]))).toBeUndefined();
    });

    it('requires both sides to be exported', () => {
      const m: ModifiedSymbol = {
        from: { kind: 'function', name: 'foo', exported: false, params: 'a' },
        to: { kind: 'function', name: 'foo', exported: true, params: 'a, b' },
      };
      expect(detectBreaking(delta([], [], [m]))).toBeUndefined();
    });

    it('lists 2 signature changes comma-separated', () => {
      expect(detectBreaking(delta([], [], [mod('a', 'x', 'x, y'), mod('b', 'p', 'p, q')]))).toBe(
        'signature of exported a, b changed',
      );
    });

    it('lists 3 signature changes comma-separated', () => {
      expect(
        detectBreaking(
          delta([], [], [mod('a', 'x', 'x, y'), mod('b', 'p', 'p, q'), mod('c', 'm', 'm, n')]),
        ),
      ).toBe('signature of exported a, b, c changed');
    });

    it('summarizes 4+ signature changes with "and N more"', () => {
      expect(
        detectBreaking(
          delta(
            [],
            [],
            [
              mod('a', 'x', 'x, y'),
              mod('b', 'p', 'p, q'),
              mod('c', 'm', 'm, n'),
              mod('d', 's', 's, t'),
              mod('e', 'u', 'u, v'),
            ],
          ),
        ),
      ).toBe('signature of exported a, b, c, and 2 more changed');
    });

    it('rule 1 (removal) takes precedence over rule 3 (signature) when both apply', () => {
      expect(detectBreaking(delta([], [sym('gone')], [mod('changed', 'x', 'x, y')]))).toBe(
        'remove exported gone',
      );
    });

    it('returns undefined when modified bucket is empty and nothing was removed', () => {
      expect(detectBreaking(delta([sym('foo')], [], []))).toBeUndefined();
    });

    it('skips non-exported sig changes but still flags exported ones in same delta', () => {
      const exportedChange = mod('publicFn', 'a', 'a, b');
      const internalChange = mod('helper', 'x', 'x, y', { exported: false });
      expect(detectBreaking(delta([], [], [internalChange, exportedChange]))).toBe(
        'signature of exported publicFn changed',
      );
    });
  });
});
