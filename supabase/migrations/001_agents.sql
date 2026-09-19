-- Migration: agents table for Vouch local registry cache
--
-- Run this in your Supabase SQL editor or via supabase db push.
-- The table mirrors the on-chain 8004 agent registry, synced periodically.

create table if not exists public.agents (
  -- Primary key: the on-chain NFT asset public key (base58)
  asset_id          text        primary key,

  -- Display metadata (from NFT name + IPFS agent manifest)
  name              text,
  description       text,

  -- OASF skill taxonomy paths, e.g. ['natural_language_processing/...']
  skills            text[]      default '{}',

  -- Agent endpoint (MCP / A2A / OASF service URL)
  service_endpoint  text,

  -- On-chain owner wallet (base58)
  owner_wallet      text        not null,

  -- Reputation data from 8004 indexer
  -- quality_score: ATOM-adjusted 0–100 score (confidence-weighted)
  trust_score       numeric(6,2) default 0,
  -- raw_avg_score: unweighted average of all feedback values
  raw_avg_score     numeric(6,2) default 0,
  -- confidence: 0–1 confidence factor (low = sparse feedback)
  confidence        numeric(5,4) default 0,
  feedback_count    integer      default 0,

  -- Sync bookkeeping
  last_synced_at    timestamptz  default now(),
  created_at        timestamptz  default now()
);

-- Fast text search index across name + description
create index if not exists agents_name_idx        on public.agents using gin(to_tsvector('english', coalesce(name, '')));
create index if not exists agents_description_idx on public.agents using gin(to_tsvector('english', coalesce(description, '')));
-- Fast trust_score sort
create index if not exists agents_trust_score_idx on public.agents (trust_score desc);
-- Skills array contains
create index if not exists agents_skills_idx      on public.agents using gin(skills);
-- Owner wallet lookups
create index if not exists agents_owner_idx       on public.agents (owner_wallet);

comment on table public.agents is
  'Local cache of on-chain 8004 agent registry entries, synced from the 8004 indexer.';
comment on column public.agents.asset_id is
  'On-chain NFT asset public key (base58). Unique per agent.';
comment on column public.agents.trust_score is
  'ATOM quality_score: confidence-weighted reputation score (0–100).';
comment on column public.agents.raw_avg_score is
  'Unweighted average of all feedback values (0–100).';
comment on column public.agents.confidence is
  'Confidence factor 0–1 (sparse feedback = low). Used for ranking.';
