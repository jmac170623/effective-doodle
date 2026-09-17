-- Quote requests submitted through the instant quote calculator on a
-- published site. Mirrors the leads table's visibility rules.

create table if not exists public.quotes (
  id text primary key,
  site_id text not null references public.sites (id) on delete cascade,
  created_at timestamptz not null default now(),
  customer_name text not null,
  customer_email text not null,
  customer_phone text,
  service_name text not null,
  breakdown jsonb not null
);

create index if not exists quotes_site_id_idx on public.quotes (site_id);

alter table public.quotes enable row level security;

-- Site visitors (anonymous) submit quote requests through the public calculator.
create policy "Anyone can submit a quote request"
  on public.quotes for insert
  to anon, authenticated
  with check (true);

-- Only the owning tradesperson can read the quote requests sent to their site.
create policy "Owners can view their own quote requests"
  on public.quotes for select
  to authenticated
  using (
    exists (
      select 1 from public.sites s
      where s.id = quotes.site_id
        and s.owner_id = auth.uid()
    )
  );
