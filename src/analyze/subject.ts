import { basename } from 'node:path';
import type { CommitType, FileChange, SymbolDelta } from '../types.js';
import { DEPS_PATTERN } from './patterns.js';

function baseName(p: string): string {
  return basename(p).replace(/\.[^.]+$/, '');
}

export interface SubjectInput {
  type: CommitType;
  files: FileChange[];
  symbols: SymbolDelta;
}

export function detectSubject({ type, files, symbols }: SubjectInput): string {
  if (files.length === 0) return 'empty commit';

  if (type === 'docs') {
    if (files.length === 1) {
      const path = files[0]!.path;
      if (/README/i.test(path)) return 'update README';
      if (/CHANGELOG/i.test(path)) return 'update changelog';
      if (/CONTRIBUTING/i.test(path)) return 'update contributing guide';
      return `update ${baseName(path)} docs`;
    }
    return 'update docs';
  }

  if (type === 'test') {
    const subjects = new Set(
      files.map((f) =>
        baseName(f.path)
          .replace(/\.(test|spec)$/i, '')
          .replace(/^test[-_]/i, ''),
      ),
    );
    if (subjects.size === 1) return `add tests for ${[...subjects][0]}`;
    return files.some((f) => f.kind === 'add') ? 'add tests' : 'update tests';
  }

  if (type === 'ci') {
    if (files.length === 1) return `update ${baseName(files[0]!.path)} workflow`;
    return 'update CI configuration';
  }

  if (type === 'build') {
    if (files.length === 1) return `update ${baseName(files[0]!.path)} build config`;
    return 'update build configuration';
  }

  if (type === 'chore') {
    const isDeps = files.every((f) => DEPS_PATTERN.test(f.path));
    if (isDeps) return 'update dependencies';
    return 'misc maintenance';
  }

  if (type === 'style') return 'apply formatting';

  // feat / fix / refactor / perf — use symbol delta when available
  if (symbols.added.length === 1 && symbols.removed.length === 0) {
    return `add ${symbols.added[0]!.name}`;
  }
  if (symbols.removed.length === 1 && symbols.added.length === 0) {
    return `remove ${symbols.removed[0]!.name}`;
  }
  if (symbols.added.length === 1 && symbols.removed.length === 1) {
    return `rename ${symbols.removed[0]!.name} to ${symbols.added[0]!.name}`;
  }
  if (symbols.added.length > 1 && symbols.removed.length === 0) {
    // First-declared symbol tends to be the headline export.
    const head = symbols.added[0];
    return head ? `add ${head.name} and others` : 'add new symbols';
  }

  // No clear symbol signal — fall back to file-level descriptions.
  const renames = files.filter((f) => f.kind === 'rename');
  if (renames.length === files.length && renames.length > 0) {
    if (renames.length === 1 && renames[0]!.oldPath) {
      return `rename ${baseName(renames[0]!.oldPath)} to ${baseName(renames[0]!.path)}`;
    }
    return 'rename files';
  }

  const adds = files.filter((f) => f.kind === 'add');
  if (adds.length === files.length && adds.length === 1) {
    return `add ${baseName(adds[0]!.path)}`;
  }

  const deletes = files.filter((f) => f.kind === 'delete');
  if (deletes.length === files.length && deletes.length === 1) {
    return `remove ${baseName(deletes[0]!.path)}`;
  }

  if (files.length === 1) {
    const verb = type === 'fix' ? 'fix' : type === 'perf' ? 'optimize' : 'update';
    return `${verb} ${baseName(files[0]!.path)}`;
  }

  return type === 'fix' ? 'fix bugs' : type === 'perf' ? 'optimize hot paths' : 'refactor module';
}
