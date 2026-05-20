import { analyze } from './analyze/index.js';
import { format } from './format.js';
import { getStagedDiff, parseDiff } from './git.js';
import type { CommitMessage, GenerateOptions } from './types.js';

/**
 * Generate a Conventional Commit message from the current staged diff
 * (or from a diff string supplied via opts.diff)
 */
export async function generate(opts: GenerateOptions = {}): Promise<CommitMessage> {
  const summary = opts.diff ? parseDiff(opts.diff) : await getStagedDiff(opts.cwd);
  return analyze(summary);
}

export { analyze, format, getStagedDiff, parseDiff };
export type * from './types.js';
