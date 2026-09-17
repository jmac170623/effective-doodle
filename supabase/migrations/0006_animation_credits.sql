-- Higgsfield photo-to-video animations, gated per site: 3 free, then a
-- paid credit (one-time Stripe payment) is consumed per extra animation.

alter table public.sites
  add column if not exists animation_credits integer not null default 0;

-- Atomic increment so a retried/duplicate Stripe webhook delivery can't
-- race a read-then-write update into double-crediting a site.
create or replace function public.increment_animation_credits(p_site_id text, p_count integer)
returns void
language sql
security definer
set search_path = public
as $$
  update public.sites
  set animation_credits = animation_credits + p_count
  where id = p_site_id;
$$;

create table if not exists public.site_animations (
  id text primary key,
  site_id text not null references public.sites (id) on delete cascade,
  image_id text not null references public.site_images (id) on delete cascade,
  status text not null default 'processing'
    check (status in ('processing', 'completed', 'failed')),
  video_url text,
  used_credit boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists site_animations_site_id_idx on public.site_animations (site_id);

alter table public.site_animations enable row level security;

-- Completed animations play on the public site, so anyone can see those.
-- Owners can see their own in every state (including in-progress/failed,
-- for the manage dashboard's status UI).
create policy "Public can view completed animations"
  on public.site_animations for select
  to anon, authenticated
  using (status = 'completed');

create policy "Owners can view all animations for their own sites"
  on public.site_animations for select
  to authenticated
  using (
    exists (
      select 1 from public.sites s
      where s.id = site_animations.site_id
        and s.owner_id = auth.uid()
    )
  );

create policy "Owners can create animations for their own sites"
  on public.site_animations for insert
  to authenticated
  with check (
    exists (
      select 1 from public.sites s
      where s.id = site_animations.site_id
        and s.owner_id = auth.uid()
    )
  );

create policy "Owners can update animations for their own sites"
  on public.site_animations for update
  to authenticated
  using (
    exists (
      select 1 from public.sites s
      where s.id = site_animations.site_id
        and s.owner_id = auth.uid()
    )
  );
