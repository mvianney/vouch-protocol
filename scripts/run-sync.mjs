/**
 * Full sync runner: pulls all agents from 8004 indexer → Supabase agents table.
 *
 * Run with:
 *   node --env-file=.env.local scripts/run-sync.mjs [devnet|mainnet-beta]
 *
 * Requires:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *
 * The sync uses page retry logic (3 attempts, 2s delay) and will skip
 * permanently-failing pages rather than aborting the entire run.
 * A consecutive-failure abort kicks in after 5 back-to-back page failures.
 */

// ── Path alias shim ───────────────────────────────────────────────────────────
// Next.js @/ alias doesn't resolve in plain Node. We patch it here so
// lib/registry/sync.ts and lib/db/supabase.ts can be imported directly
// after being compiled. Since we can't use tsc here without bundler config,
// we replicate the sync logic in pure ESM below.

import {
  IndexerClient,
  getDefaultIndexerUrl,
} from "8004-solana";
import { createClient } from "@supabase/supabase-js";

// ── Config ────────────────────────────────────────────────────────────────────

const SYNC_BATCH_SIZE = 100;
const UPSERT_BATCH_SIZE = 50;
const IPFS_TIMEOUT_MS = 4_000;
const PAGE_MAX_RETRIES = 3;
const PAGE_RETRY_DELAY_MS = 2_000;
const MAX_CONSECUTIVE_FAILURES = 5;
const IPFS_GATEWAYS = [
  "https://ipfs.io/ipfs/",
  "https://cloudflare-ipfs.com/ipfs/",
  "https://gateway.pinata.cloud/ipfs/",
];

// ── Supabase client ────────────────────────────────────────────────────────────

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceKey) {
  console.error(
    "\n[run-sync] Missing Supabase credentials.\n" +
    "Run with:  node --env-file=.env.local scripts/run-sync.mjs\n"
  );
  process.exit(1);
}

const db = createClient(supabaseUrl, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// ── IPFS manifest fetch ───────────────────────────────────────────────────────

async function fetchIpfsManifest(uri) {
  if (!uri) return null;
  const cid = uri.replace(/^ipfs:\/\//, "").replace(/^\/ipfs\//, "");
  if (!cid || cid.startsWith("http")) {
    // HTTPS manifest — fetch directly
    try {
      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), IPFS_TIMEOUT_MS);
      const res = await fetch(uri.startsWith("http") ? uri : `https://${uri}`, {
        signal: controller.signal,
        headers: { Accept: "application/json" },
      });
      clearTimeout(id);
      if (!res.ok) return null;
      return await res.json();
    } catch { return null; }
  }

  for (const gw of IPFS_GATEWAYS) {
    try {
      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), IPFS_TIMEOUT_MS);
      const res = await fetch(`${gw}${cid}`, {
        signal: controller.signal,
        headers: { Accept: "application/json" },
      });
      clearTimeout(id);
      if (!res.ok) continue;
      return await res.json();
    } catch { /* try next */ }
  }
  return null;
}

function extractEndpoint(manifest) {
  if (!manifest?.services?.length) return null;
  for (const type of ["mcp", "a2a", "oasf"]) {
    const svc = manifest.services.find((s) => s.type?.toLowerCase().includes(type));
    if (svc?.value) return svc.value;
  }
  return manifest.services[0]?.value ?? null;
}

function toRow(agent, manifest) {
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

async function upsertBatch(rows, errors) {
  const { error } = await db.from("agents").upsert(rows, { onConflict: "asset_id" });
  if (error) {
    errors.push(`Upsert error: ${error.message}`);
    console.error(`[run-sync] Upsert error: ${error.message}`);
    return 0;
  }
  return rows.length;
}

// ── Main ──────────────────────────────────────────────────────────────────────

const cluster = process.argv[2] === "mainnet-beta" ? "mainnet-beta" : "devnet";
const indexerUrl = process.env.INDEXER_URL ?? getDefaultIndexerUrl(cluster);

console.log(`\n[run-sync] cluster  = ${cluster}`);
console.log(`[run-sync] indexer  = ${indexerUrl}`);
console.log(`[run-sync] supabase = ${supabaseUrl}\n`);

const indexer = new IndexerClient({ baseUrl: indexerUrl, timeout: 20_000, retries: 1 });

// Print global stats first
try {
  const stats = await indexer.getGlobalStats();
  console.log(`[run-sync] Registry reports ${stats.total_agents} agents across ${stats.total_collections} collections\n`);
} catch (e) {
  console.warn("[run-sync] Could not fetch global stats:", String(e));
}

const start = Date.now();
const errors = [];
let totalFetched = 0;
let totalUpserted = 0;
let offset = 0;
let consecutiveFailures = 0;
let done = false;

while (!done) {
  // ── Fetch page with retry ───────────────────────────────────────────────────
  let page = null;
  let lastErr = null;

  for (let attempt = 1; attempt <= PAGE_MAX_RETRIES; attempt++) {
    try {
      page = await indexer.getAgents({ limit: SYNC_BATCH_SIZE, offset });
      break;
    } catch (err) {
      lastErr = err;
      const isLast = attempt === PAGE_MAX_RETRIES;
      console.warn(
        `[run-sync] Page fetch attempt ${attempt}/${PAGE_MAX_RETRIES} @ offset=${offset}: ${String(err).slice(0, 80)}` +
        (isLast ? " — skipping" : ` — retry in ${PAGE_RETRY_DELAY_MS}ms`)
      );
      if (!isLast) await new Promise((r) => setTimeout(r, PAGE_RETRY_DELAY_MS));
    }
  }

  if (page === null) {
    errors.push(`offset=${offset}: ${String(lastErr)}`);
    offset += SYNC_BATCH_SIZE;
    consecutiveFailures++;
    if (consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
      console.error(`[run-sync] ${consecutiveFailures} consecutive failures — aborting`);
      break;
    }
    continue;
  }

  consecutiveFailures = 0;

  if (!page.length) break;

  totalFetched += page.length;
  process.stdout.write(
    `\r[run-sync] offset=${offset.toString().padStart(5)} | fetched=${totalFetched.toString().padStart(5)} | upserted=${totalUpserted.toString().padStart(5)} | errors=${errors.length}`
  );

  // ── IPFS manifests ──────────────────────────────────────────────────────────
  const manifests = await Promise.all(page.map((a) => fetchIpfsManifest(a.agent_uri)));
  const rows = page.map((a, i) => toRow(a, manifests[i]));

  // ── Upsert ──────────────────────────────────────────────────────────────────
  for (let i = 0; i < rows.length; i += UPSERT_BATCH_SIZE) {
    const n = await upsertBatch(rows.slice(i, i + UPSERT_BATCH_SIZE), errors);
    totalUpserted += n;
  }

  offset += page.length;
  if (page.length < SYNC_BATCH_SIZE) break;
}

const duration = ((Date.now() - start) / 1000).toFixed(1);

console.log(`\n\n[run-sync] ─── Complete ───────────────────────────────────────`);
console.log(`  cluster:        ${cluster}`);
console.log(`  fetched:        ${totalFetched.toLocaleString()} agents`);
console.log(`  upserted:       ${totalUpserted.toLocaleString()} rows`);
console.log(`  skipped pages:  ${errors.length}`);
console.log(`  duration:       ${duration}s`);
if (errors.length) {
  console.log(`\n  Skipped offsets (all retries exhausted):`);
  errors.forEach((e) => console.log(`    · ${e}`));
}
console.log();
