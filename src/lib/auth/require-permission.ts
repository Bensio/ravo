import { NextResponse } from 'next/server';
import { roleHasPermission, type Permission } from './permissions';
import { getSessionUser } from './session';
import { getUserMemberships, resolveActiveOrg } from './org-context';
import { setRequestOrgContext } from './set-org-context';
import { createClient } from '@/lib/supabase/server';
import type { Role } from './permissions';

export type RequestContext = {
  user: { id: string; email: string };
  org: { id: string; slug: string; name: string };
  membership: { role: Role; organizationId: string };
};

type RouteHandlerArgs = {
  request: Request;
  params: Promise<Record<string, string>>;
  ctx: RequestContext;
};

type RouteHandler = (args: RouteHandlerArgs) => Promise<Response> | Response;

async function resolveSelfContext(
  user: { id: string; email: string },
  permission: Permission,
): Promise<Omit<RequestContext, 'user'> | null> {
  const userId = user.id;
  const memberships = await getUserMemberships(userId);
  const byRole = memberships.find((m) => roleHasPermission(m.role, permission));
  if (byRole) {
    return {
      org: byRole.org,
      membership: { role: byRole.role, organizationId: byRole.organizationId },
    };
  }

  const supabase = await createClient();
  const { data: ambassador } = await supabase
    .from('ambassadors')
    .select('id')
    .eq('user_id', userId)
    .maybeSingle();

  if (!ambassador || !permission.startsWith('self.')) {
    return null;
  }

  const fallback = memberships[0];
  if (!fallback) {
    return null;
  }

  return {
    org: fallback.org,
    membership: { role: 'ambassador', organizationId: fallback.organizationId },
  };
}

export function requirePermission(permission: Permission, handler: RouteHandler) {
  return async function routeHandler(
    request: Request,
    segmentData: { params: Promise<Record<string, string>> },
  ): Promise<Response> {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }

    const params = await segmentData.params;
    let ctx: RequestContext | null = null;

    if (permission.startsWith('self.')) {
      const selfCtx = await resolveSelfContext(user, permission);
      if (!selfCtx) {
        return NextResponse.json({ error: 'forbidden' }, { status: 403 });
      }
      ctx = { user, ...selfCtx };
    } else {
      const resolved = await resolveActiveOrg(user.id, {
        orgSlug: typeof params.org_slug === 'string' ? params.org_slug : null,
      });
      if (!resolved) {
        return NextResponse.json({ error: 'no_organization' }, { status: 403 });
      }
      if (!roleHasPermission(resolved.membership.role, permission)) {
        return NextResponse.json({ error: 'forbidden' }, { status: 403 });
      }
      ctx = {
        user,
        org: resolved.org,
        membership: resolved.membership,
      };
      await setRequestOrgContext(resolved.org.id);
    }

    return handler({
      request,
      params: segmentData.params,
      ctx,
    });
  };
}
