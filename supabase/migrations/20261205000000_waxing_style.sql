-- How the account holder likes to wax: "guided" follows the plan and its
-- step-by-step; "expert" picks their own waxes and records them in the full
-- form. Null means not chosen yet, which the app treats as guided and which
-- keeps "Choose how you wax" open on the getting-started checklist.
alter table public.profiles
  add column waxing_style text check (waxing_style in ('guided', 'expert'));
