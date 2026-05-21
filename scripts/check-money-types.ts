/**
 * Blocks `number` types on money-related field names in src/ (not tests or scripts).
 */
import { readFileSync, readdirSync } from 'node:fs';
import { join, relative } from 'node:path';

const srcRoot = join(process.cwd(), 'src');
const moneyFieldPattern =
  /(?:amount|price|cost|commission|cents)(?:_[a-z]+)?\s*:\s*number\b/i;
const failures: string[] = [];

function walk(dir: string): string[] {
  const entries = readdirSync(dir, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) files.push(...walk(full));
    else if (/\.(ts|tsx)$/.test(entry.name) && !entry.name.endsWith('.test.ts')) {
      files.push(full);
    }
  }
  return files;
}

for (const file of walk(srcRoot)) {
  const content = readFileSync(file, 'utf8');
  const lines = content.split('\n');
  lines.forEach((line, index) => {
    if (moneyFieldPattern.test(line) && !line.includes('// money-check:ignore')) {
      failures.push(
        `${relative(process.cwd(), file)}:${index + 1}: money field typed as number — use bigint`,
      );
    }
  });
}

if (failures.length > 0) {
  console.error('Money types check failed:\n' + failures.map((f) => `  - ${f}`).join('\n'));
  process.exit(1);
}

console.log('Money types check passed');
