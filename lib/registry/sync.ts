/**
 * lib/registry/sync.ts
 *
 * Syncs agent data from the 8004 public indexer into Supabase.
 *
 * Strategy:
 *   1. Use IndexerClient.getAgents() with pagination to pull all indexed agents.
 *   2. For each agent, fetch its IPFS manifest to get description + skills
 *      (best-effort — skipped if IPFS fetch fails or times out).
 *   3. Upsert into the local Supabase `agents` table keyed on asset_id.
 *
 * The 8004 indexer is the canonical data source — it aggregates on-chain
 * events and provides quality_score (ATOM-weighted) + confidence values
 * that we store as trust_score and confidence respectively.
 *
 * Environment:
 *   HELIUS_RPC_URL                — Helius RPC endpoint (not used for indexer reads,
 *                                   but kept for future on-chain calls)
 *   SUPABASE_SERVICE_ROLE_KEY     — Required: admin Supabase key for server-side upsert
 *   NEXT_PUBLIC_SUPABASE_URL      — Supabase project URL
 *   INDEXER_URL                   — Optional: override default 8004 indexer URL
 */

import {
  IndexerClient,
  getDefaultIndexerUrl,
  type IndexedAgent,
} from "8004-solana";
import { supabaseAdmin } from "@/lib/db/supabase";

// ─── Config ──────────────────────────────────────────────────────────────────

const SYNC_BATCH_SIZE = 100;   // agents per indexer page
const UPSERT_BATCH_SIZE = 50;  // rows per Supabase upsert call
const IPFS_TIMEOUT_MS = 4_000;
const IPFS_GATEWAYS = [
  "https://ipfs.io/ipfs/",
  "https://cloudflare-ipfs.com/ipfs/",
  "https://gateway.pinata.cloud/ipfs/",
];

// Per-page fetch retry config
const PAGE_MAX_RETRIES = 3;    // retry a failing page up to 3 times
const PAGE_RETRY_DELAY_MS = 2_000; // wait 2 s between retries


// ─── Types ────────────────────────────────────────────────────────────────────

export interface AgentRow {
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
  last_synced_at: string;
}

export interface SyncResult {
  total_fetched: number;
  total_upserted: number;
  errors: string[];
  duration_ms: number;
  cluster: string;
}

// ─── IPFS manifest fetch ──────────────────────────────────────────────────────

interface AgentManifest {
  name?: string;
  description?: string;
  skills?: string[];
  services?: Array<{ type: string; value: string }>;
}

/**
 * Attempt to fetch the agent's IPFS manifest across multiple gateways.
 * Returns null on any failure — callers should handle gracefully.
 */
async function fetchIpfsManifest(
  uri: string | null
): Promise<AgentManifest | null> {
  if (!uri) return null;

  // Support ipfs:// and direct CID references
  const cid = uri.replace(/^ipfs:\/\//, "").replace(/^\/ipfs\//, "");
  if (!cid) return null;

  for (const gateway of IPFS_GATEWAYS) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), IPFS_TIMEOUT_MS);

      const res = await fetch(`${gateway}${cid}`, {
        signal: controller.signal,
        headers: { Accept: "application/json" },
      });
      clearTimeout(timeoutId);

      if (!res.ok) continue;
      const json = await res.json();
      return json as AgentManifest;
    } catch {
      // Try next gateway
    }
  }

  return null;
}

/**
 * Extract the primary service endpoint from a manifest.
 * Prefers MCP, then A2A, then OASF, then first available.
 */
function extractEndpoint(manifest: AgentManifest | null): string | null {
  if (!manifest?.services?.length) return null;
  const priority = ["mcp", "a2a", "oasf"];
  for (const type of priority) {
    const svc = manifest.services.find((s) =>
      s.type.toLowerCase().includes(type)
    );
    if (svc?.value) return svc.value;
  }
  return manifest.services[0]?.value ?? null;
}

// ─── Row mapper ───────────────────────────────────────────────────────────────

/**
 * Map an IndexedAgent (+ optional manifest) into an AgentRow for Supabase.
 *
 * trust_score  = quality_score  (ATOM confidence-weighted, 0–100)
 * raw_avg_score = raw_avg_score (unweighted mean)
 * confidence   = confidence     (0–1, sparse = low)
 */
function toAgentRow(
  agent: IndexedAgent,
  manifest: AgentManifest | null
): AgentRow {
  return {
    asset_id: agent.asset,
    name: manifest?.name ?? agent.nft_name ?? null,
    description: manifest?.description ?? null,
    skills: manifest?.skills ?? [],
    service_endpoint: extractEndpoint(manifest),
    owner_wallet: agent.owner,
    trust_score: agent.quality_score ?? 0,
    raw_avg_score: agent.raw_avg_score ?? 0,
    confidence: agent.confidence ?? 0,
    feedback_count: agent.feedback_count ?? 0,
    last_synced_at: new Date().toISOString(),
  };
}

// ─── Upsert batch ─────────────────────────────────────────────────────────────

