import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { analyze } from '../src/analyze/index.js';
import { format } from '../src/format.js';
import { parseDiff } from '../src/git.js';

const FIXTURES_DIR = fileURLToPath(new URL('./fixtures', import.meta.url));

const fixtures = readdirSync(FIXTURES_DIR)
  .filter((f) => f.endsWith('.diff'))
  .map((f) => f.replace(/\.diff$/, ''));

describe('fixtures', () => {
  for (const name of fixtures) {
    it(name, () => {
      const diff = readFileSync(join(FIXTURES_DIR, `${name}.diff`), 'utf8');
      const expected = readFileSync(join(FIXTURES_DIR, `${name}.expected.txt`), 'utf8').trim();
      const summary = parseDiff(diff);
      const message = analyze(summary);
      const got = format(message);
      expect(got).toBe(expected);
    });
  }
});
