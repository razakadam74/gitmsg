import type { FileChange } from '../types.js';

type DependencyAction = 'add' | 'remove' | 'update' | 'pin';

interface DependencyChange {
  name: string;
  action: DependencyAction;
  from?: string;
  to?: string;
}

const PACKAGE_JSON_PATTERN = /(^|\/)package\.json$/;
const ENTRY_PATTERN = /^\s*"([^"]+)"\s*:\s*"([^"]+)"\s*,?\s*$/;
const OVERRIDES_PATTERN = /^\s*"overrides"\s*:\s*\{/;
// A dependency value is version-shaped; this gate keeps script and config lines
// (e.g. "test": "vitest run") from masquerading as dependency entries.
const VERSION_PATTERN = /^(?:[~^<>=*]|\d|v\d|workspace:|npm:|file:|git(?:\+|:)|https?:)/;

// Top-level package.json fields — these are package metadata, never dependencies,
// so a value like a bumped "version" must not register as a change.
const ROOT_FIELDS = new Set([
  'author',
  'description',
  'homepage',
  'license',
  'main',
  'module',
  'name',
  'node',
  'npm',
  'packageManager',
  'pnpm',
  'private',
  'type',
  'types',
  'version',
  'yarn',
]);

function displayVersion(version: string): string {
  return version.replace(/^[~^]+/, '');
}

function dependencyEntries(lines: string[]): Map<string, string> {
  const result = new Map<string, string>();

  for (const line of lines) {
    const match = line.match(ENTRY_PATTERN);
    if (!match) continue;

    const [, name, version] = match;
    if (!name || !version || ROOT_FIELDS.has(name) || !VERSION_PATTERN.test(version)) continue;
    result.set(name, version);
  }

  return result;
}

function npmManifest(files: FileChange[]): FileChange | undefined {
  // Exactly one manifest — multiple package.json files make the change ambiguous.
  const manifests = files.filter((file) => PACKAGE_JSON_PATTERN.test(file.path));
  return manifests.length === 1 ? manifests[0] : undefined;
}

function detectDependencyChanges(files: FileChange[]): DependencyChange[] {
  const manifest = npmManifest(files);
  if (!manifest) return [];

  const added = dependencyEntries(manifest.addedLines);
  const removed = dependencyEntries(manifest.removedLines);
  const names = new Set([...added.keys(), ...removed.keys()]);
  // A newly-added overrides block reads as a pin, not a plain dependency add.
  const isOverride = manifest.addedLines.some((line) => OVERRIDES_PATTERN.test(line));
  const changes: DependencyChange[] = [];

  for (const name of names) {
    const from = removed.get(name);
    const to = added.get(name);

    if (from && to && from !== to) {
      changes.push({ name, action: 'update', from, to });
    } else if (to && !from) {
      changes.push({ name, action: isOverride ? 'pin' : 'add', to });
    } else if (from && !to) {
      changes.push({ name, action: 'remove', from });
    }
  }

  return changes;
}

function formatNames(names: string[]): string {
  if (names.length === 2) return `${names[0]!} and ${names[1]!}`;
  if (names.length === 3) return `${names[0]!}, ${names[1]!}, and ${names[2]!}`;
  return `${names[0]!}, ${names[1]!}, and others`;
}

export function detectDependencySubject(files: FileChange[]): string | undefined {
  const changes = detectDependencyChanges(files);
  if (changes.length === 0) return undefined;
  if (changes.length > 1) return `update ${formatNames(changes.map((change) => change.name))}`;

  const change = changes[0]!;
  if (change.action === 'pin') {
    return `pin ${change.name} to ${displayVersion(change.to!)}`;
  }
  if (change.action === 'update') {
    return `bump ${change.name} from ${displayVersion(change.from!)} to ${displayVersion(change.to!)}`;
  }
  if (change.action === 'add') {
    return `add ${change.name} ${displayVersion(change.to!)}`;
  }
  return `remove ${change.name}`;
}
