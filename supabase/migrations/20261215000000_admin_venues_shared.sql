-- Ski areas added by the app's admin (rows in app_admins: today, the owner's
-- own account) go on the shared list for every user. Everyone else's
-- additions stay their own, as before. Tied to the admin role rather than to
-- an address, so it follows whoever runs the app; there is one admin today.

-- An admin's new venue is saved shared (no owner), whatever the app sent.
create function public.share_admin_venue()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if exists (select 1 from public.app_admins a where a.user_id = (select auth.uid())) then
    new.user_id := null;
  end if;
  return new;
end;
$$;

create trigger share_admin_venue
  before insert on public.venues
  for each row execute function public.share_admin_venue();

-- …which the insert rule then has to allow: only an admin may add a shared venue.
create policy "admins add shared venues" on public.venues
  for insert to authenticated
  with check (user_id is null
              and exists (select 1 from public.app_admins a where a.user_id = (select auth.uid())));

-- The admin's existing venues join the shared list. Sessions, conditions and
-- home venues that name them are unchanged: they keep the same id.
update public.venues set user_id = null
  where user_id in (select user_id from public.app_admins);
