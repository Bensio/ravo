-- ============================================================================
-- 20260521000004_auth_user_sync.sql
-- Sync Supabase Auth users into public.users (id = auth.uid()).
-- ============================================================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, email, email_verified_at, display_name)
  values (
    new.id,
    coalesce(new.email, new.raw_user_meta_data->>'email'),
    new.email_confirmed_at,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name')
  )
  on conflict (id) do update set
    email = excluded.email,
    email_verified_at = excluded.email_verified_at;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Allow users to insert their own row if trigger missed (edge case)
create policy users_self_insert on users
  for insert with check (id = auth.uid());

-- ============================================================================
-- create_organization — onboarding: any authenticated user can create an org
-- ============================================================================
create or replace function public.create_organization(
  p_name text,
  p_slug text,
  p_country char(2) default 'NL'
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org_id uuid;
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception 'not authenticated';
  end if;

  if p_slug !~ '^[a-z0-9][a-z0-9-]{1,62}[a-z0-9]$' then
    raise exception 'invalid slug';
  end if;

  insert into organizations (slug, name, country)
  values (p_slug, p_name, p_country)
  returning id into v_org_id;

  insert into memberships (user_id, organization_id, role, accepted_at)
  values (v_user_id, v_org_id, 'owner', now());

  return v_org_id;
end;
$$;

comment on function public.create_organization is
  'Onboarding: creates org + owner membership for the current auth user.';

grant execute on function public.create_organization to authenticated;
