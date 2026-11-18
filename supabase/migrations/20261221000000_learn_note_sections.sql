-- More sections for waxing notes: where to stay, eat and buy wax on a trip.
alter table public.learn_notes drop constraint learn_notes_section_check;
alter table public.learn_notes add constraint learn_notes_section_check
  check (section in ('instructions', 'products', 'how_to', 'accommodation', 'restaurants', 'shops', 'other'));
