-- Tracks where a material's current price actually came from and when it
-- was last refreshed, once prices are being pulled from a real price
-- comparison feed (lib/priceRefresh.ts) instead of typed in by hand. Both
-- nullable: rows never refreshed (or refreshed before this existed) just
-- show no provenance, same as the placeholder catalog today.

alter table public.materials
  add column if not exists price_source_url text,
  add column if not exists price_updated_at timestamptz;
