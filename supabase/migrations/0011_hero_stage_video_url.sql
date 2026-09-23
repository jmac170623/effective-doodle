-- Hero transformation redesign: each stage photo gets its own independent
-- animated clip (subtle motion within that single photo, reusing the
-- already-proven single-image Higgsfield endpoint) rather than one
-- AI-blended morph across all stages. Playback stitches the clips together
-- as visitors scroll — see components/site/HeroStageScrubVideo.tsx.

alter table public.site_hero_stages
  add column if not exists video_url text;
