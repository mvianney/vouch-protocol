-- Migration: widen trust_score and raw_avg_score to handle any numeric value
-- the 8004 indexer may return (quality_score values can exceed 100 during
-- ATOM calibration). Also adds a clamp guard so wildly high scores don't
-- break the sort logic.

-- Widen the columns to numeric(10,4) — no upper bound on integer part
alter table public.agents
  alter column trust_score   type numeric(10, 4),
  alter column raw_avg_score type numeric(10, 4),
  alter column confidence    type numeric(8,  6);

-- Re-create the trust_score index (column type changed)
drop index if exists agents_trust_score_idx;
create index agents_trust_score_idx on public.agents (trust_score desc);

comment on column public.agents.trust_score is
  'ATOM quality_score: confidence-weighted reputation score. May exceed 100 during ATOM calibration periods.';
