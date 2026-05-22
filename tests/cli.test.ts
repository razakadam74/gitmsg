import { describe, expect, it, beforeAll } from 'vitest';
import { spawnSync, execSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const cliPath = resolve(repoRoot, 'dist', 'cli.js');

function runCli(args: string[]) {
  return spawnSync('node', [cliPath, ...args], {
    encoding: 'utf8',
    cwd: repoRoot,
  });
}

describe('cli (policy surface)', () => {
  beforeAll(() => {
    if (!existsSync(cliPath)) {
      execSync('npm run build', { cwd: repoRoot, stdio: 'inherit' });
    }
  }, 60_000);

  it('rejects --max below the floor with exit code 2', () => {
    const result = runCli(['--max', '5']);
    expect(result.status).toBe(2);
    expect(result.stderr).toContain('--max must be a number');
    expect(result.stdout).toBe('');
  });

  it('rejects unknown flags with exit code 1', () => {
    const result = runCli(['--definitely-not-a-flag']);
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('gitmsg:');
    expect(result.stderr).toMatch(/unknown|not allowed|unrecognized/i);
  });

  it('--help short-circuits before any git invocation (exits 0 outside a repo)', () => {
    // Run from the OS root, where there is no git repo above. If --help did not
    // short-circuit, generate() would spawn `git diff --staged` and reject,
    // producing a non-zero exit code. A clean exit 0 proves the short-circuit.
    const root = process.platform === 'win32' ? 'C:\\' : '/';
    const result = spawnSync('node', [cliPath, '--help'], {
      encoding: 'utf8',
      cwd: root,
    });
    expect(result.status).toBe(0);
    expect(result.stdout).toContain('Usage:');
    expect(result.stdout).toContain('--commit');
    expect(result.stderr).toBe('');
  });
});
