import { describe, expect, it } from 'vitest';
import type { DiffSummary, FileChange } from '../src/types.js';
import { analyze } from '../src/analyze/index.js';

const file = (overrides: Partial<FileChange> = {}): FileChange => ({
  path: 'src/a.ts',
  kind: 'modify',
  addedLines: [],
  removedLines: [],
  ...overrides,
});

const diff = (files: FileChange[]): DiffSummary => ({ files });

describe('analyze — happy path', () => {
  it('returns type and subject, no scope for root-level files', () => {
    const result = analyze(diff([file({ path: 'README.md' })]));
    expect(result.type).toBe('docs');
    expect(result.subject).toBe('update README');
    expect(result.scope).toBeUndefined();
  });

  it('includes scope when detectScope returns one', () => {
    const result = analyze(
      diff([
        file({ path: 'src/auth/jwt.ts', addedLines: ['export function rotateRefreshToken() {}'] }),
      ]),
    );
    expect(result.type).toBe('feat');
    expect(result.scope).toBe('auth');
    expect(result.subject).toBe('add rotateRefreshToken');
  });
});

describe('analyze — chore-deps scope override', () => {
  it('forces scope=deps when type=chore and all files are deps files', () => {
    const result = analyze(
      diff([file({ path: 'package.json' }), file({ path: 'pnpm-lock.yaml' })]),
    );
    expect(result.type).toBe('chore');
    expect(result.scope).toBe('deps');
    expect(result.subject).toBe('update dependencies');
  });

  it('does NOT force scope=deps for non-chore type', () => {
    const result = analyze(diff([file({ path: 'README.md' })]));
    expect(result.type).toBe('docs');
    expect(result.scope).not.toBe('deps');
  });

  it('does NOT force scope=deps when files is empty (vacuous-truth guard)', () => {
    const result = analyze(diff([]));
    expect(result.type).toBe('chore');
    expect('scope' in result).toBe(false);
  });

  it('forces scope=deps for Pipfile + Pipfile.lock (Python ecosystem)', () => {
    const result = analyze(diff([file({ path: 'Pipfile' }), file({ path: 'Pipfile.lock' })]));
    expect(result.type).toBe('chore');
    expect(result.scope).toBe('deps');
    expect(result.subject).toBe('update dependencies');
  });
});

describe('analyze — every CommitType has a defensible output', () => {
  it.each([
    [[file({ path: 'README.md' })], 'docs', 'update README'],
    [[file({ path: 'src/auth.test.ts', kind: 'add' })], 'test', 'add tests for auth'],
    [[file({ path: '.github/workflows/release.yml' })], 'ci', 'update release workflow'],
    [[file({ path: 'tsup.config.ts' })], 'build', 'update tsup.config build config'],
    // …add one row per type that's exercisable through paths alone
  ])('produces a CommitMessage for %#', (files, expectedType, expectedSubject) => {
    const result = analyze(diff(files));
    expect(result.type).toBe(expectedType);
    expect(result.subject).toBe(expectedSubject);
  });
});

describe('analyze — output shape', () => {
  it('returns an object with no "scope" key when scope is undefined', () => {
    const result = analyze(diff([file({ path: 'styles.css', kind: 'add' })]));
    expect('scope' in result).toBe(false);
  });
});
