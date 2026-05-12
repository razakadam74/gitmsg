import type { DiffSummary, FileChange } from './types.js';

/**
 * Parse unified-diff text (typically produced with -U0) into a DiffSummary.
 *
 * This parser intentionally handles only the subset of diff syntax that
 * `git diff` emits: `diff --git`, `new file mode`, `deleted file mode`,
 * `rename from`/`rename to`, hunk headers, and `+`/`-` lines.
 */
export function parseDiff(text: string): DiffSummary {
  const files: FileChange[] = [];
  let current: FileChange | null = null;
  let inHunk = false;

  const finalize = () => {
    if (current) {
      files.push(current);
      current = null;
    }
  };

  for (const rawLine of text.split(/\r?\n/)) {
    if (rawLine.startsWith('diff --git ')) {
      finalize();
      const m = rawLine.match(/^diff --git "?a\/(.+?)"? "?b\/(.+?)"?$/);
      const path = m?.[2] ?? '';
      current = {
        path,
        kind: 'modify',
        addedLines: [],
        removedLines: [],
      };
      inHunk = false;
      continue;
    }
    if (!current) continue;

    if (rawLine.startsWith('new file mode')) {
      current.kind = 'add';
    } else if (rawLine.startsWith('deleted file mode')) {
      current.kind = 'delete';
    } else if (rawLine.startsWith('rename from ')) {
      current.kind = 'rename';
      current.oldPath = rawLine.slice('rename from '.length);
    } else if (rawLine.startsWith('rename to ')) {
      current.path = rawLine.slice('rename to '.length);
    } else if (rawLine.startsWith('@@')) {
      inHunk = true;
    } else if (inHunk) {
      if (rawLine.startsWith('+++') || rawLine.startsWith('---')) continue;
      if (rawLine.startsWith('+')) {
        current.addedLines.push(rawLine.slice(1));
      } else if (rawLine.startsWith('-')) {
        current.removedLines.push(rawLine.slice(1));
      }
    }
  }
  finalize();
  return { files };
}
