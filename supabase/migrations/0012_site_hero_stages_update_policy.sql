-- The actual root cause of every "hero animation marked completed with no
-- real video clips" incident: site_hero_stages never had an UPDATE policy
-- at all (only INSERT/DELETE/SELECT), so every UPDATE from the owner's own
-- authenticated session silently matched zero rows under RLS's default-deny
-- — not because the stage row was missing, just blocked. Confirmed via a
-- real server log: "Hero stage ... no longer exists" (our own zero-row
-- guard firing) for a stage that demonstrably still existed in the table.

create policy "Owners can update hero stage photos for their own sites"
  on public.site_hero_stages for update
  to authenticated
  using (
    exists (
      select 1 from public.sites s
      where s.id = site_hero_stages.site_id
        and s.owner_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.sites s
      where s.id = site_hero_stages.site_id
        and s.owner_id = auth.uid()
    )
  );
