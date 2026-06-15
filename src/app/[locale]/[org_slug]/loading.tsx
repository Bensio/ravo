import { AdminSuspenseBodyPulse } from '@/components/admin/admin-suspense-body-pulse';

/** Route transition placeholder — pages supply their own chrome via *PageSkeleton. */
export default function AdminOrgLoading() {
  return <AdminSuspenseBodyPulse className="h-[28rem]" />;
}
