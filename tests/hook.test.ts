import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync, readFileSync, existsSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { HOOK_BODY, installHook } from '../src/hook.js';

describe('installHook', () => {
  let repoDir: string;

  beforeEach(() => {
    repoDir = mkdtempSync(join(tmpdir(), 'gitmsg-hook-test-'));
    spawnSync('git', ['init', '--quiet'], { cwd: repoDir });
  });

  afterEach(() => {
    rmSync(repoDir, { recursive: true, force: true });
  });

  it('writes the hook to .git/hooks/prepare-commit-msg', async () => {
    const hookPath = await installHook(repoDir);

    expect(hookPath).toContain('prepare-commit-msg');
    expect(existsSync(hookPath)).toBe(true);

    const body = readFileSync(hookPath, 'utf8');
    expect(body).toContain('#!/bin/sh');
    expect(body).toContain('gitmsg');
  });

  it('refuses to clobber an existing hook', async () => {
    await installHook(repoDir); //install once
    await expect(installHook(repoDir)).rejects.toThrow(/already exists/);
  });

  it.runIf(process.platform !== 'win32')('sets the executable bit on Unix', async () => {
    const hookPath = await installHook(repoDir);
    const mode = statSync(hookPath).mode & 0o777;
    //owner must have execute; group + others should have read+execute
    expect(mode & 0o100).toBe(0o100);
  });

  it.runIf(process.platform !== 'win32')('HOOK_BODY is valid POSIX sh (sh -n parses it)', () => {
    const res = spawnSync('sh', ['-n', '-'], { input: HOOK_BODY });
    expect(res.status).toBe(0);
    expect(res.stderr.toString()).toBe('');
  });
});
