-- ============================================================================
-- 20260526000003_invite_rpc_grants.sql
-- Grant invite RPCs to service_role; trim tokens in hash lookup.
-- ============================================================================

create or replace function public.preview_invitation(p_plain_token text)
returns table (
  organization_name text,
  organization_slug text,
  email text,
  role text,
  expires_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_hash text := encode(digest(trim(p_plain_token), 'sha256'), 'hex');
begin
  return query
  select o.name, o.slug, i.email, i.role, i.expires_at
  from invitations i
  join organizations o on o.id = i.organization_id
  where i.token = v_hash
    and i.accepted_at is null
    and i.expires_at > now();
end;
$$;

create or replace function public.accept_ambassador_invitation(p_plain_token text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_user_email text;
  v_hash text := encode(digest(trim(p_plain_token), 'sha256'), 'hex');
  v_inv invitations%rowtype;
  v_ambassador_id uuid;
  v_handle text;
  v_campaign_id uuid;
begin
  if v_user_id is null then
    raise exception 'not authenticated';
  end if;

  select email into v_user_email from users where id = v_user_id;
  if v_user_email is null then
    raise exception 'user_not_found';
  end if;

  select * into v_inv
  from invitations
  where token = v_hash
    and accepted_at is null
    and expires_at > now()
  for update;

  if not found then
    raise exception 'invalid_or_expired_invitation';
  end if;

  if v_inv.role <> 'ambassador' then
    raise exception 'invalid_invitation_type';
  end if;

  if lower(v_user_email) <> lower(v_inv.email) then
    raise exception 'email_mismatch';
  end if;

  if exists (
    select 1 from memberships m
    where m.user_id = v_user_id
      and m.organization_id = v_inv.organization_id
      and m.suspended_at is null
  ) then
    update invitations
    set accepted_at = now(), accepted_user_id = v_user_id
    where id = v_inv.id;
    return v_inv.organization_id;
  end if;

  v_campaign_id := v_inv.campaign_id;
  if v_campaign_id is null then
    select c.id into v_campaign_id
    from campaigns c
    where c.organization_id = v_inv.organization_id
    order by c.created_at asc
    limit 1;
  end if;

  if v_campaign_id is null then
    raise exception 'no_campaign';
  end if;

  insert into memberships (
    user_id,
    organization_id,
    role,
    invited_by,
    invited_at,
    accepted_at
  )
  values (
    v_user_id,
    v_inv.organization_id,
    'ambassador',
    v_inv.invited_by,
    v_inv.created_at,
    now()
  );

  v_handle := coalesce(
    nullif(trim(v_inv.metadata->>'display_handle'), ''),
    split_part(v_inv.email, '@', 1)
  );

  select id into v_ambassador_id from ambassadors where user_id = v_user_id;

  if v_ambassador_id is null then
    insert into ambassadors (user_id, display_handle)
    values (v_user_id, v_handle)
    returning id into v_ambassador_id;
  else
    update ambassadors
    set display_handle = coalesce(display_handle, v_handle)
    where id = v_ambassador_id;
  end if;

  insert into ambassador_campaigns (
    organization_id,
    ambassador_id,
    campaign_id,
    state
  )
  values (v_inv.organization_id, v_ambassador_id, v_campaign_id, 'active')
  on conflict (ambassador_id, campaign_id)
  do update set state = 'active';

  update invitations
  set accepted_at = now(), accepted_user_id = v_user_id
  where id = v_inv.id;

  return v_inv.organization_id;
end;
$$;

grant execute on function public.preview_invitation(text) to anon, authenticated, service_role;
grant execute on function public.accept_ambassador_invitation(text) to authenticated, service_role;
grant execute on function public.create_ambassador_invitation(uuid, text, text, text, timestamptz) to authenticated, service_role;
