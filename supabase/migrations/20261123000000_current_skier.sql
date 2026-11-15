-- The skier being waxed for right now, picked on Today and used as the
-- starting choice on other screens. Null means the account holder ("Me").
-- The foreign key includes the account, so only one's own skiers can be
-- picked; removing that skier goes back to Me.

alter table public.profiles add column current_skier_id uuid;
alter table public.profiles
  add constraint profiles_current_skier_fkey foreign key (current_skier_id, id)
  references public.skiers (id, user_id) on delete set null (current_skier_id);
