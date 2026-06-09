-- ============================================================================
-- 20260526000002_create_ambassador_invite_rpc.sql
-- Security-definer invite creation (avoids PostgREST column cache issues).
-- ============================================================================

create or replace function public.create_ambassador_invitation(
  p_org_id uuid,
  p_email text,
  p_display_handle text,
  p_token_hash text,
  p_expires_at timestamptz
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_campaign_id uuid;
  v_invitation_id uuid;
  v_email text := lower(trim(p_email));
  v_handle text := lower(trim(p_display_handle));
begin
  if v_user_id is null then
    raise exception 'not authenticated';
  end if;

  if not public.has_org_role(p_org_id, array['owner', 'admin', 'manager']) then
    raise exception 'forbidden';
  end if;

  if v_email is null or v_email = '' or position('@' in v_email) = 0 then
    raise exception 'invalid_email';
  end if;

  if v_handle is null or length(v_handle) < 3 or length(v_handle) > 30 then
    raise exception 'invalid_handle';
  end if;

  if exists (
    select 1 from invitations i
    where i.organization_id = p_org_id
      and lower(i.email) = v_email
      and i.role = 'ambassador'
      and i.accepted_at is null
      and i.expires_at > now()
  ) then
    raise exception 'pending_invite';
  end if;

  if exists (
    select 1
    from users u
    join memberships m on m.user_id = u.id
    where lower(u.email) = v_email
      and m.organization_id = p_org_id
      and m.suspended_at is null
  ) then
    raise exception 'already_member';
  end if;

  select c.id into v_campaign_id
  from campaigns c
  where c.organization_id = p_org_id
  order by c.created_at asc
  limit 1;

  if v_campaign_id is null then
    raise exception 'no_campaign';
  end if;

  insert into invitations (
    organization_id,
    email,
    role,
    token,
    invited_by,
    expires_at,
    campaign_id,
    metadata
  )
  values (
    p_org_id,
    v_email,
    'ambassador',
    p_token_hash,
    v_user_id,
    p_expires_at,
    v_campaign_id,
    jsonb_build_object('display_handle', v_handle)
  )
  returning id into v_invitation_id;

  return v_invitation_id;
end;
$$;

comment on function public.create_ambassador_invitation is
  'Creates an ambassador invitation for org staff. Email must not already be a member.';

grant execute on function public.create_ambassador_invitation to authenticated;
