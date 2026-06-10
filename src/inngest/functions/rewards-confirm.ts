import { inngest } from '@/lib/inngest/client';
import { confirmRewardsPastRefundWindow } from '@/lib/rewards/confirm-pending';

export const rewardsConfirmCron = inngest.createFunction(
  { id: 'rewards-confirm-cron' },
  { cron: '0 * * * *' },
  async ({ step }) => {
    const result = await step.run('confirm-pending-rewards', async () =>
      confirmRewardsPastRefundWindow(),
    );
    return result;
  },
);
