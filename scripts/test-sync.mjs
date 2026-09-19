/**
 * Smoke test: pull agents from the public 8004 devnet/mainnet indexer.
 *
 * Run with:
 *   node scripts/test-sync.mjs [devnet|mainnet-beta]
 *
 * Pure ESM — no TypeScript compilation needed. Imports from the 8004-solana
 * dist directly to avoid moduleResolution: bundler conflicts with tsx/Node.
 *
 * Does NOT write to Supabase — just prints what the indexer returns.
 */

import {
  IndexerClient,
  getDefaultIndexerUrl,
  getDefaultIndexerGraphqlUrl,
} from "8004-solana";

const cluster = process.argv[2] === "mainnet-beta" ? "mainnet-beta" : "devnet";
const indexerUrl = getDefaultIndexerUrl(cluster);

console.log(`\n[test-sync] cluster        = ${cluster}`);
console.log(`[test-sync] indexer (REST) = ${indexerUrl}`);
console.log(`[test-sync] indexer (GQL)  = ${getDefaultIndexerGraphqlUrl(cluster)}\n`);

const indexer = new IndexerClient({
  baseUrl: indexerUrl,
  timeout: 15_000,
  retries: 2,
});

// ── Global stats ──────────────────────────────────────────────────────────────
console.log("── Global stats ───────────────────────────────────────────────");
try {
  const stats = await indexer.getGlobalStats();
  console.log(`  total_agents:      ${stats.total_agents}`);
  console.log(`  total_collections: ${stats.total_collections}`);
} catch (e) {
  console.warn("  getGlobalStats failed:", String(e));
}

// ── First 10 agents ───────────────────────────────────────────────────────────
console.log("\n── First 10 agents ────────────────────────────────────────────");
let agents;
try {
  agents = await indexer.getAgents({ limit: 10, offset: 0 });
} catch (e) {
  console.error("  getAgents failed:", String(e));
  process.exit(1);
}

console.log(`  Returned: ${agents.length} agents\n`);

for (const agent of agents) {
  console.log(`  ┌── ${agent.asset}`);
  console.log(`  │   name:           ${agent.nft_name ?? "(none)"}`);
  console.log(`  │   owner:          ${agent.owner}`);
  console.log(`  │   quality_score:  ${agent.quality_score}`);
  console.log(`  │   raw_avg_score:  ${agent.raw_avg_score}`);
  console.log(`  │   confidence:     ${agent.confidence}`);
  console.log(`  │   feedback_count: ${agent.feedback_count}`);
  console.log(`  │   agent_uri:      ${agent.agent_uri ?? "(none)"}`);
  console.log(`  └── agent_wallet:   ${agent.agent_wallet ?? "(none)"}`);
  console.log();
}

// ── Pagination check ──────────────────────────────────────────────────────────
console.log("── Pagination check (offset=10, limit=5) ─────────────────────");
try {
  const page2 = await indexer.getAgents({ limit: 5, offset: 10 });
  console.log(`  Page 2 count: ${page2.length}`);
  if (page2.length > 0) {
    console.log(`  First asset:  ${page2[0].asset}`);
  }
} catch (e) {
  console.warn("  Pagination check failed:", String(e));
}

// ── Leaderboard check ─────────────────────────────────────────────────────────
console.log("\n── Leaderboard (top 5 by rank) ───────────────────────────────");
try {
  const leaders = await indexer.getLeaderboard({ limit: 5 });
  for (const a of leaders) {
    const adjustedScore =
      a.quality_score *
      a.confidence *
      Math.min(a.feedback_count / 5, 1) ** 0.6;
    console.log(
      `  ${a.asset.slice(0, 8)}… | score=${a.quality_score} | conf=${a.confidence.toFixed(3)} | fb=${a.feedback_count} | adj≈${adjustedScore.toFixed(2)}`
    );
  }
} catch (e) {
  console.warn("  getLeaderboard failed:", String(e));
}

console.log("\n✓ Smoke test complete");
