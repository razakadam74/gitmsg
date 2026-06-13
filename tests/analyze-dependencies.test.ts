import { describe, expect, it } from 'vitest';
import { detectDependencySubject } from '../src/analyze/dependencies.js';
import type { FileChange } from '../src/types.js';

const file = (overrides: Partial<FileChange> = {}): FileChange => ({
  path: 'package.json',
  kind: 'modify',
  addedLines: [],
  removedLines: [],
  ...overrides,
});

describe('detectDependencySubject', () => {
  it('detects an added npm override as a pin', () => {
    expect(
      detectDependencySubject([
        file({
          addedLines: ['  "overrides": {', '    "esbuild": "0.28.1"', '  }'],
        }),
        file({ path: 'package-lock.json' }),
      ]),
    ).toBe('pin esbuild to 0.28.1');
  });

  it('detects a single dependency version bump and strips range operators', () => {
    expect(
      detectDependencySubject([
        file({
          removedLines: ['    "vitest": "^4.1.6"'],
          addedLines: ['    "vitest": "^4.1.8"'],
        }),
        file({ path: 'package-lock.json' }),
      ]),
    ).toBe('bump vitest from 4.1.6 to 4.1.8');
  });

  it('detects a dependency addition', () => {
    expect(
      detectDependencySubject([
        file({
          addedLines: ['    "zod": "4.0.0"'],
        }),
      ]),
    ).toBe('add zod 4.0.0');
  });

  it('detects a dependency removal', () => {
    expect(
      detectDependencySubject([
        file({
          removedLines: ['    "lodash": "^4.17.21"'],
        }),
      ]),
    ).toBe('remove lodash');
  });

  it('ignores the root package version', () => {
    expect(
      detectDependencySubject([
        file({
          removedLines: ['  "version": "1.0.0"'],
          addedLines: ['  "version": "1.0.1"'],
        }),
        file({ path: 'package-lock.json' }),
      ]),
    ).toBeUndefined();
  });

  it('ignores Node engine changes', () => {
    expect(
      detectDependencySubject([
        file({
          removedLines: ['    "node": ">=20.0.0"'],
          addedLines: ['    "node": ">=22.0.0"'],
        }),
      ]),
    ).toBeUndefined();
  });

  it('returns undefined for lockfile-only changes', () => {
    expect(
      detectDependencySubject([
        file({
          path: 'package-lock.json',
          removedLines: ['      "version": "1.0.0"'],
          addedLines: ['      "version": "1.0.1"'],
        }),
      ]),
    ).toBeUndefined();
  });

  it('names multiple dependency changes in manifest order', () => {
    expect(
      detectDependencySubject([
        file({
          removedLines: ['    "vitest": "4.1.6"', '    "prettier": "3.8.3"'],
          addedLines: ['    "vitest": "4.1.8"', '    "prettier": "3.8.4"'],
        }),
      ]),
    ).toBe('update vitest and prettier');
  });

  it('ignores script changes that look like package entries', () => {
    expect(
      detectDependencySubject([
        file({
          removedLines: ['    "test": "vitest run"'],
          addedLines: ['    "test": "vitest run --coverage"'],
        }),
      ]),
    ).toBeUndefined();
  });
});
