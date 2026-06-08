import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { serverNow } from '@/lib/time';

export type IsolationFixture = {
  runId: string;
  admin: SupabaseClient;
  orgs: Array<{
    id: string;
    slug: string;
    userId: string;
    email: string;
    password: string;
    campaignId: string;
    labelId: string;
  }>;
};

const TEST_PASSWORD = 'IsolationTest-Phase1!';

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing ${name} for multi-org isolation tests`);
  }
  return value;
}

function isConfiguredSecret(value: string | undefined): boolean {
  if (!value || value.length < 20) {
    return false;
  }
  const lower = value.toLowerCase();
  return !lower.includes('your-') && !lower.includes('changeme');
}

export function canRunIsolationTests(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL?.startsWith('http') &&
      isConfiguredSecret(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) &&
      isConfiguredSecret(process.env.SUPABASE_SERVICE_ROLE_KEY),
  );
}

export function createAdminClient(): SupabaseClient {
  return createClient(
    requireEnv('NEXT_PUBLIC_SUPABASE_URL'),
    requireEnv('SUPABASE_SERVICE_ROLE_KEY'),
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}

export function createUserClient(): SupabaseClient {
  return createClient(
    requireEnv('NEXT_PUBLIC_SUPABASE_URL'),
    requireEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY'),
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}

export async function signInAs(
  email: string,
  password: string,
): Promise<SupabaseClient> {
  const client = createUserClient();
  const { error } = await client.auth.signInWithPassword({ email, password });
  if (error) {
    throw error;
  }
  return client;
}

export async function seedIsolationFixture(runId: string): Promise<IsolationFixture> {
  const admin = createAdminClient();
  const orgs: IsolationFixture['orgs'] = [];

  for (let i = 1; i <= 3; i++) {
    const slug = `iso-${runId}-org-${i}`;
    const email = `iso-${runId}-user-${i}@ravo-isolation.test`;

    const { data: authUser, error: authError } = await admin.auth.admin.createUser({
      email,
      password: TEST_PASSWORD,
      email_confirm: true,
    });
    if (authError || !authUser.user) {
      throw authError ?? new Error('Failed to create auth user');
    }

    const userId = authUser.user.id;

    const { data: org, error: orgError } = await admin
      .from('organizations')
      .insert({ slug, name: `Isolation Org ${i}`, country: 'NL' })
      .select('id')
      .single();
    if (orgError || !org) {
      throw orgError ?? new Error('Failed to create organization');
    }

    const { error: membershipError } = await admin.from('memberships').insert({
      user_id: userId,
      organization_id: org.id,
      role: 'owner',
      accepted_at: serverNow().toISOString(),
    });
    if (membershipError) {
      throw membershipError;
    }

    const { data: connection, error: connectionError } = await admin
      .from('provider_connections')
      .insert({
        organization_id: org.id,
        provider: 'manual_utm',
        display_name: `Test connection ${i}`,
        created_by: userId,
        webhook_url_token: `iso-${runId}-token-${i}`,
      })
      .select('id')
      .single();
    if (connectionError || !connection) {
      throw connectionError ?? new Error('Failed to create provider connection');
    }

    const startAt = '2026-07-12T00:00:00.000Z';
    const endAt = '2026-07-14T23:59:59.000Z';

    const { data: event, error: eventError } = await admin
      .from('events')
      .insert({
        organization_id: org.id,
        provider_connection_id: connection.id,
        provider_event_id: `iso-${runId}-event-${i}`,
        name: `Isolation Event ${i}`,
        slug: `iso-event-${i}`,
        start_at: startAt,
        end_at: endAt,
        timezone: 'Europe/Amsterdam',
      })
      .select('id')
      .single();
    if (eventError || !event) {
      throw eventError ?? new Error('Failed to create event');
    }

    const { data: campaign, error: campaignError } = await admin
      .from('campaigns')
      .insert({
        organization_id: org.id,
        event_id: event.id,
        name: `Isolation Campaign ${i}`,
        slug: `iso-campaign-${i}`,
        state: 'active',
      })
      .select('id')
      .single();
    if (campaignError || !campaign) {
      throw campaignError ?? new Error('Failed to create campaign');
    }

    const { data: label, error: labelError } = await admin
      .from('collaboration_labels')
      .insert({
        organization_id: org.id,
        name: `Isolation Label ${i}`,
      })
      .select('id')
      .single();
    if (labelError || !label) {
      throw labelError ?? new Error('Failed to create collaboration label');
    }

    orgs.push({
      id: org.id,
      slug,
      userId,
      email,
      password: TEST_PASSWORD,
      campaignId: campaign.id,
      labelId: label.id,
    });
  }

  return { runId, admin, orgs };
}

export async function teardownIsolationFixture(fixture: IsolationFixture): Promise<void> {
  const { admin, orgs } = fixture;

  for (const org of orgs) {
    await admin.from('organizations').delete().eq('id', org.id);
    const { error } = await admin.auth.admin.deleteUser(org.userId);
    if (error) {
      console.warn(`Failed to delete test user ${org.userId}:`, error.message);
    }
  }
}
