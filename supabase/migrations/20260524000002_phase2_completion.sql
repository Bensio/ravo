-- ============================================================================
-- 20260524000002_phase2_completion.sql
-- Trackers table, link RPCs (list/update/delete), redirect RPC update.
-- Completes Phase 2 without service-role for normal link operations.
-- ============================================================================

-- ============================================================================
-- trackers (provider-native attribution objects; Phase 3 createTracker fills these)
-- ============================================================================
create table trackers (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  provider_connection_id uuid not null references provider_connections(id) on delete restrict,
  link_id uuid not null references links(id) on delete cascade unique,
  provider_tracker_id text not null,
  created_at timestamptz not null default now(),
  unique (provider_connection_id, provider_tracker_id)
);

create index trackers_org_idx on trackers (organization_id);
create index trackers_link_idx on trackers (link_id);

alter table trackers enable row level security;

create policy trackers_org_select on trackers
  for select using (
    organization_id in (select public.user_organization_ids())
  );

create policy trackers_org_write on trackers
  for insert with check (
    public.has_org_role(organization_id, array['owner', 'admin', 'manager'])
  );

create trigger trackers_audit
  after insert or update or delete on trackers
  for each row execute function audit_log_trigger('tracker');

-- ============================================================================
-- list_org_tracklinks — staff read with SQL click counts (no N+1)
-- ============================================================================
create or replace function public.list_org_tracklinks(p_org_id uuid)
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
  order by l.created_at desc;
end;
$$;

grant execute on function public.list_org_tracklinks(uuid) to authenticated;

-- ============================================================================
-- list_ambassador_tracklinks — ambassador Share surface
-- ============================================================================
create or replace function public.list_ambassador_tracklinks()
returns table (
  id uuid,
  code text,
  label text,
  disabled boolean,
  created_at timestamptz,
  click_count bigint,
  festival_name text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ambassador_id uuid;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  select a.id into v_ambassador_id
  from ambassadors a
  where a.user_id = auth.uid();

  if v_ambassador_id is null then
    return;
  end if;

  return query
  select
    l.id,
    l.code,
    l.label,
    l.disabled,
    l.created_at,
    coalesce((
      select count(*)::bigint
      from clicks c
      where c.link_id = l.id and c.organization_id = l.organization_id
    ), 0) as click_count,
    o.name as festival_name
  from links l
  join organizations o on o.id = l.organization_id
  where l.ambassador_id = v_ambassador_id
    and l.disabled = false
  order by l.created_at desc;
end;
$$;

grant execute on function public.list_ambassador_tracklinks() to authenticated;

-- ============================================================================
-- update_tracklink
-- ============================================================================
create or replace function public.update_tracklink(
  p_org_id uuid,
  p_link_id uuid,
  p_disabled boolean
)
returns table (id uuid, disabled boolean, code text)
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  if not public.has_org_role(p_org_id, array['owner', 'admin', 'manager']) then
    raise exception 'forbidden';
  end if;

  return query
  update links
  set disabled = p_disabled
  where id = p_link_id and organization_id = p_org_id
  returning links.id, links.disabled, links.code;
end;
$$;

grant execute on function public.update_tracklink(uuid, uuid, boolean) to authenticated;

-- ============================================================================
-- delete_tracklink
-- ============================================================================
create or replace function public.delete_tracklink(p_org_id uuid, p_link_id uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_code text;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  if not public.has_org_role(p_org_id, array['owner', 'admin', 'manager']) then
    raise exception 'forbidden';
  end if;

  select l.code into v_code
  from links l
  where l.id = p_link_id and l.organization_id = p_org_id;

  if v_code is null then
    return null;
  end if;

  delete from links
  where id = p_link_id and organization_id = p_org_id;

  return v_code;
end;
$$;

grant execute on function public.delete_tracklink(uuid, uuid) to authenticated;

-- ============================================================================
-- get_link_for_redirect — include native tracker id for Weeztix tier-1
-- ============================================================================
create or replace function public.get_link_for_redirect(p_code text)
returns jsonb
language sql
security definer
set search_path = public
stable
as $$
  select jsonb_build_object(
    'link_id', l.id,
    'organization_id', l.organization_id,
    'campaign_id', l.campaign_id,
    'ambassador_id', l.ambassador_id,
    'destination_url', l.destination_url,
    'disabled', l.disabled,
    'label', l.label,
    'campaign_slug', c.slug,
    'ambassador_slug', coalesce(nullif(trim(a.display_handle), ''), a.id::text),
    'provider_tracker_id', t.provider_tracker_id
  )
  from links l
  join campaigns c on c.id = l.campaign_id and c.organization_id = l.organization_id
  join ambassadors a on a.id = l.ambassador_id
  left join trackers t on t.link_id = l.id and t.organization_id = l.organization_id
  where l.code = p_code
  limit 1;
$$;
