-- The admin can delete a shared venue added by mistake. Everyone else still
-- only hides shared venues from their own lists.

create policy "admins delete shared venues" on public.venues
  for delete to authenticated
  using (user_id is null
         and exists (select 1 from public.app_admins a where a.user_id = (select auth.uid())));

-- Whoever's sessions named the venue keep its name as plain text
-- (wax_sessions.venue_label, which History shows when the venue is gone),
-- including other users' sessions the admin cannot otherwise touch: hence
-- security definer, limited to filling a blank label on this venue's rows.
create function public.keep_venue_name()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.wax_sessions
    set venue_label = old.name
    where venue_id = old.id and venue_label is null;
  return old;
end;
$$;

revoke execute on function public.keep_venue_name() from public, anon, authenticated;

create trigger keep_venue_name
  before delete on public.venues
  for each row execute function public.keep_venue_name();
