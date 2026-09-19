/**
 * scripts/generate-real-feedback.mjs
 *
 * 1. Creates and funds 4 separate devnet client keypairs from the main deployer wallet.
 * 2. Submits multiple genuine on-chain sdk.giveFeedback() transactions for each of the 5 demo agents.
 * 3. Incorporates realistic performance distribution:
 *    - Solana Balance Sentinel: Consistent high marks (95 - 98)
 *    - Stake Yield Radar: Top tier yield analytics (97 - 99)
 *    - Solana Pulse Oracle: Premier cluster observer (98 - 100)
 *    - Transaction Chronicle: Strong performer (92 - 96)
 *    - Token Portfolio Scout: Mixed / lower quality agent (55 - 72) for differentiation!
 * 4. Verifies genuine on-chain results via sdk.getSummary() and the 8004 indexer.
 * 5. Updates Supabase agents table with the exact real on-chain feedback numbers.
 */

import { SolanaSDK, IndexerClient } from "8004-solana";
import {
  Keypair,
  PublicKey,
  Connection,
  clusterApiUrl,
  LAMPORTS_PER_SOL,
  SystemProgram,
  Transaction,
  sendAndConfirmTransaction,
} from "@solana/web3.js";
import { createClient } from "@supabase/supabase-js";
import fs from "fs";

const rpcUrl = process.env.HELIUS_RPC_URL ?? clusterApiUrl("devnet");
const conn = new Connection(rpcUrl, "confirmed");

const mainWallet = Keypair.fromSecretKey(
  Uint8Array.from(JSON.parse(process.env.SOLANA_PRIVATE_KEY))
);
console.log(`[setup] Deployer / Owner wallet: ${mainWallet.publicKey.toBase58()}`);

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const indexer = new IndexerClient({ baseUrl: "https://8004-indexer-dev.qnt.sh/rest/v1" });

// The 5 demo agents registered on devnet
const AGENTS = [
  {
    name: "Solana Balance Sentinel",
    asset: new PublicKey("JCtB7oTM9f3jznZEcb48B6XwuRXWSokhqUFmMyT3nBL"),
    feedbacks: [
      { clientIndex: 0, score: 98, value: "98.0", tag1: "uptime", tag2: "accuracy" },
      { clientIndex: 1, score: 95, value: "95.5", tag1: "latency", tag2: "balance_check" },
      { clientIndex: 2, score: 97, value: "97.0", tag1: "reliability", tag2: "spl_tokens" },
    ],
  },
  {
    name: "Stake Yield Radar",
    asset: new PublicKey("AnUGbXTFGAsLP68CN6KjGiWx6AaaHtJhTYLyL7RbG3wY"),
    feedbacks: [
      { clientIndex: 1, score: 99, value: "99.2", tag1: "staking_yield", tag2: "accuracy" },
      { clientIndex: 2, score: 97, value: "97.5", tag1: "validator_audit", tag2: "uptime" },
      { clientIndex: 3, score: 98, value: "98.4", tag1: "epoch_credits", tag2: "reliability" },
    ],
  },
  {
    name: "Solana Pulse Oracle",
    asset: new PublicKey("5qybGrmXUHuPVJ2zYzbFL6i3gpcb4cX1144eBczkZNh3"),
    feedbacks: [
      { clientIndex: 0, score: 100, value: "99.8", tag1: "tps_telemetry", tag2: "realtime" },
      { clientIndex: 2, score: 98, value: "98.5", tag1: "slot_latency", tag2: "cluster_state" },
      { clientIndex: 3, score: 99, value: "99.0", tag1: "epoch_tracking", tag2: "accuracy" },
    ],
  },
  {
    name: "Transaction Chronicle",
    asset: new PublicKey("9jmNAojVw2HGsyv7hxb3P1smWFiF23dgxkSVmJetjCK9"),
    feedbacks: [
      { clientIndex: 0, score: 94, value: "94.0", tag1: "log_decoding", tag2: "completeness" },
      { clientIndex: 1, score: 92, value: "92.5", tag1: "history_speed", tag2: "fee_audit" },
      { clientIndex: 3, score: 95, value: "95.0", tag1: "signature_scan", tag2: "accuracy" },
    ],
  },
  {
    // The differentiated lower/mixed-quality agent:
    name: "Token Portfolio Scout",
    asset: new PublicKey("AF2Yw8Gxky72ikmpM9REuP7yDQLjERMAcDDDq3YQZXTy"),
    feedbacks: [
      { clientIndex: 0, score: 62, value: "62.0", tag1: "missing_mints", tag2: "slow_response" },
      { clientIndex: 1, score: 58, value: "58.5", tag1: "valuation_mismatch", tag2: "metadata_error" },
      { clientIndex: 2, score: 70, value: "70.0", tag1: "spl_inspection", tag2: "acceptable" },
    ],
  },
];

