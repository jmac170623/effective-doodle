-- Custom domains: a site can either connect a domain the customer already
-- owns, or buy a new one through Vercel's Domain Registrar API (real money
-- moves through the app's own Vercel account for a purchase — see
-- lib/vercelDomains.ts and README for the full flow).

alter table public.sites
  add column if not exists custom_domain text,
  add column if not exists domain_status text not null default 'none',
  add column if not exists domain_source text,
  -- Purely a UX hint: what the owner typed in onboarding when they chose
  -- "I'd like to buy one" but hadn't paid yet — prefills the manage
  -- dashboard's domain search box. Cleared once a purchase completes.
  add column if not exists desired_domain text;

alter table public.sites
  drop constraint if exists sites_domain_status_check;
alter table public.sites
  add constraint sites_domain_status_check check (domain_status in ('none', 'pending_dns', 'active', 'error'));

alter table public.sites
  drop constraint if exists sites_domain_source_check;
alter table public.sites
  add constraint sites_domain_source_check check (domain_source is null or domain_source in ('connected', 'purchased'));

create unique index if not exists sites_custom_domain_key
  on public.sites (custom_domain)
  where custom_domain is not null;

-- Audit trail for real domain purchases, and the bridge between the async
-- Stripe checkout -> webhook -> Vercel purchase steps. The row is created
-- (status 'pending_payment') before the customer is sent to Stripe
-- Checkout, since the registrant contact info and the price they agreed
-- to need to survive until the webhook fires.
create table if not exists public.domain_purchases (
  id text primary key,
  site_id text not null references public.sites (id) on delete cascade,
  domain text not null,
  years integer not null default 1,
  expected_price_usd numeric not null,
  charged_price_usd numeric not null,
  contact jsonb not null,
  status text not null default 'pending_payment' check (status in ('pending_payment', 'purchasing', 'completed', 'failed', 'refunded')),
  stripe_checkout_session_id text,
  stripe_payment_intent_id text,
  vercel_order_id text,
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists domain_purchases_site_id_idx on public.domain_purchases (site_id);

alter table public.domain_purchases enable row level security;

-- All writes go through the service-role client (checkout creation and the
-- Stripe webhook both need to act without an owner session) — owners only
-- need read access, for showing purchase history/status in the dashboard.
create policy "Owners can view their own domain purchases"
  on public.domain_purchases for select
  to authenticated
  using (
    exists (
      select 1 from public.sites s
      where s.id = domain_purchases.site_id
        and s.owner_id = auth.uid()
    )
  );
