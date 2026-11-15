-- Birth year and month (so ages can be worked out) and weight, for each
-- skier and for the account holder ("Me", kept on profiles). All optional.
-- A month without a year means nothing, so the month needs the year.

alter table public.skiers
  add column birth_year smallint check (birth_year between 1920 and 2100),
  add column birth_month smallint check (birth_month between 1 and 12),
  add column weight_kg numeric(4, 1) check (weight_kg between 10 and 250),
  add constraint skiers_birth_month_needs_year check (birth_month is null or birth_year is not null);

alter table public.profiles
  add column birth_year smallint check (birth_year between 1920 and 2100),
  add column birth_month smallint check (birth_month between 1 and 12),
  add column weight_kg numeric(4, 1) check (weight_kg between 10 and 250),
  add constraint profiles_birth_month_needs_year check (birth_month is null or birth_year is not null);
