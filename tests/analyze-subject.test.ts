import { describe, expect, it } from 'vitest';
import type { CodeSymbol, FileChange, SymbolKind } from '../src/types.js';
import { detectSubject, type SubjectInput } from '../src/analyze/subject.js';

const file = (overrides: Partial<FileChange> = {}): FileChange => ({
  path: 'src/a.ts',
  kind: 'modify',
  addedLines: [],
  removedLines: [],
  ...overrides,
});

const sym = (name: string, kind: SymbolKind = 'function', exported = true): CodeSymbol => ({
  kind,
  name,
  exported,
});

const subject = (overrides: Partial<SubjectInput> = {}): SubjectInput => ({
  type: 'feat',
  files: [file()],
  symbols: { added: [], removed: [], modified: [] },
  ...overrides,
});

describe('detectSubject — empty', () => {
  it('returns "empty commit" when no files', () => {
    expect(detectSubject(subject({ files: [] }))).toBe('empty commit');
  });
});

describe('detectSubject — docs', () => {
  it.each([
    ['README.md', 'update README'],
    ['docs/README.md', 'update README'],
    ['CHANGELOG.md', 'update changelog'],
    ['CONTRIBUTING.md', 'update contributing guide'],
    ['docs/architecture.md', 'update architecture docs'],
  ])('single docs file %s → %s', (path, expected) => {
    expect(detectSubject(subject({ type: 'docs', files: [file({ path })] }))).toBe(expected);
  });

  it('returns "update docs" for multi-file docs', () => {
    expect(
      detectSubject(
        subject({
          type: 'docs',
          files: [file({ path: 'README.md' }), file({ path: 'CHANGELOG.md' })],
        }),
      ),
    ).toBe('update docs');
  });
});

describe('detectSubject — test', () => {
  it('names the subject under test when all files share one', () => {
    expect(
      detectSubject(
        subject({
          type: 'test',
          files: [file({ path: 'src/auth.test.ts' }), file({ path: '__tests__/auth.spec.ts' })],
        }),
      ),
    ).toBe('add tests for auth');
  });

  it('strips both .test/.spec suffix and test- prefix', () => {
    expect(
      detectSubject(
        subject({ type: 'test', files: [file({ path: 'test-router.ts', kind: 'add' })] }),
      ),
    ).toBe('add tests for router');
  });

  it('returns "add tests" for multi-subject with at least one add', () => {
    expect(
      detectSubject(
        subject({
          type: 'test',
          files: [file({ path: 'auth.test.ts', kind: 'add' }), file({ path: 'router.test.ts' })],
        }),
      ),
    ).toBe('add tests');
  });

  it('returns "update tests" for multi-subject with no adds', () => {
    expect(
      detectSubject(
        subject({
          type: 'test',
          files: [file({ path: 'auth.test.ts' }), file({ path: 'router.test.ts' })],
        }),
      ),
    ).toBe('update tests');
  });
});

describe('detectSubject — ci / build', () => {
  it('names the workflow for single CI file', () => {
    expect(
      detectSubject(
        subject({ type: 'ci', files: [file({ path: '.github/workflows/release.yml' })] }),
      ),
    ).toBe('update release workflow');
  });

  it('generic for multi-file CI', () => {
    expect(
      detectSubject(
        subject({
          type: 'ci',
          files: [
            file({ path: '.github/workflows/release.yml' }),
            file({ path: '.github/workflows/test.yml' }),
          ],
        }),
      ),
    ).toBe('update CI configuration');
  });

  it('names the build config for single build file', () => {
    expect(
      detectSubject(subject({ type: 'build', files: [file({ path: 'tsup.config.ts' })] })),
    ).toBe('update tsup.config build config');
  });
});

describe('detectSubject — chore', () => {
  it('"update dependencies" when every file is a lockfile/manifest', () => {
    expect(
      detectSubject(
        subject({
          type: 'chore',
          files: [file({ path: 'package.json' }), file({ path: 'pnpm-lock.yaml' })],
        }),
      ),
    ).toBe('update dependencies');
  });

  it('"misc maintenance" when not every file is deps', () => {
    expect(
      detectSubject(
        subject({
          type: 'chore',
          files: [file({ path: 'package.json' }), file({ path: '.editorconfig' })],
        }),
      ),
    ).toBe('misc maintenance');
  });

  it('"update dependencies" for Pipfile + Pipfile.lock (Python ecosystem)', () => {
    expect(
      detectSubject(
        subject({
          type: 'chore',
          files: [file({ path: 'Pipfile' }), file({ path: 'Pipfile.lock' })],
        }),
      ),
    ).toBe('update dependencies');
  });
});

