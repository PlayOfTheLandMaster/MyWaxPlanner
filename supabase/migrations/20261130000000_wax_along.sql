-- Recording the waxing itself on a session (session flow, step 3).
--
-- wax_steps_done: which of the plan's procedure steps the skier has ticked,
--   by their position in recommendations.procedure_steps (0-based). Kept on
--   the session so the checklist and the wax-along mode agree on every device;
--   until now ticks lived only in the browser.
-- waxed_at: when the skier finished waxing ("Done waxing"). A planned session
--   with this set is ready to ski.
--
-- Both are written only by the session page's own actions; save_wax_session()
-- (the full form) lists its columns explicitly and leaves them alone. Row
-- Level Security on wax_sessions already limits them to the session's owner.

alter table public.wax_sessions
  add column wax_steps_done smallint[] not null default '{}'
    check (cardinality(wax_steps_done) <= 200),
  add column waxed_at timestamptz;
