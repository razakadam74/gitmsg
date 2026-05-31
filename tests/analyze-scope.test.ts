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

describe('detectScope rung 4 — signal-only intersection', () => {
  it.each<{ name: string; paths: string[]; expected: string | undefined }>([
    {
      name: 'W19 case: src/languages cluster outvoted by tests+docs+changeset',
      paths: [
        'src/languages/go.ts',
        'src/languages/index.ts',
        'tests/languages-go.test.ts',
        'tests/languages-index.test.ts',
        'tests/fixtures/feat-go-handler.diff',
        'tests/fixtures/feat-go-handler.expected.txt',
        'docs/languages/go.md',
        'docs/heuristics.md',
        '.changeset/add-go-language-extractor.md',
      ],
      expected: 'languages',
    },
    {
      name: '1 src + 3 tests -> undefined (single-signal-file guard)',
      paths: ['src/auth/login.ts', 'tests/auth.test.ts', 'tests/foo.test.ts', 'tests/bar.test.ts'],
      expected: undefined,
    },
    {
      name: '2 src/auth + 2 src/billing + 5 tests -> undefined (no agreement between signals)',
      paths: [
        'src/auth/login.ts',
        'src/auth/signup.ts',
        'src/billing/charge.ts',
        'src/billing/refund.ts',
        'tests/a.test.ts',
        'tests/b.test.ts',
        'tests/c.test.ts',
        'tests/d.test.ts',
        'tests/e.test.ts',
      ],
      expected: undefined,
    },
    {
      name: 'docs-only PR -> undefined (no signal survivors)',
      paths: ['docs/a.md', 'docs/b.md', 'docs/c.md'],
      expected: undefined,
    },
    {
      name: 'all root-level files -> undefined (no signal survivors)',
      paths: ['README.md', 'CONTRIBUTING.md', '.prettierignore'],
      expected: undefined,
    },
    {
      name: '.changeset alone -> undefined (noise-set pin)',
      paths: ['.changeset/foo.md', '.changeset/bar.md'],
      expected: undefined,
    },
  ])('$name', ({ paths, expected }) => {
    const files = paths.map((p) => file(p));
    expect(detectScope(files)).toBe(expected);
  });

  it('rung 2 fires before rung 4 on a clean 2-file shared-segment diff (precedence guard)', () => {
    // No noise files at all -> rung 2 catches it; rung 4 would have agreed but rung 2 is stricter.
    const files = [file('src/auth/login.ts'), file('src/auth/signup.ts')];
    expect(detectScope(files)).toBe('auth');
  });
});
