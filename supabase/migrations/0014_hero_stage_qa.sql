-- Automated quality check on each generated hero stage clip (see
-- lib/heroStageQA.ts), since Higgsfield's own "completed" status says
-- nothing about whether the clip actually looks right — confirmed clips
-- have come back frozen, or showing a hand doing the work, under that
-- same status. qa_passed is null until a check actually runs (or if the
-- check itself couldn't run, e.g. a transient ffmpeg/network failure) —
-- distinct from false, which means the check ran and found a real
-- problem worth a free regeneration.

alter table public.site_hero_stages
  add column if not exists qa_passed boolean,
  add column if not exists qa_note text;
