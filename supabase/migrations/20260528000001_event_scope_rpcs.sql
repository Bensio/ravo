-- Event-scoped tracklinks list + ambassador invite campaign selection

create or replace function public.list_org_tracklinks(
  p_org_id uuid,
  p_event_id uuid default null
)
returns table (
  id uuid,
  code text,
  label text,
  destination_url text,
  disabled boolean,
  created_at timestamptz,
  click_count bigint,
  ambassador_display_handle text
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  if not exists (
    select 1 from memberships m
    where m.user_id = auth.uid()
      and m.organization_id = p_org_id
      and m.role in ('owner', 'admin', 'manager', 'analyst')
      and m.suspended_at is null
  ) then
    raise exception 'forbidden';
  end if;

  return query
  select
    l.id,
    l.code,
    l.label,
    l.destination_url,
    l.disabled,
    l.created_at,
    coalesce((
      select count(*)::bigint
      from clicks c
      where c.link_id = l.id and c.organization_id = p_org_id
    ), 0) as click_count,
    a.display_handle as ambassador_display_handle
  from links l
  left join ambassadors a on a.id = l.ambassador_id
  where l.organization_id = p_org_id
    and (
      p_event_id is null
      or l.campaign_id in (
        select c.id from campaigns c
        where c.organization_id = p_org_id
          and c.event_id = p_event_id
          and c.state != 'archived'
      )
    )
  order by l.created_at desc;
end;
$$;

grant execute on function public.list_org_tracklinks(uuid, uuid) to authenticated;

create or replace function public.create_ambassador_invitation(
  p_org_id uuid,
  p_email text,
  p_display_handle text,
  p_token_hash text,
  p_expires_at timestamptz,
  p_campaign_id uuid default null
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
  v_pending_id uuid;
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
    select 1
    from users u
    join memberships m on m.user_id = u.id
    where lower(u.email) = v_email
      and m.organization_id = p_org_id
      and m.suspended_at is null
  ) then
    raise exception 'already_member';
  end if;

  select i.id into v_pending_id
  from invitations i
  where i.organization_id = p_org_id
    and lower(i.email) = v_email
    and i.role = 'ambassador'
    and i.accepted_at is null
    and i.expires_at > now()
  limit 1;

  if v_pending_id is not null then
    update invitations
    set
      token = p_token_hash,
      expires_at = p_expires_at,
      invited_by = v_user_id,
      metadata = jsonb_build_object('display_handle', v_handle)
    where id = v_pending_id
    returning id into v_invitation_id;

    return v_invitation_id;
  end if;

  if p_campaign_id is not null then
    select c.id into v_campaign_id
    from campaigns c
    where c.id = p_campaign_id
      and c.organization_id = p_org_id
      and c.state != 'archived';
  end if;

  if v_campaign_id is null then
    select c.id into v_campaign_id
    from campaigns c
    where c.organization_id = p_org_id
      and c.state != 'archived'
    order by c.created_at asc
    limit 1;
  end if;

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

grant execute on function public.create_ambassador_invitation(uuid, text, text, text, timestamptz, uuid) to authenticated, service_role;
