import { NextResponse } from 'next/server';
import type { Permission } from './permissions';

export type RequestContext = {
  user: { id: string; email: string };
  org: { id: string; slug: string };
  membership: { role: string };
};

type RouteHandlerArgs = {
  params: Promise<Record<string, string>>;
  ctx: RequestContext;
};

type RouteHandler = (args: RouteHandlerArgs) => Promise<Response> | Response;

/**
 * Wraps API route handlers with permission enforcement (Layer 2).
 * Resolves session, org, membership — then calls the handler with typed ctx.
 * Full implementation ships in Phase 1; scaffold returns 501 until auth is wired.
 */
export function requirePermission(permission: Permission, handler: RouteHandler) {
  void permission;

  return async function routeHandler(): Promise<Response> {
    // TODO Phase 1: resolve session → user, org from cookie, membership → role
    void handler;
    return NextResponse.json(
      { error: 'not_implemented', message: 'Auth middleware not wired yet' },
      { status: 501 },
    );
  };
}