async function upsertBatch(
  rows: AgentRow[],
  errors: string[]
): Promise<number> {
  const db = supabaseAdmin();
  const { error } = await db
    .from("agents")
    .upsert(rows, { onConflict: "asset_id" });

  if (error) {
    errors.push(`Supabase upsert error: ${error.message}`);
    return 0;
  }
  return rows.length;
}

// ─── Main sync ────────────────────────────────────────────────────────────────

/**
 * Sync all agents from the 8004 public indexer into Supabase.
 *
 * Pagination: fetches SYNC_BATCH_SIZE agents at a time until exhausted.
 * IPFS manifests: fetched concurrently per page, best-effort.
 * Upsert: batched in UPSERT_BATCH_SIZE chunks for Supabase performance.
 *
 * @param cluster - 'devnet' | 'mainnet-beta' (default: mainnet-beta)
 */
export async function syncAgents(
  cluster: "devnet" | "mainnet-beta" = "mainnet-beta"
): Promise<SyncResult> {
  const start = Date.now();
  const errors: string[] = [];
  let totalFetched = 0;
  let totalUpserted = 0;

  // Build indexer client — uses the public 8004 indexer for the given cluster.
  // Override with INDEXER_URL env var if you have a private instance.
  const indexerBaseUrl =
    process.env.INDEXER_URL ?? getDefaultIndexerUrl(cluster);

  const indexer = new IndexerClient({
    baseUrl: indexerBaseUrl,
    timeout: 15_000,
    retries: 2,
  });

  console.log(
    `[sync] Starting agent sync | cluster=${cluster} | indexer=${indexerBaseUrl}`
  );

  let offset = 0;
  let pageEmpty = false;
  let consecutiveFailures = 0;
  const MAX_CONSECUTIVE_FAILURES = 5; // abort if 5 pages in a row all fail

  while (!pageEmpty) {
    // ── Fetch page from indexer (with per-page retry) ────────────────────────
    let page: IndexedAgent[] | null = null;
    let lastFetchErr: unknown = null;

    for (let attempt = 1; attempt <= PAGE_MAX_RETRIES; attempt++) {
      try {
        page = await indexer.getAgents({
          limit: SYNC_BATCH_SIZE,
          offset,
        });
        break; // success — exit retry loop
      } catch (err) {
        lastFetchErr = err;
        const isLast = attempt === PAGE_MAX_RETRIES;
        console.warn(
          `[sync] Fetch attempt ${attempt}/${PAGE_MAX_RETRIES} failed at offset=${offset}: ${String(err)}${
            isLast ? " — skipping page" : ` — retrying in ${PAGE_RETRY_DELAY_MS}ms`
          }`
        );
        if (!isLast) {
          await new Promise((r) => setTimeout(r, PAGE_RETRY_DELAY_MS));
        }
      }
    }

    // All retries exhausted for this page — record error, skip to next offset
    if (page === null) {
      const msg = `Indexer fetch permanently failed at offset=${offset} after ${PAGE_MAX_RETRIES} attempts: ${String(lastFetchErr)}`;
      errors.push(msg);
      console.error(`[sync] ${msg}`);
      // Advance offset so the next iteration tries the following page,
      // rather than aborting the entire sync.
      offset += SYNC_BATCH_SIZE;
      consecutiveFailures++;
      if (consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
        const abortMsg = `Aborting sync: ${consecutiveFailures} consecutive page failures. Indexer may be down.`;
        errors.push(abortMsg);
        console.error(`[sync] ${abortMsg}`);
        pageEmpty = true;
      }
      continue;
    }

    // Successful fetch — reset consecutive failure counter
    consecutiveFailures = 0;

    if (!page.length) {
      pageEmpty = true;
      break;
    }

    totalFetched += page.length;
    console.log(
      `[sync] Fetched ${page.length} agents (offset=${offset}, total=${totalFetched})`
    );

    // ── Fetch IPFS manifests concurrently ────────────────────────────────────
    const manifests = await Promise.all(
      page.map((agent) => fetchIpfsManifest(agent.agent_uri))
    );

    // ── Map to rows ──────────────────────────────────────────────────────────
    const rows: AgentRow[] = page.map((agent, i) =>
      toAgentRow(agent, manifests[i])
    );

    // ── Upsert in sub-batches ────────────────────────────────────────────────
    for (let i = 0; i < rows.length; i += UPSERT_BATCH_SIZE) {
      const batch = rows.slice(i, i + UPSERT_BATCH_SIZE);
      const count = await upsertBatch(batch, errors);
      totalUpserted += count;
    }


    offset += page.length;

    // If page was smaller than the batch size, we've reached the end
    if (page.length < SYNC_BATCH_SIZE) {
      pageEmpty = true;
    }
  }

  const duration_ms = Date.now() - start;
  console.log(
    `[sync] Done | fetched=${totalFetched} upserted=${totalUpserted} errors=${errors.length} duration=${duration_ms}ms`
  );

  return {
    total_fetched: totalFetched,
    total_upserted: totalUpserted,
    errors,
    duration_ms,
    cluster,
  };
}
