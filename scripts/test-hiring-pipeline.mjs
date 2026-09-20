/**
 * scripts/test-hiring-pipeline.mjs
 *
 * End-to-end verification of the Vouch hiring pipeline in ESM:
 *   1. Search: Queries local Supabase cache for given task description
 *   2. Select: Picks the top match
 *   3. Live-Verify: Directly inspects live on-chain trust score via 8004 SDK
 *   4. Sign: Cryptographically signs the hire authorization with Vouch's platform wallet
 *   5. Verify signature: Uses the SDK to confirm the signature is mathematically authentic
 */

import { createClient } from "@supabase/supabase-js";
import { SolanaSDK } from "8004-solana";
import { PublicKey, Keypair } from "@solana/web3.js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);
const signer = Keypair.fromSecretKey(
  Uint8Array.from(JSON.parse(process.env.SOLANA_PRIVATE_KEY))
);

const testTasks = [
  "check the SOL balance of this wallet: 4FonJM4jRekrbi3kzrSjEdvUuXFtQB5Rz9J6RnNczCJT",
  "audit validator staking rewards and epoch performance",
  "monitor current Solana cluster TPS and slot latency",
];

async function runPipelineForTask(task) {
  console.log("================================================================================");
  console.log(`TASK: "${task}"`);
  console.log("================================================================================");

  // 1. Search Supabase agents table
  const queryWords = task.replace(/[^a-zA-Z0-9\s]/g, "").split(/\s+/).filter(w => w.length > 3);
  const searchFilter = queryWords.slice(0, 3).join(" | ");

  const { data: candidates, error } = await supabase
    .from("agents")
    .select("asset_id, name, description, skills, service_endpoint, trust_score, feedback_count, confidence")
    .textSearch("description", searchFilter, { config: "english" });

  if (error || !candidates || candidates.length === 0) {
    console.log("No candidates found via description search, falling back to top agents.");
  }

  const results = candidates || [];
  console.log(`[1. Search] Found ${results.length} candidate agent(s):`);
  results.forEach((c, idx) => {
    console.log(`   #${idx + 1}: ${c.name.padEnd(26)} (Cached Trust: ${c.trust_score}, Feedbacks: ${c.feedback_count})`);
  });

  if (!results.length) return;

  // 2. Select Top Candidate & Live On-Chain Verify
  const selectedAgent = results[0];
  console.log("\n[2. Select & Live-Verify On-Chain]");
  console.log(`   Selected Agent:   ${selectedAgent.name}`);
  console.log(`   Asset ID:         ${selectedAgent.asset_id}`);
  console.log(`   Endpoint:         ${selectedAgent.service_endpoint}`);

  const sdk = new SolanaSDK({
    cluster: "devnet",
    signer,
    indexerUrl: "https://8004-indexer-dev.qnt.sh/rest/v1",
    rpcUrl: process.env.HELIUS_RPC_URL ?? "https://api.devnet.solana.com",
  });

  const summary = await sdk.getSummary(new PublicKey(selectedAgent.asset_id));
  console.log(`   Cached Trust:     ${selectedAgent.trust_score} (${selectedAgent.feedback_count} feedbacks)`);
  console.log(`   Live On-Chain:    ${summary.averageScore} (${summary.totalFeedbacks} feedbacks)`);

  // 3. Sign Hire Request
  console.log("\n[3. Cryptographic Signature via Vouch Platform Wallet]");
  const nowSeconds = Math.floor(Date.now() / 1000);
  const hireData = {
    action: "hire_agent",
    platform: "vouch",
    taskDescription: task,
    agentAssetId: selectedAgent.asset_id,
    requesterPlatformWallet: signer.publicKey.toBase58(),
    timestamp: nowSeconds,
    expiresAt: nowSeconds + 15 * 60,
  };

  const rawSignedPayload = sdk.sign(new PublicKey(selectedAgent.asset_id), hireData);
  const parsed = JSON.parse(rawSignedPayload);

  console.log(`   Signer Wallet:    ${signer.publicKey.toBase58()}`);
  console.log(`   Signature (b58):  ${parsed.sig}`);
  console.log(`   Nonce:            ${parsed.nonce}`);
  console.log(`   Issued At:        ${new Date(parsed.issuedAt * 1000).toISOString()}`);
  console.log(`   Expires At:       ${new Date(parsed.data.expiresAt * 1000).toISOString()}`);

  // 4. Cryptographic verification
  const isValid = await sdk.verify(
    rawSignedPayload,
    new PublicKey(selectedAgent.asset_id),
    signer.publicKey
  );
  console.log(`   Signature Valid?  ${isValid ? "✓ YES (Cryptographically verified)" : "✗ NO"}`);

  console.log("\n   Canonical Signed Payload JSON Preview:");
  console.log("   " + JSON.stringify(parsed, null, 2).split("\n").join("\n   "));
  console.log("\n");
}

async function main() {
  for (const task of testTasks) {
    await runPipelineForTask(task);
  }
}

main().catch((err) => {
  console.error("Test pipeline failed:", err);
  process.exit(1);
});
