-- A layer can be brushed in (a wax worked into the base with a brush, e.g. a
-- powder or a paste on a roto or hand brush), beside ironed, corked and the rest.
alter table public.wax_session_layers drop constraint wax_session_layers_method_check;
alter table public.wax_session_layers add constraint wax_session_layers_method_check
  check (method in ('iron', 'rub_on', 'liquid', 'powder', 'cork', 'spray', 'brush'));
