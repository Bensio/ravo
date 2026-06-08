-- Fix update_tracklink: raise when no row matched (avoid silent no-op).
-- Grant set_current_org to authenticated (used by requirePermission middleware).

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
declare
  v_id uuid;
  v_disabled boolean;
  v_code text;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  if not public.has_org_role(p_org_id, array['owner', 'admin', 'manager']) then
    raise exception 'forbidden';
  end if;

  update links
  set disabled = p_disabled
  where id = p_link_id and organization_id = p_org_id
  returning links.id, links.disabled, links.code
  into v_id, v_disabled, v_code;

  if v_id is null then
    raise exception 'link not found';
  end if;

  return query select v_id, v_disabled, v_code;
end;
$$;

grant execute on function public.set_current_org(uuid) to authenticated;

-- links: allow staff delete via RLS (fallback when RPC unavailable)
create policy links_org_delete on links
  for delete using (
    public.has_org_role(organization_id, array['owner', 'admin', 'manager'])
  );
