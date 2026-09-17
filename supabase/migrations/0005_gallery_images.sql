-- Real uploaded gallery photos, replacing the "add later" placeholder
-- slots once a tradesperson uploads their own before/after shots.

insert into storage.buckets (id, name, public)
values ('gallery', 'gallery', true)
on conflict (id) do nothing;

create table if not exists public.site_images (
  id text primary key,
  site_id text not null references public.sites (id) on delete cascade,
  url text not null,
  caption text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists site_images_site_id_idx on public.site_images (site_id);

alter table public.site_images enable row level security;

-- Photos are shown on the public site, so anyone can view the metadata.
create policy "Public can view site images"
  on public.site_images for select
  to anon, authenticated
  using (true);

create policy "Owners can add photos to their own sites"
  on public.site_images for insert
  to authenticated
  with check (
    exists (
      select 1 from public.sites s
      where s.id = site_images.site_id
        and s.owner_id = auth.uid()
    )
  );

create policy "Owners can remove photos from their own sites"
  on public.site_images for delete
  to authenticated
  using (
    exists (
      select 1 from public.sites s
      where s.id = site_images.site_id
        and s.owner_id = auth.uid()
    )
  );

-- Storage: uploads must land under {siteId}/... and the uploader must own
-- that site. The bucket is public for read, so no SELECT policy is needed
-- for the public site to display photos.
create policy "Owners can upload photos for their own sites"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'gallery'
    and exists (
      select 1 from public.sites s
      where s.id = (storage.foldername(name))[1]
        and s.owner_id = auth.uid()
    )
  );

create policy "Owners can delete photos from their own sites"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'gallery'
    and exists (
      select 1 from public.sites s
      where s.id = (storage.foldername(name))[1]
        and s.owner_id = auth.uid()
    )
  );
