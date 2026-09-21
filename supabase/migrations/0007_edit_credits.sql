-- AI-powered feedback edits, gated per site: 5 free, then a purchased
-- credit (one-time Stripe payment) is consumed per extra edit.

alter table public.sites
  add column if not exists edit_credits integer not null default 0;

create or replace function public.increment_edit_credits(p_site_id text, p_count integer)
returns void
language sql
security definer
set search_path = public
as $$
  update public.sites
  set edit_credits = edit_credits + p_count
  where id = p_site_id;
$$;
