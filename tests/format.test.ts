import { describe, expect, it } from 'vitest';
import { format } from '../src/format.js';
import type { CommitMessage } from '../src/types.js';

describe('format', () => {
  it('formats a basic commit message', () => {
    const msg: CommitMessage = { type: 'feat', subject: 'add login' };
    expect(format(msg)).toBe('feat: add login');
  });

  it('includes scope', () => {
    const msg: CommitMessage = { type: 'feat', scope: 'auth', subject: 'add login' };
    expect(format(msg)).toBe('feat(auth): add login');
  });

  it('includes body and breaking with blank-line separators', () => {
    const msg: CommitMessage = {
      type: 'feat',
      scope: 'auth',
      subject: 'drop legacy cookies',
      body: 'Migrate to short-lived JWTs.',
      breaking: 'clients must reauthenticate',
    };
    expect(format(msg)).toBe(
      'feat(auth)!: drop legacy cookies\n\nMigrate to short-lived JWTs.\n\nBREAKING CHANGE: clients must reauthenticate',
    );
  });

  it('marks breaking changes with !', () => {
    const msg: CommitMessage = {
      type: 'feat',
      subject: 'remove old API',
      breaking: 'old API removed',
    };
    expect(format(msg)).toBe('feat!: remove old API\n\nBREAKING CHANGE: old API removed');
  });

  it('truncates long subjects with an ellipsis', () => {
    const long = 'a'.repeat(200);
    const out = format({ type: 'feat', subject: long }, { maxSubjectLength: 30 });
    expect(out.length).toBeLessThanOrEqual(30);
    expect(out.endsWith('…')).toBe(true);
  });
});
