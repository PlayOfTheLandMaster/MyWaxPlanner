-- A wax is in your box once (its amount says how much is left), and a tool is
-- on your checklist once. The app already checked the first before inserting;
-- these make the database refuse a second row however it arrives (two taps,
-- two tabs).

alter table public.user_products
  add constraint user_products_one_per_product unique (user_id, product_id);

alter table public.user_tools
  add constraint user_tools_one_per_tool unique (user_id, tool_id);
