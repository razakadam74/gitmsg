import { describe, expect, it } from 'vitest';
import type { FileChange } from '../src/types.js';
import { detectScope } from '../src/analyze/scope.js';

function file(path: string, partial: Partial<FileChange> = {}): FileChange {
  return {
    path,
    kind: 'modify',
    addedLines: [],
    removedLines: [],
    ...partial,
  };
}

describe('detectScope', () => {
  it.each<{ name: string; files: FileChange[]; expected: string | undefined }>([
    { name: 'empty diff -> undefined', files: [], expected: undefined },
    {
      name: 'monorepo single package -> package name',
      files: [file('packages/ui/src/Button.tsx'), file('packages/ui/src/Card.tsx')],
      expected: 'ui',
    },
    {
      name: 'monorepo mixed packages -> undefined',
      files: [file('packages/ui/x.ts'), file('packages/api/y.ts')],
      expected: undefined,
    },
    {
      name: 'src-stripped shared segment -> that segment',
      files: [file('src/auth/jwt.ts'), file('src/auth/middleware.ts')],
      expected: 'auth',
    },
    {
      name: 'no shared segment after strip -> undefined',
      files: [file('src/auth/x.ts'), file('src/billing/y.ts')],
      expected: undefined,
    },
    {
      name: 'single root file (README.md) -> undefined',
      files: [file('README.md')],
      expected: undefined,
    },
    {
      name: 'first segment is noise (tests) -> undefined',
      files: [file('tests/foo.test.ts'), file('tests/bar.test.ts')],
      expected: undefined,
    },
    {
      name: 'first segment is monorepo root only -> undefined',
      files: [file('packages/README.md')],
      expected: undefined,
    },
    {
      name: 'frequency: 3-of-4 cluster wins despite README straggler',
      files: [
        file('src/auth/jwt.ts'),
        file('src/auth/middleware.ts'),
        file('src/auth/utils.ts'),
        file('README.md'),
      ],
      expected: 'auth',
    },
    {
      name: 'frequency: 2-of-4 at exactly 50% floor -> auth',
      files: [
        file('src/auth/x.ts'),
        file('src/auth/y.ts'),
        file('src/billing/a.ts'),
        file('src/inventory/b.ts'),
      ],
      expected: 'auth',
    },
    {
      name: 'frequency: exact tie 2/2 -> undefined',
      files: [
        file('src/auth/x.ts'),
        file('src/auth/y.ts'),
        file('src/billing/a.ts'),
        file('src/billing/b.ts'),
      ],
      expected: undefined,
    },
    {
      name: 'frequency: dominant noise segment -> undefined (noise filter wins)',
      files: [
        file('tests/a.test.ts'),
        file('tests/b.test.ts'),
        file('tests/c.test.ts'),
        file('src/auth/jwt.ts'),
      ],
      expected: undefined,
    },
    {
      name: 'PR #45 dogfood repro: docs-heavy mixed-root diff -> undefined (not feat(scope))',
      files: [
        file('docs/demo.tape'),
        file('docs/demo.gif'),
        file('README.md'),
        file('CONTRIBUTING.md'),
        file('.prettierignore'),
      ],
      expected: undefined,
    },
  ])('$name', ({ files, expected }) => {
    expect(detectScope(files)).toBe(expected);
  });

  it('does not pick rung 3 when rung 2 already fires (regression guard)', () => {
    const files = [file('src/auth/x.ts'), file('src/auth/y.ts')];
    expect(detectScope(files)).toBe('auth');
  });
});
