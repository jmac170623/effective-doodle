-- Shared materials/pricing catalog powering the quote calculator on every
-- generated site. Pricing is placeholder-branded ("Trade Supply Co") until a
-- real merchant partnership is signed — swap unit_price/merchant_label per
-- row (or bulk-load a real feed) with no code changes required.

create table if not exists public.materials (
  id text primary key,
  category text not null check (category in ('plumbing', 'electrical', 'tiling', 'painting', 'general')),
  name text not null,
  unit text not null,
  unit_price numeric(10, 2) not null,
  merchant_label text not null default 'Trade Supply Co',
  suggested_qty jsonb not null,
  created_at timestamptz not null default now()
);

create index if not exists materials_category_idx on public.materials (category);

alter table public.materials enable row level security;

-- Pricing is meant to be publicly visible — that's the point of the quote
-- calculator. Writes are admin-only (no insert/update/delete policy, so
-- only the Supabase SQL editor / service role can change pricing).
create policy "Public can view materials"
  on public.materials for select
  to anon, authenticated
  using (true);

insert into public.materials (id, category, name, unit, unit_price, suggested_qty) values
  ('plumb_pipe_15mm', 'plumbing', '15mm copper pipe', 'per metre', 3.20, '{"small": 4, "medium": 10, "large": 20}'),
  ('plumb_fitting', 'plumbing', 'Pipe fitting / elbow', 'each', 2.50, '{"small": 3, "medium": 8, "large": 16}'),
  ('plumb_toilet', 'plumbing', 'Toilet pan & cistern', 'each', 145.00, '{"small": 0, "medium": 1, "large": 1}'),
  ('plumb_basin', 'plumbing', 'Basin & pedestal', 'each', 95.00, '{"small": 0, "medium": 1, "large": 1}'),
  ('plumb_shower', 'plumbing', 'Shower mixer valve', 'each', 110.00, '{"small": 0, "medium": 1, "large": 1}'),
  ('plumb_bath', 'plumbing', 'Standard steel bath', 'each', 180.00, '{"small": 0, "medium": 0, "large": 1}'),
  ('plumb_isolation_valve', 'plumbing', 'Isolation valve', 'each', 8.50, '{"small": 2, "medium": 4, "large": 8}'),
  ('plumb_sealant', 'plumbing', 'Sanitary silicone sealant', 'tube', 6.00, '{"small": 1, "medium": 2, "large": 4}'),
  ('elec_cable_2_5', 'electrical', '2.5mm² twin & earth cable', 'per metre', 1.10, '{"small": 10, "medium": 25, "large": 60}'),
  ('elec_socket_single', 'electrical', 'Single socket outlet', 'each', 4.50, '{"small": 2, "medium": 4, "large": 10}'),
  ('elec_socket_double', 'electrical', 'Double socket outlet', 'each', 6.00, '{"small": 1, "medium": 4, "large": 10}'),
  ('elec_switch', 'electrical', 'Light switch', 'each', 4.00, '{"small": 1, "medium": 3, "large": 8}'),
  ('elec_consumer_unit', 'electrical', 'Consumer unit (10-way)', 'each', 120.00, '{"small": 0, "medium": 0, "large": 1}'),
  ('elec_mcb', 'electrical', 'MCB breaker', 'each', 9.50, '{"small": 0, "medium": 2, "large": 6}'),
  ('elec_downlight', 'electrical', 'Downlight fitting', 'each', 14.00, '{"small": 2, "medium": 6, "large": 12}'),
  ('tile_wall', 'tiling', 'Ceramic wall tiles', 'per m²', 22.00, '{"small": 4, "medium": 10, "large": 20}'),
  ('tile_floor', 'tiling', 'Floor tiles', 'per m²', 28.00, '{"small": 2, "medium": 6, "large": 14}'),
  ('tile_adhesive', 'tiling', 'Tile adhesive (20kg bag)', 'bag', 14.50, '{"small": 1, "medium": 3, "large": 6}'),
  ('tile_grout', 'tiling', 'Grout (5kg bag)', 'bag', 11.00, '{"small": 1, "medium": 2, "large": 4}'),
  ('tile_spacers', 'tiling', 'Tile spacers (pack)', 'pack', 3.00, '{"small": 1, "medium": 2, "large": 3}'),
  ('tile_trim', 'tiling', 'Edging trim strip', 'per metre', 4.50, '{"small": 2, "medium": 5, "large": 10}'),
  ('paint_emulsion', 'painting', 'Emulsion paint (5L)', 'tub', 28.00, '{"small": 1, "medium": 3, "large": 6}'),
  ('paint_primer', 'painting', 'Primer / undercoat (2.5L)', 'tub', 18.00, '{"small": 1, "medium": 2, "large": 4}'),
  ('paint_gloss', 'painting', 'Gloss / satin paint (2.5L)', 'tub', 22.00, '{"small": 1, "medium": 1, "large": 3}'),
  ('paint_tape', 'painting', 'Masking tape', 'roll', 3.50, '{"small": 2, "medium": 4, "large": 8}'),
  ('paint_roller_set', 'painting', 'Roller & tray set', 'each', 8.00, '{"small": 1, "medium": 2, "large": 4}'),
  ('paint_dust_sheet', 'painting', 'Dust sheet', 'each', 6.00, '{"small": 1, "medium": 3, "large": 6}'),
  ('gen_fixings', 'general', 'Fixings & fasteners (pack)', 'pack', 8.00, '{"small": 1, "medium": 2, "large": 4}'),
  ('gen_sealant', 'general', 'Sealant / adhesive', 'tube', 6.50, '{"small": 1, "medium": 2, "large": 4}'),
  ('gen_timber', 'general', 'Timber batten', 'per metre', 3.20, '{"small": 3, "medium": 8, "large": 16}'),
  ('gen_waste', 'general', 'Waste disposal / skip', 'per job', 120.00, '{"small": 0, "medium": 1, "large": 1}')
on conflict (id) do nothing;
