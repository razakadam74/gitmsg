import { symbolDelta } from '../languages/index.js';
import type { CommitMessage, DiffSummary } from '../types.js';
import { detectScope } from './scope.js';
import { detectSubject } from './subject.js';
import { detectType } from './type.js';

export function analyze(diff: DiffSummary): CommitMessage {
  const { files } = diff;
  const type = detectType(files);
  const scope = detectScope(files);
  const symbols = symbolDelta(files);
  const subject = detectSubject({ type, files, symbols });

  const message: CommitMessage = { type, subject };
  if (scope) message.scope = scope;

  if (
    type === 'chore' &&
    files.length > 0 &&
    files.every((f) =>
      /package(-lock)?\.json|yarn\.lock|pnpm-lock\.yaml|requirements\.txt|go\.(mod|sum)|Cargo\.(toml|lock)/.test(
        f.path,
      ),
    )
  ) {
    message.scope = 'deps';
  }

  return message;
}

export { detectScope } from './scope.js';
export { detectSubject } from './subject.js';
export { detectType } from './type.js';
