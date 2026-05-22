import { parseArgs } from 'node:util';
import { spawnSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { generate } from './index.js';
import { format } from './format.js';
import { installHook } from './hook.js';

const DEFAULT_VERSION = '0.0.0';
const HELP = `gitmsg — generate a Conventional Commit message for staged changes

Usage:
    gitmsg [options]

Options:
    --commit            Commit directly with the suggested message
    --edit              Open the suggestion in $EDITOR before committing
    --json              Output structured JSON instead of the formatted message
    --hook              Install a prepare-commit-msg git hook in the current repo
    --max <n>           Maximum subject length (default 72)
    -v, --version       Print version
    -h, --help          Show this help
`;

async function readVersion(): Promise<string> {
  try {
    const url = new URL('../package.json', import.meta.url);
    const text = await (await import('node:fs/promises')).readFile(url, 'utf8');
    return JSON.parse(text).version ?? DEFAULT_VERSION;
  } catch {
    return DEFAULT_VERSION;
  }
}

async function main(): Promise<number> {
  const { values } = parseArgs({
    options: {
      commit: { type: 'boolean', default: false },
      edit: { type: 'boolean', default: false },
      json: { type: 'boolean', default: false },
      hook: { type: 'boolean', default: false },
      max: { type: 'string' }, // no default -> undefined when absent
      version: { type: 'boolean', short: 'v', default: false }, // -v also works
      help: { type: 'boolean', short: 'h', default: false }, // -h also works
    },
    strict: true,
    allowPositionals: false,
  });

  if (values.help) {
    process.stdout.write(HELP);
    return 0;
  }

  if (values.version) {
    process.stdout.write((await readVersion()) + '\n');
    return 0;
  }

  if (values.hook) {
    const path = await installHook();
    process.stdout.write(`Installed prepare-commit-msg hook at ${path}\n`);
    return 0;
  }

  const maxSubjectLength = values.max ? Number(values.max) : undefined;
  if (
    maxSubjectLength !== undefined &&
    (!Number.isFinite(maxSubjectLength) || maxSubjectLength < 10)
  ) {
    process.stderr.write('--max must be a number >= 10\n');
    return 2;
  }

  const message = await generate();
  if (values.json) {
    process.stdout.write(JSON.stringify(message, null, 2) + '\n');
    return 0;
  }

  const text = format(message, maxSubjectLength !== undefined ? { maxSubjectLength } : {});
  if (values.commit) {
    const result = spawnSync('git', ['commit', '-m', text], { stdio: 'inherit' });
    return result.status ?? 1;
  }

  if (values.edit) {
    const file = join(tmpdir(), `gitmsg-${process.pid}.txt`);
    writeFileSync(file, text + '\n', 'utf8');
    const results = spawnSync('git', ['commit', '-e', '-F', file], { stdio: 'inherit' });
    return results.status ?? 1;
  }

  process.stdout.write(text + '\n');
  return 0;
}

main().then(
  (code) => process.exit(code),
  (err) => {
    process.stderr.write(`gitmsg: ${err instanceof Error ? err.message : String(err)}\n`);
    process.exit(1);
  },
);
