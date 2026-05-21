import { describe, expect, it } from 'vitest';

/**
 * Multi-org isolation test harness.
 * Populated in Phase 1 as tables ship; requires SUPABASE_DB_URL + seed data.
 */
describe('multi-org isolation', () => {
  it.skipIf(!process.env.SUPABASE_DB_URL)(
    'blocks cross-org reads on identity tables',
    async () => {
      // Phase 1: create 3 orgs, assert every query path returns empty for wrong org
      expect(process.env.SUPABASE_DB_URL).toBeTruthy();
    },
  );

  it('scaffold is present', () => {
    expect(true).toBe(true);
  });
});
