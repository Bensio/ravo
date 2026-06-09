import { NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth/require-permission';
import { roleHasPermission } from '@/lib/auth/permissions';
import { getOrgSettings, updateOrgSettings, type OrgSettingsPatch } from '@/lib/org/org-settings';

export const dynamic = 'force-dynamic';

export const GET = requirePermission('org.integrations', async ({ ctx }) => {
  const settings = await getOrgSettings(ctx.org.id);
  if (!settings) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }

  return NextResponse.json({
    settings,
    permissions: {
      canUpdateOrg: roleHasPermission(ctx.membership.role, 'org.update'),
      canManageBilling: roleHasPermission(ctx.membership.role, 'org.billing'),
      canManageTeam: roleHasPermission(ctx.membership.role, 'org.members.update'),
    },
  });
});

export const PATCH = requirePermission('org.update', async ({ request, ctx }) => {
  let body: OrgSettingsPatch;
  try {
    body = (await request.json()) as OrgSettingsPatch;
  } catch {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 });
  }

  const allowBillingEmail = roleHasPermission(ctx.membership.role, 'org.billing');
  if (body.billingEmail !== undefined && !allowBillingEmail) {
    return NextResponse.json({ error: 'forbidden_billing' }, { status: 403 });
  }

  const result = await updateOrgSettings(ctx.org.id, body, { allowBillingEmail });

  if (!result.ok) {
    const status = result.error === 'not_found' ? 404 : 400;
    return NextResponse.json({ error: result.error }, { status });
  }

  return NextResponse.json({ settings: result.settings });
});
