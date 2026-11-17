-- Sign-up by invitation. An admin adds an email address; only those
-- addresses can create an account. Enforced in the database, on auth.users
-- itself, so it holds however the sign-up arrives: the app's form, or a
-- direct call to Supabase with the public key from the browser bundle.
-- Accounts that already exist are untouched.

create table public.signup_invites (
  email text primary key check (email = lower(btrim(email)) and email like '%_@_%'),
  note text check (char_length(note) <= 200),
  invited_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  -- Set when the account is created with this address.
  used_at timestamptz
);

alter table public.signup_invites enable row level security;
create policy "admins read invites" on public.signup_invites
  for select to authenticated
  using (exists (select 1 from public.app_admins a where a.user_id = (select auth.uid())));
create policy "admins add invites" on public.signup_invites
  for insert to authenticated
  with check (exists (select 1 from public.app_admins a where a.user_id = (select auth.uid())));
create policy "admins remove invites" on public.signup_invites
  for delete to authenticated
  using (exists (select 1 from public.app_admins a where a.user_id = (select auth.uid())));
grant select, insert, delete on public.signup_invites to authenticated;
grant all on public.signup_invites to service_role;
create index signup_invites_invited_by_idx on public.signup_invites (invited_by);

-- Runs before Supabase saves a new account. No invitation: the sign-up is
-- refused (Supabase reports "Database error saving new user", which the app
-- turns into a plain sentence). With one: it is marked used.
create function public.require_signup_invite()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.signup_invites
     set used_at = coalesce(used_at, now())
   where email = lower(btrim(new.email));
  if not found then
    raise exception 'sign-up is by invitation only' using errcode = 'P0001';
  end if;
  return new;
end;
$$;
revoke all on function public.require_signup_invite() from public, anon, authenticated;

create trigger require_signup_invite
  before insert on auth.users
  for each row execute function public.require_signup_invite();
