import { NextResponse } from 'next/server';
import { roleHasPermission, type Permission } from './permissions';
import { getSessionUser } from './session';
import { resolveActiveOrg } from './org-context';
import type { Role } from './permissions';

export type RequestContext = {
  user: { id: string; email: string };
  org: { id: string; slug: string; name: string };
  membership: { role: Role; organizationId: string };
};

type RouteHandlerArgs = {
  params: Promise<Record<string, string>>;
  ctx: RequestContext;
};

type RouteHandler = (args: RouteHandlerArgs) => Promise<Response> | Response;

export function requirePermission(permission: Permission, handler: RouteHandler) {
  return async function routeHandler(
    _request: Request,
    segmentData: { params: Promise<Record<string, string>> },
  ): Promise<Response> {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }

    const params = await segmentData.params;
    const resolved = await resolveActiveOrg(user.id, {
      orgSlug: typeof params.org_slug === 'string' ? params.org_slug : null,
    });
    if (!resolved) {
      return NextResponse.json({ error: 'no_organization' }, { status: 403 });
    }

    if (!roleHasPermission(resolved.membership.role, permission)) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    }

    return handler({
      params: segmentData.params,
      ctx: {
        user,
        org: resolved.org,
        membership: resolved.membership,
      },
    });
  };
}
