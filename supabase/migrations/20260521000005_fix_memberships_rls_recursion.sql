-- ============================================================================
-- 20260521000005_fix_memberships_rls_recursion.sql
-- Fixes PostgreSQL 42P17 (infinite recursion) on memberships RLS policies.
-- Policies that subquery memberships while evaluating memberships RLS recurse.
-- Use security-definer helpers that read memberships without re-entering RLS.
-- ============================================================================

-- Orgs the current user belongs to (active memberships)
create or replace function public.user_organization_ids()
returns setof uuid
language sql
security definer
stable
set search_path = public
as $$
  select organization_id
  from memberships
  where user_id = auth.uid()
    and suspended_at is null;
$$;

comment on function public.user_organization_ids() is
  'RLS helper: org IDs for auth.uid(). Security definer to avoid policy recursion.';

-- Role check for org-scoped write policies
create or replace function public.has_org_role(p_org_id uuid, p_roles text[])
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1
    from memberships
    where user_id = auth.uid()
      and organization_id = p_org_id
      and role = any (p_roles)
      and suspended_at is null
  );
$$;

comment on function public.has_org_role(uuid, text[]) is
  'RLS helper: true if auth.uid() has one of p_roles in p_org_id. Security definer.';

grant execute on function public.user_organization_ids() to authenticated;
grant execute on function public.has_org_role(uuid, text[]) to authenticated;

-- Replace recursive memberships SELECT policy
drop policy if exists memberships_org_select on memberships;

create policy memberships_self_select on memberships
  for select using (user_id = auth.uid());

-- Staff can read all memberships in orgs they belong to (refine by role in app layer later)
create policy memberships_same_org_select on memberships
  for select using (
    organization_id in (select public.user_organization_ids())
  );

-- Replace recursive write policies
drop policy if exists memberships_org_write on memberships;
drop policy if exists memberships_org_update on memberships;

create policy memberships_org_write on memberships
  for insert with check (
    public.has_org_role(organization_id, array['owner', 'admin'])
  );

create policy memberships_org_update on memberships
  for update using (
    public.has_org_role(organization_id, array['owner', 'admin'])
  );

-- organizations: use helper instead of subquery on memberships (avoids indirect recursion)
drop policy if exists organizations_member_select on organizations;

create policy organizations_member_select on organizations
  for select using (
    id in (select public.user_organization_ids())
  );
