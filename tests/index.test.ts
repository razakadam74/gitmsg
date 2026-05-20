import { describe, expect, it } from 'vitest';
import { generate } from '../src/index.js';

describe('generate', () => {
  it('analyzes a supplied diff string (no git spawn)', async () => {
    const diff = [
      'diff --git a/src/auth/jwt.ts b/src/auth/jwt.ts',
      'new file mode 100644',
      '--- /dev/null',
      '+++ b/src/auth/jwt.ts',
      '@@ -0,0 +1,1 @@',
      '+export function rotateRefreshToken() {}',
    ].join('\n');

    const message = await generate({ diff });

    expect(message.type).toBe('feat');
    expect(message.scope).toBe('auth');
    expect(message.subject).toBe('add rotateRefreshToken');
  });

  it('returns chore(deps): update dependencies for a lockfile-only diff', async () => {
    const diff = [
      'diff --git a/package.json b/package.json',
      '--- a/package.json',
      '+++ b/package.json',
      '@@ -1 +1 @@',
      '-  "version": "1.0.0"',
      '+  "version": "1.0.1"',
      'diff --git a/pnpm-lock.yaml b/pnpm-lock.yaml',
      '--- a/pnpm-lock.yaml',
      '+++ b/pnpm-lock.yaml',
      '@@ -1 +1 @@',
      '-old',
      '+new',
    ].join('\n');

    const message = await generate({ diff });

    expect(message.type).toBe('chore');
    expect(message.scope).toBe('deps');
    expect(message.subject).toBe('update dependencies');
  });

  it('returns the canonical CommitMessage shape (no extra keys)', async () => {
    const diff = [
      'diff --git a/README.md b/README.md',
      '--- a/README.md',
      '+++ b/README.md',
      '@@ -1 +1 @@',
      '-old',
      '+new',
    ].join('\n');
    const message = await generate({ diff });
    expect(Object.keys(message).sort()).toEqual(['subject', 'type']);
  });
});
