/**
 * lib/registry/search.ts
 *
 * Searches the local Supabase `agents` table by keyword, returning results
 * sorted by a confidence-adjusted trust score.
 *
 * Ranking algorithm — "Wilson-lite" confidence adjustment:
 *
 *   adjusted_score = trust_score × confidence_weight
 *
 * where confidence_weight is derived from the agent's own `confidence` field
 * (0–1, provided by the 8004 ATOM system) blended with a feedback-count
 * floor guard: agents with fewer than MIN_FEEDBACK_COUNT are further
 * penalised so they never outrank well-established agents purely on a
 * high raw score.
 *
 *   weight = confidence × clamp(feedback_count / MIN_FEEDBACK_COUNT, 0, 1)^RAMP_EXP
 *
 * This means:
 *   - An agent with score=100 but 0 feedbacks → effective score ≈ 0
 *   - An agent with score=95 and 3 feedbacks  → effectively penalised
 *   - An agent with score=85 and 20 feedbacks → ranks above a 95-scorer with 2
 *
 * The ranking is done in-process after a Postgres text-search filter because
 * the adjustment formula involves cross-column arithmetic that's simpler here
 * than in a Postgres generated column.
 */

import { supabase } from "@/lib/db/supabase";

// ─── Config ───────────────────────────────────────────────────────────────────

/** Agents below this feedback count receive a progressive score penalty. */
const MIN_FEEDBACK_COUNT = 5;
/** Exponent that controls how steeply low-feedback agents are penalised. */
const RAMP_EXP = 0.6;
/** Max agents returned per search */
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AgentSearchResult {
  asset_id: string;
  name: string | null;
  description: string | null;
  skills: string[];
  service_endpoint: string | null;
  owner_wallet: string;
  trust_score: number;
  raw_avg_score: number;
  confidence: number;
  feedback_count: number;
  /** Computed ranking score — not stored, derived per-request */
  adjusted_score: number;
  last_synced_at: string;
}

export interface SearchOptions {
  query: string;
  limit?: number;
  /** Minimum feedback count filter (default: 0 = no filter) */
  min_feedback_count?: number;
}

export interface SearchResponse {
  results: AgentSearchResult[];
  total: number;
  query: string;
  duration_ms: number;
}

// ─── Ranking ─────────────────────────────────────────────────────────────────

/**
 * Compute the confidence-adjusted score used for ranking.
 *
 * Factors:
 *  1. `confidence`     — 8004 ATOM confidence (0–1): accounts for feedback
 *                        distribution quality, recency, and diversity.
 *  2. `feedback_count` — floor guard: agents below MIN_FEEDBACK_COUNT get an
 *                        additional ramp penalty so sparse agents can't
 *                        outrank established ones even if ATOM gave them a
 *                        high confidence due to a single strong feedback.
 *
 * The final score is on the same 0–100 scale as trust_score.
 */
function computeAdjustedScore(
  trustScore: number,
  confidence: number,
  feedbackCount: number
): number {
  // Feedback ramp: 0 → 0, 5+ → 1.0, with RAMP_EXP curvature
  const feedbackRamp = Math.min(feedbackCount / MIN_FEEDBACK_COUNT, 1) ** RAMP_EXP;

  // Blend the ATOM confidence with the feedback ramp
  // Both must be satisfied: an agent needs confidence AND enough feedback
  const weight = confidence * feedbackRamp;

  return Math.round(trustScore * weight * 100) / 100;
}

// ─── Search ───────────────────────────────────────────────────────────────────

/**
 * Search the local agents table by keyword.
 *
 * Matching: Postgres full-text search (websearch_to_tsquery) against
 * `name` and `description`. Skills are matched via a separate array-contains
 * check (case-insensitive substring).
 *
 * Fallback: if the query is very short (< 3 chars) or only digits/special
 * characters, we do a plain `ilike` on name instead of full-text search
 * to avoid tsquery parse errors.
 *
 * Results are post-sorted by adjusted_score descending.
 */
