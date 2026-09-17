-- Per-site billing: a site can only be published while its retainer
-- subscription is active. Payment state is written by the Stripe webhook
-- (via the service-role key), which bypasses RLS — no new policies needed.

alter table public.sites
  add column if not exists billing_status text not null default 'unpaid'
    check (billing_status in ('unpaid', 'active', 'past_due', 'canceled'));

alter table public.sites
  add column if not exists stripe_customer_id text;

alter table public.sites
  add column if not exists stripe_subscription_id text;

create index if not exists sites_stripe_subscription_id_idx on public.sites (stripe_subscription_id);
