-- ============================================================================
-- 20260523000001_create_tracklink_rpc.sql
-- Security-definer link creation for authenticated org staff (bypasses insert RLS).
-- ============================================================================

create or replace function public.create_tracklink(
  p_org_id uuid,
  p_campaign_id uuid,
  p_ambassador_id uuid,
  p_destination_url text,
  p_code text,
  p_label text default null
)
returns table (id uuid, code text)
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

  if p_destination_url is null or length(trim(p_destination_url)) = 0 then
    raise exception 'invalid destination_url';
  end if;

  if p_code !~ '^[a-zA-Z0-9_-]{6,12}$' then
    raise exception 'invalid code';
  end if;

  if not exists (
    select 1 from campaigns c
    where c.id = p_campaign_id and c.organization_id = p_org_id
  ) then
    raise exception 'campaign not in org';
  end if;

  if not exists (
    select 1 from ambassador_campaigns ac
    where ac.organization_id = p_org_id
      and ac.campaign_id = p_campaign_id
      and ac.ambassador_id = p_ambassador_id
  ) then
    raise exception 'ambassador not on campaign';
  end if;

  return query
  insert into links (
    organization_id,
    campaign_id,
    ambassador_id,
    code,
    destination_url,
    label
  )
  values (
    p_org_id,
    p_campaign_id,
    p_ambassador_id,
    p_code,
    trim(p_destination_url),
    nullif(trim(p_label), '')
  )
  returning links.id, links.code;
end;
$$;

comment on function public.create_tracklink is
  'Creates a tracklink for org staff. Validates org role, campaign, and ambassador membership.';

grant execute on function public.create_tracklink to authenticated;

-- Align links RLS with membership helpers (avoids indirect policy recursion)
drop policy if exists links_org_select on links;
drop policy if exists links_org_write on links;
drop policy if exists links_org_update on links;

create policy links_org_select on links
  for select using (
    organization_id in (select public.user_organization_ids())
  );

create policy links_org_write on links
  for insert with check (
    public.has_org_role(organization_id, array['owner', 'admin', 'manager'])
  );

create policy links_org_update on links
  for update using (
    public.has_org_role(organization_id, array['owner', 'admin', 'manager'])
  );
