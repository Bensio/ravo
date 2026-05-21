/**
 * Asserts every `create table` in supabase/migrations has RLS enabled in the same file.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const migrationsDir = join(process.cwd(), 'supabase', 'migrations');
const files = readdirSync(migrationsDir).filter((f) => f.endsWith('.sql')).sort();

const failures: string[] = [];

for (const file of files) {
  const content = readFileSync(join(migrationsDir, file), 'utf8');
  const tableMatches = [...content.matchAll(/create\s+table\s+(?:if\s+not\s+exists\s+)?(\w+)/gi)];

  for (const [, tableName] of tableMatches) {
    const table = tableName!.toLowerCase();
    const rlsPattern = new RegExp(
      `alter\\s+table\\s+${table}\\s+enable\\s+row\\s+level\\s+security`,
      'i',
    );
    if (!rlsPattern.test(content)) {
      failures.push(`${file}: table "${table}" missing "enable row level security"`);
    }
  }
}

if (failures.length > 0) {
  console.error('RLS check failed:\n' + failures.map((f) => `  - ${f}`).join('\n'));
  process.exit(1);
}

console.log(`RLS check passed (${files.length} migration file(s), ${failures.length} issues)`);
