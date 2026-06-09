-- ============================================================================
-- 20260526000007_organizations_update_policy.sql
-- Owners and admins can update org profile fields via authenticated client.
-- ============================================================================

create policy organizations_org_update on organizations
  for update using (
    public.has_org_role(id, array['owner', 'admin'])
  )
  with check (
    public.has_org_role(id, array['owner', 'admin'])
  );
