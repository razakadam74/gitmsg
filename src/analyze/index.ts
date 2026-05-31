import { symbolDelta } from '../languages/index.js';
import type { CommitMessage, DiffSummary } from '../types.js';
import { detectBreaking } from './breaking.js';
import { DEPS_PATTERN } from './patterns.js';
import { detectScope } from './scope.js';
import { detectSubject } from './subject.js';
import { detectType } from './type.js';

export function analyze(diff: DiffSummary): CommitMessage {
  const { files } = diff;
  const type = detectType(files);
  const scope = detectScope(files);
  const symbols = symbolDelta(files);
  const subject = detectSubject({ type, files, symbols });
  const breaking = detectBreaking(symbols);

  const message: CommitMessage = { type, subject };
  if (scope) message.scope = scope;
  if (breaking) message.breaking = breaking;

  if (type === 'chore' && files.length > 0 && files.every((f) => DEPS_PATTERN.test(f.path))) {
    message.scope = 'deps';
  }

  return message;
}

export { detectBreaking } from './breaking.js';
export { detectScope } from './scope.js';
export { detectSubject } from './subject.js';
export { detectType } from './type.js';