export async function searchAgents(
  options: SearchOptions
): Promise<SearchResponse> {
  const start = Date.now();
  const { query, min_feedback_count = 0 } = options;
  const limit = Math.min(options.limit ?? DEFAULT_LIMIT, MAX_LIMIT);

  if (!query || query.trim().length === 0) {
    return {
      results: [],
      total: 0,
      query,
      duration_ms: Date.now() - start,
    };
  }

  const trimmed = query.trim();

  // ── Build Supabase query ─────────────────────────────────────────────────
  // We fetch more than `limit` before ranking so we can sort and then slice.
  // Fetch up to MAX_LIMIT candidates from the DB, rank, return top `limit`.
  const fetchLimit = MAX_LIMIT;

  let dbQuery = supabase
    .from("agents")
    .select(
      "asset_id, name, description, skills, service_endpoint, owner_wallet, " +
      "trust_score, raw_avg_score, confidence, feedback_count, last_synced_at"
    );

  if (min_feedback_count > 0) {
    dbQuery = dbQuery.gte("feedback_count", min_feedback_count);
  }

  // Full-text search: use textSearch on name + description
  // Supabase textSearch uses to_tsvector internally with the configured column.
  // We run two separate OR conditions and merge client-side.
  const isSimpleQuery = trimmed.length < 3;
  const skillLower = trimmed.toLowerCase();

  let rows: AgentSearchResult[] = [];

  if (isSimpleQuery) {
    // Short query — plain ilike on name
    const { data, error } = await dbQuery
      .ilike("name", `%${trimmed}%`)
      .limit(fetchLimit);

    if (error) throw new Error(`Search DB error: ${error.message}`);
    rows = (data ?? []) as unknown as AgentSearchResult[];
  } else {
    // Full-text search on name and description (OR), plus skills substring
    // Extract meaningful search tokens for natural language prompts
    const STOP_WORDS = new Set([
      "the", "and", "this", "that", "for", "with", "from", "check", "get", "what",
      "are", "about", "your", "look", "into", "tell", "please", "can", "you",
      "all", "any", "some"
    ]);

    const rawTokens = trimmed
      .replace(/[^\w\s]/g, " ")
      .split(/\s+/)
      .map((t) => t.trim())
      .filter((t) => t.length >= 3 && !STOP_WORDS.has(t.toLowerCase()) && !t.match(/^[1-9A-HJ-NP-Za-km-z]{32,44}$/));

    const searchKeywords = rawTokens.length > 0 ? rawTokens : [trimmed];
    const tsQuery = searchKeywords.join(" | ");

    const [nameResult, descResult, skillsResult] = await Promise.all([
      supabase
        .from("agents")
        .select(
          "asset_id, name, description, skills, service_endpoint, owner_wallet, " +
          "trust_score, raw_avg_score, confidence, feedback_count, last_synced_at"
        )
        .textSearch("name", tsQuery, {
          config: "english",
        })
        .gte("feedback_count", min_feedback_count)
        .limit(fetchLimit),

      supabase
        .from("agents")
        .select(
          "asset_id, name, description, skills, service_endpoint, owner_wallet, " +
          "trust_score, raw_avg_score, confidence, feedback_count, last_synced_at"
        )
        .textSearch("description", tsQuery, {
          config: "english",
        })
        .gte("feedback_count", min_feedback_count)
        .limit(fetchLimit),

      // Query candidate agents ordered by trust score to match against skills array
      supabase
        .from("agents")
        .select(
          "asset_id, name, description, skills, service_endpoint, owner_wallet, " +
          "trust_score, raw_avg_score, confidence, feedback_count, last_synced_at"
        )
        .gte("feedback_count", min_feedback_count)
        .order("trust_score", { ascending: false })
        .limit(fetchLimit),
    ]);

    // Merge results, dedup by asset_id
    const seen = new Set<string>();
    const merged: AgentSearchResult[] = [];

    for (const result of [descResult, nameResult]) {
      for (const row of result.data ?? []) {
        const r = row as unknown as AgentSearchResult;
        if (!seen.has(r.asset_id)) {
          seen.add(r.asset_id);
          merged.push(r);
        }
      }
    }

    // From the broad candidates, add skill matches (substring match on any token)
    const lowerTokens = searchKeywords.map((k) => k.toLowerCase());
    for (const row of skillsResult.data ?? []) {
      const r = row as unknown as AgentSearchResult;
      if (seen.has(r.asset_id)) continue;
      const hasSkillMatch = (r.skills ?? []).some((skill) => {
        const s = skill.toLowerCase();
        return lowerTokens.some((t) => s.includes(t));
      });
      if (hasSkillMatch) {
        seen.add(r.asset_id);
        merged.push(r);
      }
    }

    rows = merged;
  }

  // Helper to compute token relevance score against agent name, description, and skills
  const lowerTokens = trimmed
    .replace(/[^\w\s]/g, " ")
    .toLowerCase()
    .split(/\s+/)
    .filter((w) => w.length >= 3 && !w.match(/^[1-9a-z]{32,44}$/i));

  const computeRelevance = (agent: AgentSearchResult): number => {
    let score = 0;
    const name = (agent.name || "").toLowerCase();
    const desc = (agent.description || "").toLowerCase();
    const skills = (agent.skills || []).map((s) => s.toLowerCase()).join(" ");

    for (const token of lowerTokens) {
      if (token.length < 3) continue;
      if (name.includes(token)) score += 4;
      if (desc.includes(token)) score += 2;
      if (skills.includes(token)) score += 2;
    }
    return score;
  };

  // ── Compute adjusted score, relevance, and sort ─────────────────────────────
  const ranked = rows
    .map((row) => {
      const adj = computeAdjustedScore(
        Number(row.trust_score),
        Number(row.confidence),
        Number(row.feedback_count)
      );
      const rel = computeRelevance(row);
      return {
        ...row,
        trust_score: Number(row.trust_score),
        raw_avg_score: Number(row.raw_avg_score),
        confidence: Number(row.confidence),
        feedback_count: Number(row.feedback_count),
        adjusted_score: adj,
        ranking_score: (rel * 100) + adj,
      };
    })
    .sort((a, b) => b.ranking_score - a.ranking_score)
    .slice(0, limit);

  return {
    results: ranked,
    total: ranked.length,
    query: trimmed,
    duration_ms: Date.now() - start,
  };
}
