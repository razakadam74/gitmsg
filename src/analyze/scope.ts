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

export function detectScope(files: FileChange[]): string | undefined {
  if (files.length === 0) return undefined;

  const paths = files.map((f) => f.path);

  if (paths.every((p) => /^(?:packages|apps|libs)\/[^/]+\//.test(p))) {
    const names = new Set(
      paths.map((p) => /^(?:packages|apps|libs)\/([^/]+)\//.exec(p)?.[1] ?? ''),
    );

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

  const allShare =
    segments.every((s) => s.length > 1 && s[0] === firstSeg) && !/\.[a-z0-9]+$/i.test(firstSeg);
  if (!allShare) return undefined;

  const sanitized = sanitizeScope(firstSeg);

  if (!sanitized || sanitized.length > 24) return undefined;
  return sanitized;
}
