import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

// Audit 4.8.5 to 4.8.9: seventeen vendor clients called `fetch` directly, so
// none of them had a timeout or a retry. `fetchWithRetry` supplies both, and it
// has existed and been tested the whole time.
//
// A grep is the right shape of test here. The property is "no call site in
// src/ bypasses the wrapper", which is about the whole tree rather than about
// any one client, and the failure mode is a NEW client written next month by
// copying an old one. A behavioural test on the seventeen that exist today
// cannot see that; this can.
const SRC = fileURLToPath(new URL('../src', import.meta.url));

/** `util/fetch.ts` is the wrapper itself and is the one place that must call
 *  the global. */
const ALLOWED = ['util/fetch.ts'];

/** Blanks comment bodies while preserving line numbering, so an offender's
 *  reported line still points at the right place. */
function stripComments(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, (block) => block.replace(/[^\n]/g, ' '))
    .replace(/\/\/[^\n]*/g, (line) => ' '.repeat(line.length));
}

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...walk(full));
    else if (entry.endsWith('.ts')) out.push(full);
  }
  return out;
}

describe('vendor HTTP discipline', () => {
  it('has no bare fetch call left in src/', () => {
    const offenders: string[] = [];

    for (const file of walk(SRC)) {
      const relative = file.slice(SRC.length + 1);
      if (ALLOWED.includes(relative)) continue;

      // Comments are stripped first. Prose like "only after a successful fetch
      // (prd.md R-8.3)" matches the call pattern otherwise, and a guard that
      // cries wolf on a comment gets deleted rather than fixed.
      const source = stripComments(readFileSync(file, 'utf8'));

      // Matches the call, not the identifier: `fetchWithRetry(` contains
      // `fetch` and must not trip this.
      for (const [index, line] of source.split('\n').entries()) {
        if (/(?<![\w.])fetch\s*\(/.test(line)) offenders.push(`${relative}:${index + 1}`);
      }
    }

    expect(offenders).toEqual([]);
  });

  it('still finds the wrapper it is protecting', () => {
    // Guards the guard: if fetchWithRetry were renamed or moved, the test above
    // would pass vacuously by finding nothing anywhere.
    const wrapper = readFileSync(join(SRC, 'util/fetch.ts'), 'utf8');
    expect(wrapper).toContain('export async function fetchWithRetry');
    expect(wrapper).toContain('AbortSignal.timeout');
  });
});
