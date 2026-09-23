-- Quote accuracy: not every material scales with room area. Tiles/paint
-- scale with area, pipe/cable/trim with length, fixtures with count, and
-- concrete/aggregate/screed with volume — this column records which
-- measurement each material's suggested_qty (small/medium/large) is
-- actually calibrated against, so the quote engine stops estimating things
-- like pipe runs and fixture counts off a guessed square-metre figure.

alter table public.materials
  add column if not exists measure_kind text;

update public.materials set measure_kind = case id
  when 'plumb_pipe_15mm' then 'length'
  when 'plumb_fitting' then 'count'
  when 'plumb_toilet' then 'count'
  when 'plumb_basin' then 'count'
  when 'plumb_shower' then 'count'
  when 'plumb_bath' then 'count'
  when 'plumb_isolation_valve' then 'count'
  when 'plumb_sealant' then 'count'
  when 'elec_cable_2_5' then 'length'
  when 'elec_socket_single' then 'count'
  when 'elec_socket_double' then 'count'
  when 'elec_switch' then 'count'
  when 'elec_consumer_unit' then 'count'
  when 'elec_mcb' then 'count'
  when 'elec_downlight' then 'count'
  when 'tile_wall' then 'area'
  when 'tile_floor' then 'area'
  when 'tile_adhesive' then 'area'
  when 'tile_grout' then 'area'
  when 'tile_spacers' then 'area'
  when 'tile_trim' then 'length'
  when 'paint_emulsion' then 'area'
  when 'paint_primer' then 'area'
  when 'paint_gloss' then 'area'
  when 'paint_tape' then 'area'
  when 'paint_roller_set' then 'area'
  when 'paint_dust_sheet' then 'area'
  when 'gen_fixings' then 'count'
  when 'gen_sealant' then 'count'
  when 'gen_timber' then 'length'
  when 'gen_waste' then 'job'
  else measure_kind
end
where measure_kind is null;

alter table public.materials
  alter column measure_kind set not null,
  add constraint materials_measure_kind_check check (measure_kind in ('area', 'volume', 'length', 'count', 'job'));

-- Volume-based materials didn't exist in the catalog at all until now —
-- add a few real groundworks items under "general" so m³-driven jobs
-- (a slab, a base, a driveway) have real line items to estimate.
insert into public.materials (id, category, name, unit, unit_price, measure_kind, suggested_qty) values
  ('gen_concrete_readymix', 'general', 'Ready-mix concrete', 'per m³', 120.00, 'volume', '{"small": 0.5, "medium": 2, "large": 6}'),
  ('gen_subbase_aggregate', 'general', 'Sub-base aggregate (MOT Type 1)', 'per m³', 45.00, 'volume', '{"small": 0.5, "medium": 2, "large": 6}'),
  ('gen_sand_ballast', 'general', 'Sharp sand & ballast mix', 'per m³', 55.00, 'volume', '{"small": 0.5, "medium": 2, "large": 6}')
on conflict (id) do nothing;
