-- Trade Website Generator — core schema
-- Run this once in the Supabase SQL Editor (or via `supabase db push`).

create table if not exists public.sites (
  id text primary key,
  owner_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  status text not null default 'draft' check (status in ('draft', 'published')),
  onboarding jsonb not null,
  generated jsonb not null,
  feedback_history jsonb not null default '[]'::jsonb
);

create index if not exists sites_owner_id_idx on public.sites (owner_id);

create table if not exists public.leads (
  id text primary key,
  site_id text not null references public.sites (id) on delete cascade,
  created_at timestamptz not null default now(),
  name text,
  email text,
  message text
);

create index if not exists leads_site_id_idx on public.leads (site_id);

alter table public.sites enable row level security;
alter table public.leads enable row level security;

-- Anyone (including logged-out visitors) can view a published site.
create policy "Public can view published sites"
  on public.sites for select
  to anon, authenticated
  using (status = 'published');

-- An owner can always see their own sites, published or draft.
create policy "Owners can view their own sites"
  on public.sites for select
  to authenticated
  using (owner_id = auth.uid());

-- A signed-in user can only create sites owned by themselves.
create policy "Owners can insert their own sites"
  on public.sites for insert
  to authenticated
  with check (owner_id = auth.uid());

-- A signed-in user can only edit their own sites.
create policy "Owners can update their own sites"
  on public.sites for update
  to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

-- Site visitors (anonymous) submit leads through the public contact form.
create policy "Anyone can submit a lead"
  on public.leads for insert
  to anon, authenticated
  with check (true);

-- Only the owning tradesperson can read the leads sent to their site.
create policy "Owners can view their own leads"
  on public.leads for select
  to authenticated
  using (
    exists (
      select 1 from public.sites s
      where s.id = leads.site_id
        and s.owner_id = auth.uid()
    )
  );
