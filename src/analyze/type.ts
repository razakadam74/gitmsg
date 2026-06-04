import type { CommitType, FileChange } from '../types.js';
import { DEPS_PATTERN, NEUTRAL_PATTERN } from './patterns.js';

const TEST_PATTERN = /(^|\/)(__tests__|tests?|spec)\/|\.(test|spec)\.[a-z0-9]+$/i;

const DOC_PATTERN = /(^|\/)(docs?|README|CHANGELOG|CONTRIBUTING|LICENSE|CODE_OF_CONDUCT|SECURITY)/i;
const MARKDOWN_PATTERN = /\.(md|mdx|rst|adoc)$/i;

const CI_PATTERN =
  /^\.github\/(workflows|actions)\/|(^|\/)(\.gitlab-ci\.yml|\.travis\.yml|azure-pipelines\.yml|Jenkinsfile|\.circleci\/)/;
const BUILD_PATTERN =
  /(^|\/)(tsup\.config\.|vite\.config\.|rollup\.config\.|webpack\.config\.|esbuild\.|Makefile|Dockerfile|\.dockerignore|build\.gradle|pom\.xml|setup\.py|pyproject\.toml)/;

const FIX_KEYWORDS = /\b(fix|fixes|fixed|bug|crash|broken|regression|hotfix)\b/i;

function every<T>(arr: T[], pred: (x: T) => boolean): boolean {
  return arr.length > 0 && arr.every(pred);
}

function fileMatches(file: FileChange, re: RegExp): boolean {
  return re.test(file.path);
}

function isWhitespaceOnly(file: FileChange): boolean {
  if (file.kind === 'rename' && file.addedLines.length === 0 && file.removedLines.length === 0) {
    return true;
  }

  const norm = (s: string) => s.replace(/\s+/g, '');
  const added = file.addedLines.map(norm).filter(Boolean);
  const removed = file.removedLines.map(norm).filter(Boolean);

  if (added.length === 0 && removed.length === 0) {
    return false;
  }

  return added.join('\n') === removed.join('\n');
}

function looksLikeFix(files: FileChange[]): boolean {
  // Heuristic: an existing-file modification that adds a comment line mentioning a fix-shaped keyword.
  for (const file of files) {
    if (file.kind === 'add') {
      return false;
    }

    for (const line of file.addedLines) {
      const stripped = line.replace(/^\s+/, '');
      if (
        (stripped.startsWith('//') || stripped.startsWith('#') || stripped.startsWith('/*')) &&
        FIX_KEYWORDS.test(stripped)
      ) {
        return true;
      }
    }
  }
  return false;
}

export function detectType(files: FileChange[]): CommitType {
  if (files.length === 0) return 'chore';

  // Filter out neutral config files (`.gitignore`, `.editorconfig`, etc.)
  const signal = files.filter((f) => !NEUTRAL_PATTERN.test(f.path));
  if (signal.length === 0) return 'chore';

  if (every(signal, (f) => fileMatches(f, TEST_PATTERN))) return 'test';
  if (every(signal, (f) => fileMatches(f, DOC_PATTERN) || fileMatches(f, MARKDOWN_PATTERN)))
    return 'docs';

  if (every(signal, (f) => fileMatches(f, CI_PATTERN))) return 'ci';
  if (every(signal, (f) => fileMatches(f, DEPS_PATTERN))) return 'chore';
  if (every(signal, (f) => fileMatches(f, BUILD_PATTERN))) return 'build';

  if (every(signal, (f) => f.kind === 'rename' && isWhitespaceOnly(f))) return 'refactor';
  if (every(signal, isWhitespaceOnly)) return 'style';

  const hasNewSourceFile = signal.some(
    (f) =>
      f.kind === 'add' &&
      !TEST_PATTERN.test(f.path) &&
      !DOC_PATTERN.test(f.path) &&
      !MARKDOWN_PATTERN.test(f.path) &&
      !CI_PATTERN.test(f.path) &&
      !DEPS_PATTERN.test(f.path),
  );

  if (looksLikeFix(signal)) return 'fix';
  if (hasNewSourceFile) return 'feat';

  // Modify-only with no new files and no fix signals — most often a refactor or feat-extension.
  // Default to 'feat' if there are added lines, 'refactor' if balanced.
  const added = signal.reduce((n, f) => n + f.addedLines.length, 0);
  const removed = signal.reduce((n, f) => n + f.removedLines.length, 0);

  if (added > removed * 1.5) return 'feat';
  if (removed > added * 1.5) return 'refactor';

  return 'refactor';
}
