import { describe, it, expect } from 'vitest';
import type { CommitType, FileChange } from '../src/types.js';
import { detectType } from '../src/analyze/type.js';

function file(path: string, partial: Partial<FileChange> = {}): FileChange {
  return {
    path,
    kind: 'modify',
    addedLines: [],
    removedLines: [],
    ...partial,
  };
}

describe('detectType', () => {
  it.each<{ name: string; files: FileChange[]; expected: CommitType }>([
    {
      name: 'empty diff -> chore',
      files: [],
      expected: 'chore',
    },
    {
      name: 'only test files -> test',
      files: [file('tests/foo.test.ts'), file('src/__tests__/bar.ts')],
      expected: 'test',
    },
    {
      name: 'only docs (mixed README and md) -> docs',
      files: [file('README.md'), file('docs/intro.md')],
      expected: 'docs',
    },
    {
      name: '.github/workflows change -> ci',
      files: [file('.github/workflows/ci.yml')],
      expected: 'ci',
    },
    {
      name: 'lock-file bump -> chore',
      files: [file('package-lock.json'), file('package.json')],
      expected: 'chore',
    },
    {
      name: 'tsup.config change -> build',
      files: [file('tsup.config.ts')],
      expected: 'build',
    },
    {
      name: 'fix comment in modified source -> fix',
      files: [file('src/auth.ts', { addedLines: ['// fix: handle null user'] })],
      expected: 'fix',
    },
    {
      name: 'new source file -> feat',
      files: [file('src/payments.ts', { kind: 'add', addedLines: ['export const x = 1;'] })],
      expected: 'feat',
    },
    {
      name: 'modify with mostly removed lines -> refactor',
      files: [
        file('src/util.ts', {
          addedLines: ['const a = 1;'],
          removedLines: ['const a = 1;', 'const b = 2;', 'const c = 3;'],
        }),
      ],
      expected: 'refactor',
    },
    {
      name: 'docs + .gitignore -> docs (neutral filtered)',
      files: [file('.gitignore'), file('docs/demo.gif'), file('docs/demo.tape')],
      expected: 'docs',
    },
    {
      name: 'new source + .gitignore -> feat (neutral filtered)',
      files: [
        file('.gitignore'),
        file('src/payments.ts', { kind: 'add', addedLines: ['export const x = 1;'] }),
      ],
      expected: 'feat',
    },
    {
      name: 'only .gitignore -> chore',
      files: [file('.gitignore', { addedLines: ['dist/'] })],
      expected: 'chore',
    },
    {
      name: 'only .editorconfig -> chore',
      files: [file('.editorconfig')],
      expected: 'chore',
    },
    {
      name: 'multiple neutrals only -> chore',
      files: [
        file('.gitignore'),
        file('.editorconfig'),
        file('.prettierrc.json'),
        file('packages/ui/.npmignore'),
      ],
      expected: 'chore',
    },
    {
      name: 'CI files + .gitignore -> ci (neutral filtered)',
      files: [file('.github/workflows/ci.yml'), file('.gitignore')],
      expected: 'ci',
    },
  ])('$name', ({ files, expected }) => {
    expect(detectType(files)).toBe(expected);
  });

  it('whitespace-only rename -> refactor', () => {
    const files: FileChange[] = [
      file('src/old-name.ts', {
        kind: 'rename',
        addedLines: [],
        removedLines: [],
      }),
    ];
    expect(detectType(files)).toBe('refactor');
  });

  it('whitespace-only modify (formatting tweak) -> style', () => {
    const files: FileChange[] = [
      file('src/util.ts', {
        addedLines: ['  const a = 1;', '  const b = 2;'],
        removedLines: ['const a = 1;', 'const b   =   2;'],
      }),
    ];
    expect(detectType(files)).toBe('style');
  });

  it('mixed-content modify, added-heavy -> feat', () => {
    const files: FileChange[] = [
      file('src/util.ts', {
        addedLines: ['export function newThing() {', '  return 42;', '}', 'export const X = 1;'],
        removedLines: ['const X = 0;'],
      }),
    ];
    expect(detectType(files)).toBe('feat');
  });

  it('mixed-content modify, balanced -> refactor (default fall-through)', () => {
    const files: FileChange[] = [
      file('src/util.ts', {
        addedLines: ['const a = compute();', 'return a;'],
        removedLines: ['const b = compute();', 'return b;'],
      }),
    ];
    expect(detectType(files)).toBe('refactor');
  });
});