describe('detectSubject — style', () => {
  it('always returns "apply formatting"', () => {
    expect(detectSubject(subject({ type: 'style' }))).toBe('apply formatting');
  });
});

describe('detectSubject — symbol-driven (feat/fix/refactor/perf)', () => {
  it.each(['feat', 'fix', 'refactor', 'perf'] as const)(
    'single add returns "add NAME" (type=%s)',
    (type) => {
      expect(
        detectSubject(
          subject({
            type,
            symbols: { added: [sym('rotateRefreshToken')], removed: [], modified: [] },
          }),
        ),
      ).toBe('add rotateRefreshToken');
    },
  );

  it('single remove returns "remove NAME"', () => {
    expect(
      detectSubject(
        subject({ symbols: { added: [], removed: [sym('parseLegacyToken')], modified: [] } }),
      ),
    ).toBe('remove parseLegacyToken');
  });

  it('1 add + 1 remove returns "rename X to Y" (no similarity check)', () => {
    expect(
      detectSubject(
        subject({
          symbols: { added: [sym('parseToken')], removed: [sym('parseLegacyToken')], modified: [] },
        }),
      ),
    ).toBe('rename parseLegacyToken to parseToken');
  });

  it('1 add + 1 remove with unrelated names is still a rename', () => {
    expect(
      detectSubject(
        subject({
          symbols: { added: [sym('BarService')], removed: [sym('OldFooManager')], modified: [] },
        }),
      ),
    ).toBe('rename OldFooManager to BarService');
  });

  it('returns "add NAME and others" for multiple adds with zero removes', () => {
    expect(
      detectSubject(
        subject({
          symbols: {
            added: [sym('parseToken'), sym('rotateRefreshToken'), sym('Token', 'interface')],
            removed: [],
            modified: [],
          },
        }),
      ),
    ).toBe('add parseToken and others');
  });
});

describe('detectSubject — file-level fallback', () => {
  it('returns "rename OLD to NEW" for a single rename', () => {
    expect(
      detectSubject(
        subject({
          files: [file({ kind: 'rename', oldPath: 'src/old-name.ts', path: 'src/new-name.ts' })],
        }),
      ),
    ).toBe('rename old-name to new-name');
  });

  it('returns "rename files" for multi-rename', () => {
    expect(
      detectSubject(
        subject({
          files: [
            file({ kind: 'rename', oldPath: 'a.ts', path: 'b.ts' }),
            file({ kind: 'rename', oldPath: 'c.ts', path: 'd.ts' }),
          ],
        }),
      ),
    ).toBe('rename files');
  });

  it('returns "add NAME" for single add of a non-extractable file', () => {
    expect(detectSubject(subject({ files: [file({ kind: 'add', path: 'styles.css' })] }))).toBe(
      'add styles',
    );
  });

  it('returns "remove NAME" for single delete', () => {
    expect(
      detectSubject(subject({ files: [file({ kind: 'delete', path: 'old-config.json' })] })),
    ).toBe('remove old-config');
  });

  it('returns "fix NAME" for single-file fix with no symbols', () => {
    expect(detectSubject(subject({ type: 'fix', files: [file({ path: 'src/auth.ts' })] }))).toBe(
      'fix auth',
    );
  });

  it('returns "optimize NAME" for single-file perf with no symbols', () => {
    expect(detectSubject(subject({ type: 'perf', files: [file({ path: 'src/parser.ts' })] }))).toBe(
      'optimize parser',
    );
  });

  it('returns "refactor module" for multi-file feat with no symbols', () => {
    expect(
      detectSubject(
        subject({
          type: 'feat',
          files: [file({ path: 'src/a.ts' }), file({ path: 'src/b.ts' })],
        }),
      ),
    ).toBe('refactor module');
  });

  it('returns "fix bugs" for multi-file fix with no symbols', () => {
    expect(
      detectSubject(
        subject({
          type: 'fix',
          files: [file({ path: 'src/a.ts' }), file({ path: 'src/b.ts' })],
        }),
      ),
    ).toBe('fix bugs');
  });
});
