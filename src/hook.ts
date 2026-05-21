import { chmodSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { runGit } from './git.js';

const HOOK_NAME = 'prepare-commit-msg';

const HOOK_BODY = `#!/bin/sh
# Installed by gitmsg
# Skips when a message is already provided (merge, squash, -m, -F, template).
case "$2" in
    message|template|merge|squash|commit) exit 0 ;;
esac
if [ -s "$1" ]; then
    # Only fill if file is empty (or comment-only).
    first_char=$(head -c1 "$1" 2>/dev/null)
    if [ "$first_char" != "" ] && [ "$first_char" != "#" ]; then
        exit 0
    fi
fi
SUGGESTION=$(gitmsg 2>/dev/null) || exit 0
printf '%s\\n' "$SUGGESTION" > "$1"
`;

export async function installHook(cwd?: string): Promise<string> {
  const gitDir = (await runGit(['rev-parse', '--git-dir'], cwd)).trim();
  const hooksDir = join(cwd ?? process.cwd(), gitDir, 'hooks');
  mkdirSync(hooksDir, { recursive: true });
  const hookPath = join(hooksDir, HOOK_NAME);

  if (existsSync(hookPath)) {
    throw new Error(
      `Hook already exists at ${hookPath}. Remove it manually before installing gitmsg's hook.`,
    );
  }
  writeFileSync(hookPath, HOOK_BODY, 'utf8');
  try {
    chmodSync(hookPath, 0o755);
  } catch {
    //Windows: chmod is a no-op; the hook is invoked through sh anyway.
  }
  return hookPath;
}
