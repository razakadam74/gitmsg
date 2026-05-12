import { describe, expect, it } from 'vitest';
import { parseDiff } from '../src/git.js';

describe('parseDiff', () => {
  /**
   * LINUX/MAC:
   */

  it('returns empty for empty input', () => {
    expect(parseDiff('').files).toEqual([]);
  });

  it('parses a new file', () => {
    const diff = [
      'diff --git a/foo.ts b/foo.ts',
      'new file mode 100644',
      '--- /dev/null',
      '+++ b/foo.ts',
      '@@ -0,0 +1,2 @@',
      '+export const x = 1;',
      '+',
    ].join('\n');

    const summary = parseDiff(diff);
    expect(summary.files).toHaveLength(1);
    expect(summary.files[0]).toMatchObject({
      path: 'foo.ts',
      kind: 'add',
      addedLines: ['export const x = 1;', ''],
      removedLines: [],
    });
  });

  it('parses a deletion', () => {
    const diff = [
      'diff --git a/old.ts b/old.ts',
      'deleted file mode 100644',
      'index 1111..0000',
      '--- a/old.ts',
      '+++ /dev/null',
      '@@ -1,1 +0,0 @@',
      '-export const x = 1;',
    ].join('\n');

    const summary = parseDiff(diff);
    expect(summary.files).toHaveLength(1);
    expect(summary.files[0]?.kind).toBe('delete');
    expect(summary.files[0]?.removedLines).toEqual(['export const x = 1;']);
  });

  it('parses a rename', () => {
    const diff = [
      'diff --git a/a.ts b/b.ts',
      'similarity index 100%',
      'rename from a.ts',
      'rename to b.ts',
    ].join('\n');

    const summary = parseDiff(diff);
    expect(summary.files).toHaveLength(1);
    expect(summary.files[0]).toMatchObject({
      path: 'b.ts',
      oldPath: 'a.ts',
      kind: 'rename',
    });
  });

  it('parses multiple files in one diff', () => {
    const diff = [
      'diff --git a/one.ts b/one.ts',
      'index 1..2 100644',
      '--- a/one.ts',
      '+++ b/one.ts',
      '@@ -1,1 +1,1 @@',
      '-old',
      '+new',
      'diff --git a/two.ts b/two.ts',
      'index 3..4 100644',
      '--- a/two.ts',
      '+++ b/two.ts',
      '@@ -1,0 +1,1 @@',
      '+added',
    ].join('\n');

    const summary = parseDiff(diff);
    expect(summary.files).toHaveLength(2);
    expect(summary.files.map((f) => f.path)).toEqual(['one.ts', 'two.ts']);
    expect(summary.files[0]).toMatchObject({
      kind: 'modify',
      addedLines: ['new'],
      removedLines: ['old'],
    });
    expect(summary.files[1]).toMatchObject({
      kind: 'modify',
      addedLines: ['added'],
      removedLines: [],
    });
  });

  it('ignores non-git diff text', () => {
    const diff = ['This is not a git diff.', 'It should be ignored.'].join('\n');

    const summary = parseDiff(diff);
    expect(summary.files).toEqual([]);
  });

  /**
   * WINDOWS
   */
  it('parses a new file (Windows)', () => {
    const diff = [
      'diff --git a/foo.ts b/foo.ts',
      'new file mode 100644',
      '--- /dev/null',
      '+++ b/foo.ts',
      '@@ -0,0 +1,2 @@',
      '+export const x = 1;',
      '+',
    ].join('\r\n');

    const summary = parseDiff(diff);
    expect(summary.files).toHaveLength(1);
    expect(summary.files[0]).toMatchObject({
      path: 'foo.ts',
      kind: 'add',
      addedLines: ['export const x = 1;', ''],
      removedLines: [],
    });
  });
});