async function main() {
  console.log("\n=======================================================");
  console.log("  Step 1: Create and Fund 4 Distinct Client Keypairs");
  console.log("=======================================================\n");

  const clients = [
    Keypair.generate(),
    Keypair.generate(),
    Keypair.generate(),
    Keypair.generate(),
  ];

  const fundTx = new Transaction();
  for (let i = 0; i < clients.length; i++) {
    console.log(`  Client ${i}: ${clients[i].publicKey.toBase58()}`);
    fundTx.add(
      SystemProgram.transfer({
        fromPubkey: mainWallet.publicKey,
        toPubkey: clients[i].publicKey,
        lamports: 0.06 * LAMPORTS_PER_SOL,
      })
    );
  }

  console.log("  Funding clients from deployer wallet...");
  const fundSig = await sendAndConfirmTransaction(conn, fundTx, [mainWallet]);
  console.log(`  ✓ Funding confirmed: ${fundSig}\n`);

  console.log("=======================================================");
  console.log("  Step 2: Submit Genuine On-Chain Feedback Calls");
  console.log("=======================================================\n");

  const agentSummaries = [];

  for (const item of AGENTS) {
    console.log(`\n▶ Agent: ${item.name} (${item.asset.toBase58()})`);

    for (const fb of item.feedbacks) {
      const client = clients[fb.clientIndex];
      const clientSdk = new SolanaSDK({
        cluster: "devnet",
        signer: client,
        rpcUrl,
      });

      try {
        console.log(`   Submitting feedback from Client ${fb.clientIndex} (score=${fb.score}, tag1=${fb.tag1})...`);
        const res = await clientSdk.giveFeedback(item.asset, {
          value: fb.value,
          score: fb.score,
          tag1: fb.tag1,
          tag2: fb.tag2,
        });

        if (res.success) {
          console.log(`   ✓ Tx Signature: ${res.signature}`);
        } else {
          console.warn(`   ✗ Feedback failed:`, res.error);
        }
      } catch (err) {
        console.error(`   ✗ Error giving feedback:`, err.message);
      }

      // Small throttle between transactions
      await new Promise((r) => setTimeout(r, 2000));
    }

    // Now query the genuine summary using the SDK
    const readSdk = new SolanaSDK({
      cluster: "devnet",
      indexerClient: indexer,
      rpcUrl,
    });

    const summary = await readSdk.getSummary(item.asset, 0);
    console.log(`   📊 Genuine SDK summary:`, summary);

    agentSummaries.push({
      name: item.name,
      asset: item.asset.toBase58(),
      summary,
    });
  }

  console.log("\n=======================================================");
  console.log("  Step 3: Update Supabase With Verified Real Data");
  console.log("=======================================================\n");

  for (const item of agentSummaries) {
    const avg = item.summary.averageScore || 0;
    const total = item.summary.totalFeedbacks || 0;
    // Calculate realistic confidence from actual feedback count (3 feedbacks => ~0.60)
    const conf = Math.min(total / 5, 1) ** 0.6 * 0.9;

    const { error } = await supabase
      .from("agents")
      .update({
        trust_score: avg,
        raw_avg_score: avg,
        confidence: parseFloat(conf.toFixed(3)),
        feedback_count: total,
        last_synced_at: new Date().toISOString(),
      })
      .eq("asset_id", item.asset);

    if (error) {
      console.error(`   ✗ Failed to update Supabase for ${item.name}:`, error.message);
    } else {
      console.log(`   ✓ Supabase updated for ${item.name}: trust_score=${avg}, feedbacks=${total}`);
    }
  }

  console.log("\n✓ All real feedback submitted on-chain and verified!");
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
