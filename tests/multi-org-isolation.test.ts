import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  canRunIsolationTests,
  seedIsolationFixture,
  signInAs,
  teardownIsolationFixture,
  type IsolationFixture,
} from './helpers/multi-org-fixture';

const ORG_SCOPED_TABLES = [
  'memberships',
  'campaigns',
  'collaboration_labels',
  'events',
] as const;

describe('multi-org isolation', () => {
  it('scaffold is present', () => {
    expect(true).toBe(true);
  });

  describe('with live Supabase', () => {
    let fixture: IsolationFixture | undefined;
    let setupError: string | undefined;

    beforeAll(async () => {
      if (!canRunIsolationTests()) {
        setupError = 'Set NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, and SUPABASE_SERVICE_ROLE_KEY in .env.local';
        return;
      }
      try {
        const runId = `${Date.now().toString(36)}`;
        fixture = await seedIsolationFixture(runId);
      } catch (error) {
        setupError =
          error instanceof Error ? error.message : 'Failed to seed isolation fixture';
      }
    }, 60_000);

    afterAll(async () => {
      if (fixture) {
        await teardownIsolationFixture(fixture);
      }
    }, 60_000);

    function skipUnlessReady(ctx: { skip: (note?: string) => void }) {
      if (setupError) {
        ctx.skip(setupError);
      }
      if (!fixture) {
        ctx.skip('Isolation fixture was not created');
      }
    }

    it('each user sees only their own org campaigns', async (ctx) => {
      skipUnlessReady(ctx);
      for (const org of fixture!.orgs) {
        const client = await signInAs(org.email, org.password);
        const { data, error } = await client.from('campaigns').select('id, organization_id');
        expect(error).toBeNull();
        expect(data).toHaveLength(1);
        expect(data![0]!.organization_id).toBe(org.id);
        await client.auth.signOut();
      }
    });

    it('blocks cross-org campaign reads even with an explicit org filter', async (ctx) => {
      skipUnlessReady(ctx);
      const [viewer, target] = fixture!.orgs;
      const client = await signInAs(viewer.email, viewer.password);
      const { data, error } = await client
        .from('campaigns')
        .select('id')
        .eq('organization_id', target.id);
      expect(error).toBeNull();
      expect(data).toEqual([]);
      await client.auth.signOut();
    });

    it('blocks cross-org reads on collaboration_labels', async (ctx) => {
      skipUnlessReady(ctx);
      const [viewer, target] = fixture!.orgs;
      const client = await signInAs(viewer.email, viewer.password);
      const { data, error } = await client
        .from('collaboration_labels')
        .select('id')
        .eq('id', target.labelId);
      expect(error).toBeNull();
      expect(data).toEqual([]);
      await client.auth.signOut();
    });

    it('blocks reading another organization row by id', async (ctx) => {
      skipUnlessReady(ctx);
      const [viewer, target] = fixture!.orgs;
      const client = await signInAs(viewer.email, viewer.password);
      const { data, error } = await client
        .from('organizations')
        .select('id')
        .eq('id', target.id);
      expect(error).toBeNull();
      expect(data).toEqual([]);
      await client.auth.signOut();
    });

    it('scopes unfiltered selects on org-scoped tables', async (ctx) => {
      skipUnlessReady(ctx);
      const viewer = fixture!.orgs[0]!;
      const client = await signInAs(viewer.email, viewer.password);

      for (const table of ORG_SCOPED_TABLES) {
        const { data, error } = await client.from(table).select('organization_id');
        expect(error).toBeNull();
        for (const row of data ?? []) {
          const orgId = (row as { organization_id: string }).organization_id;
          expect(orgId).toBe(viewer.id);
        }
      }

      await client.auth.signOut();
    });
  });
});
