import type { CommitMessage } from './types.js';

export interface FormatOptions {
  /** Maximum subject length (header line). Default 72. */
  maxSubjectLength?: number;
}

/** Render a CommitMessage as a Conventional Commit string. */
export function format(msg: CommitMessage, opts: FormatOptions = {}): string {
  const max = opts.maxSubjectLength ?? 72;
  const scope = msg.scope ? `(${msg.scope})` : '';
  const breakingMark = msg.breaking ? '!' : '';
  let header = `${msg.type}${scope}${breakingMark}: ${msg.subject}`;

  if (header.length > max) {
    const overflow = header.length - max;
    const truncatedSubject =
      msg.subject.slice(0, msg.subject.length - overflow - 1).trimEnd() + '…';
    header = `${msg.type}${scope}${breakingMark}: ${truncatedSubject}`;
  }

  const parts = [header];
  if (msg.body) parts.push('', msg.body);
  if (msg.breaking) parts.push('', `BREAKING CHANGE: ${msg.breaking}`);

  return parts.join('\n');
}
