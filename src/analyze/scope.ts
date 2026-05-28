import type { FileChange } from '../types.js';

const SOURCE_PREFIXES = ['src/', 'lib/', 'app/', 'source/'];
const NOISE_SCOPES = new Set([
  'tests',
  'test',
  '__tests__',
  'spec',
  'specs',
  'docs',
  'doc',
  '.github',
]);

const MONOREPO_ROOTS = new Set(['packages', 'apps', 'libs']);

function stripSourcePrefix(p: string): string {
  for (const pfx of SOURCE_PREFIXES) {
    if (p.startsWith(pfx)) return p.slice(pfx.length);
  }
  return p;
}

function sanitizeScope(s: string): string {
  return s
    .replace(/[^a-zA-Z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase();
}

function dominantFirstSegment(files: FileChange[]): string | undefined {
  if (files.length < 2) return undefined;

  const segments = files.map((f) => stripSourcePrefix(f.path)).map((p) => p.split('/')[0] ?? '');

  const counts = new Map<string, number>();
  for (const seg of segments) {
    if (!seg) continue;

    if (/\.[a-z0-9]+$/i.test(seg)) continue; // root-level files like README.md
    const lower = seg.toLowerCase();
    if (NOISE_SCOPES.has(lower) || MONOREPO_ROOTS.has(lower)) continue;
    counts.set(seg, (counts.get(seg) ?? 0) + 1);
  }

  let bestSeg: string | undefined;
  let bestCount = 0;
  for (const [seg, count] of counts) {
    if (count > bestCount) {
      bestSeg = seg;
      bestCount = count;
    } else if (count === bestCount) {
      bestSeg = undefined; // tie, no clear winner
    }
  }

  if (!bestSeg || bestCount < 2) return undefined; // need at least 2 files sharing the segment
  if (bestCount / files.length < 0.5) return undefined; // segment should be common among the files

  return bestSeg;
}

export function detectScope(files: FileChange[]): string | undefined {
  if (files.length === 0) return undefined;

  const paths = files.map((f) => f.path);

  if (paths.every((p) => /^(?:packages|apps|libs)\/[^/]+\//.test(p))) {
    const names = new Set(
      paths.map((p) => /^(?:packages|apps|libs)\/([^/]+)\//.exec(p)?.[1] ?? ''),
    );

    // rung 1 - all files are under a monorepo root and share the same immediate subdir
    if (names.size === 1) {
      const only = [...names][0];
      if (only) return sanitizeScope(only);
    }
    return undefined;
  }

  const stripped = paths.map(stripSourcePrefix);
  const segments = stripped.map((p) => p.split('/'));
  const firstSeg = segments[0]?.[0];

  if (!firstSeg) return undefined;
  const lower = firstSeg.toLowerCase();
  if (NOISE_SCOPES.has(lower) || MONOREPO_ROOTS.has(lower)) return undefined;

  // rung 2 - all share the same first segment (and it's not a file with extension)
  const allShare =
    segments.every((s) => s.length > 1 && s[0] === firstSeg) && !/\.[a-z0-9]+$/i.test(firstSeg);

  if (allShare) {
    const sanitized = sanitizeScope(firstSeg);
    if (sanitized && sanitized.length <= 24) return sanitized;
    return undefined;
  }

  // rung 3 - find the most common first segment among the files (ignoring noise segments and root-level files)
  const dominant = dominantFirstSegment(files);
  if (dominant) {
    const sanitized = sanitizeScope(dominant);
    if (sanitized && sanitized.length <= 24) return sanitized;
  }
  return undefined;
}
