-- ============================================================================
-- 20260526000005_invitations_select_delete.sql
-- Analysts can read invites; managers+ can revoke pending invites.
-- ============================================================================

drop policy if exists invitations_org_select on invitations;

create policy invitations_org_select on invitations
  for select using (
    organization_id in (
      select organization_id
      from memberships
      where user_id = auth.uid()
        and role in ('owner', 'admin', 'manager', 'analyst')
        and suspended_at is null
    )
  );

create policy invitations_org_delete on invitations
  for delete using (
    organization_id in (
      select organization_id
      from memberships
      where user_id = auth.uid()
        and role in ('owner', 'admin', 'manager')
        and suspended_at is null
    )
    and accepted_at is null
  );
