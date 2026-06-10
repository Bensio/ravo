import { inngest } from '@/lib/inngest/client';
import { reconcileOrganization } from '@/lib/reconciliation/reconcile-org';
import { createAdminClient } from '@/lib/supabase/admin';

export const nightlyReconciliationCron = inngest.createFunction(
  { id: 'nightly-reconciliation-cron' },
  { cron: '0 2 * * *' },
  async ({ step }) => {
    const organizationIds = await step.run('list-organizations', async () => {
      const admin = createAdminClient();
      const { data, error } = await admin.from('organizations').select('id');
      if (error) {
        throw error;
      }
      return (data ?? []).map((row) => row.id as string);
    });

    if (organizationIds.length === 0) {
      return { dispatched: 0 };
    }

    await step.sendEvent(
      'fan-out-reconciliation',
      organizationIds.map((organizationId) => ({
        name: 'ravo/reconcile.organization' as const,
        data: { organizationId },
      })),
    );

    return { dispatched: organizationIds.length };
  },
);

export const reconcileOrganizationJob = inngest.createFunction(
  { id: 'reconcile-organization', retries: 3 },
  { event: 'ravo/reconcile.organization' },
  async ({ event, step }) => {
    const result = await step.run('reconcile', async () =>
      reconcileOrganization(event.data.organizationId),
    );

    return result;
  },
);
