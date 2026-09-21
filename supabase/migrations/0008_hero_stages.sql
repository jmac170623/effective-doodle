-- Ordered "stage" photos (before/during/after) for a site's hero section.
-- Higgsfield's start_image/end_image (+ image_references "storyboard")
-- models can transition between these into one video, rather than
-- inventing a build history from a single finished photo — see the
-- comment in lib/higgsfieldAnimator.ts for how this was verified.

create table if not exists public.site_hero_stages (
  id text primary key,
  site_id text not null references public.sites (id) on delete cascade,
  url text not null,
  stage_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists site_hero_stages_site_id_idx on public.site_hero_stages (site_id);

alter table public.site_hero_stages enable row level security;

create policy "Public can view hero stage photos"
  on public.site_hero_stages for select
  to anon, authenticated
  using (true);

create policy "Owners can add hero stage photos to their own sites"
  on public.site_hero_stages for insert
  to authenticated
  with check (
    exists (
      select 1 from public.sites s
      where s.id = site_hero_stages.site_id
        and s.owner_id = auth.uid()
    )
  );

create policy "Owners can remove hero stage photos from their own sites"
  on public.site_hero_stages for delete
  to authenticated
  using (
    exists (
      select 1 from public.sites s
      where s.id = site_hero_stages.site_id
        and s.owner_id = auth.uid()
    )
  );

-- A hero transformation animates several stage photos, not one gallery
-- photo, so image_id must be optional for those rows.
alter table public.site_animations
  alter column image_id drop not null;

alter table public.site_animations
  add column if not exists is_hero boolean not null default false;
