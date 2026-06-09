/**
 * Asserts every API route handler export in src/app/api is wrapped in requirePermission.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const apiRoot = join(process.cwd(), 'src', 'app', 'api');
const handlerNames = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'] as const;
const failures: string[] = [];

function walk(dir: string): string[] {
  if (!statSync(dir, { throwIfNoEntry: false })?.isDirectory()) {
    return [];
  }
  const entries = readdirSync(dir, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) files.push(...walk(full));
    else if (entry.name === 'route.ts' || entry.name === 'route.tsx') files.push(full);
  }
  return files;
}

const routeFiles = walk(apiRoot);

const EXEMPT_PREFIXES = ['src/app/api/ingest/', 'src/app/api/webhooks/', 'src/app/api/invites/'];

for (const file of routeFiles) {
  const content = readFileSync(file, 'utf8');
  const rel = relative(process.cwd(), file).replace(/\\/g, '/');

  if (EXEMPT_PREFIXES.some((prefix) => rel.startsWith(prefix))) {
    continue;
  }

  if (!content.includes('requirePermission')) {
    failures.push(`${rel}: no requirePermission wrapper found`);
    continue;
  }

  for (const method of handlerNames) {
    const exportPattern = new RegExp(
      `export\\s+(?:const|async\\s+function)\\s+${method}\\s*=`,
      'm',
    );
    const bareExport = new RegExp(`export\\s+async\\s+function\\s+${method}\\s*\\(`, 'm');
    if (exportPattern.test(content) || bareExport.test(content)) {
      if (!content.includes(`requirePermission(`)) {
        failures.push(`${rel}: exported ${method} without requirePermission`);
      }
    }
  }
}

if (failures.length > 0) {
  console.error('Route permissions check failed:\n' + failures.map((f) => `  - ${f}`).join('\n'));
  process.exit(1);
}

console.log(
  routeFiles.length === 0
    ? 'Route permissions check passed (no API routes yet)'
    : `Route permissions check passed (${routeFiles.length} route file(s))`,
);
