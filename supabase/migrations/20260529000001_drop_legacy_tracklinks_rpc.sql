-- Remove the pre-event-scope overload so PostgREST always resolves the 2-arg function.
drop function if exists public.list_org_tracklinks(uuid);
