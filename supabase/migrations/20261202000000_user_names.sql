-- The account holder's name: first name and last-name initial ("Finn P."),
-- asked for when the account is created. It is shown wherever the app used to
-- say "Me", and the initial tells two people with the same first name apart.

alter table public.profiles
  add column first_name text check (first_name is null or char_length(first_name) between 1 and 40),
  add column last_initial text check (last_initial is null or char_length(last_initial) = 1);

-- New accounts: the sign-up form passes both in the user's metadata. Anything
-- missing or malformed is simply left empty; the app asks for it later.
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  first text := nullif(left(btrim(coalesce(new.raw_user_meta_data ->> 'first_name', '')), 40), '');
  initial text := nullif(upper(left(btrim(coalesce(new.raw_user_meta_data ->> 'last_initial', '')), 1)), '');
begin
  insert into public.profiles (id, first_name, last_initial) values (new.id, first, initial);
  return new;
end;
$$;

-- security_hardening revoked execute on the trigger function from the API
-- roles; create or replace keeps those grants, but say it again to be sure.
revoke all on function public.handle_new_user() from public, anon, authenticated;

-- Existing accounts: split the optional display name they may have typed.
update public.profiles
set first_name = left(split_part(btrim(display_name), ' ', 1), 40),
    last_initial = nullif(upper(left(btrim(substr(btrim(display_name), char_length(split_part(btrim(display_name), ' ', 1)) + 1)), 1)), '')
where first_name is null and nullif(btrim(display_name), '') is not null;
