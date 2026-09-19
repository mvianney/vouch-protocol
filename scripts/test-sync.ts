/**
 * Smoke test: pull agents from the public 8004 devnet indexer.
 *
 * Run with:
 *   npx tsx scripts/test-sync.ts [devnet|mainnet-beta]
 *
 * Does NOT write to Supabase — just prints what the indexer returns
 * so you can verify the SDK connection and agent data shape.
 */

import {
  IndexerClient,
  getDefaultIndexerUrl,
  getDefaultIndexerGraphqlUrl,
} from "8004-solana";

const cluster =
  (process.argv[2] as "devnet" | "mainnet-beta") ?? "devnet";

const indexerUrl = getDefaultIndexerUrl(cluster);
console.log(`\n[test-sync] cluster=${cluster}`);
console.log(`[test-sync] indexer=${indexerUrl}`);
console.log(`[test-sync] graphql=${getDefaultIndexerGraphqlUrl(cluster)}\n`);

const indexer = new IndexerClient({
  baseUrl: indexerUrl,
  timeout: 15_000,
  retries: 2,
});

async function main() {
  // ── Global stats ─────────────────────────────────────────────────────────
  console.log("── Global stats ──────────────────────────────────────────");
  try {
    const stats = await indexer.getGlobalStats();
    console.log(JSON.stringify(stats, null, 2));
  } catch (e) {
    console.warn("getGlobalStats failed:", e);
  }

  // ── First page of agents ──────────────────────────────────────────────────
  console.log("\n── First 10 agents ───────────────────────────────────────");
  let agents;
  try {
    agents = await indexer.getAgents({ limit: 10, offset: 0 });
  } catch (e) {
    console.error("getAgents failed:", e);
    process.exit(1);
  }

  console.log(`Returned: ${agents.length} agents\n`);

  for (const agent of agents) {
    console.log(`  asset:          ${agent.asset}`);
    console.log(`  name:           ${agent.nft_name ?? "(none)"}`);
    console.log(`  owner:          ${agent.owner}`);
    console.log(`  quality_score:  ${agent.quality_score}`);
    console.log(`  raw_avg_score:  ${agent.raw_avg_score}`);
    console.log(`  confidence:     ${agent.confidence}`);
    console.log(`  feedback_count: ${agent.feedback_count}`);
    console.log(`  agent_uri:      ${agent.agent_uri ?? "(none)"}`);
    console.log(`  agent_wallet:   ${agent.agent_wallet ?? "(none)"}`);
    console.log();
  }

  // ── Second page check (pagination) ───────────────────────────────────────
  console.log("── Pagination check (offset=10) ──────────────────────────");
  try {
    const page2 = await indexer.getAgents({ limit: 5, offset: 10 });
    console.log(`  Page 2 count: ${page2.length}`);
    if (page2.length > 0) {
      console.log(`  First asset:  ${page2[0].asset}`);
    }
  } catch (e) {
    console.warn("  Pagination check failed:", e);
  }

  console.log("\n✓ Smoke test complete");
}

main().catch((e) => {
  console.error("Fatal:", e);
  process.exit(1);
});
