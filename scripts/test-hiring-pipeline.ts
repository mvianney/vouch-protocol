/**
 * scripts/test-hiring-pipeline.mjs
 *
 * End-to-end verification of the Vouch hiring pipeline:
 *   1. Search: Queries local Supabase cache for given task description
 *   2. Select: Picks the top match
 *   3. Live-Verify: Directly inspects live on-chain trust score via 8004 SDK
 *   4. Sign: Cryptographically signs the hire authorization with Vouch's platform wallet
 *   5. Verify signature: Uses the SDK to confirm the signature is mathematically authentic
 */

import { searchAgents } from "../lib/registry/search.ts";
import { selectAndVerifyAgent } from "../lib/hiring/select.ts";
import { signHireRequest } from "../lib/hiring/sign.ts";
import { SolanaSDK } from "8004-solana";
import { PublicKey } from "@solana/web3.js";

const testTasks = [
  "check the SOL balance of this wallet: 4FonJM4jRekrbi3kzrSjEdvUuXFtQB5Rz9J6RnNczCJT",
  "audit validator staking rewards and epoch performance",
  "monitor current Solana cluster TPS and slot latency",
];

async function runPipelineForTask(task) {
  console.log("================================================================================");
  console.log(`TASK: "${task}"`);
  console.log("================================================================================");

  // 1. Search
  const searchResult = await searchAgents({ query: task, limit: 5 });
  console.log(`[1. Search] Found ${searchResult.results.length} candidate agents.`);
  searchResult.results.forEach((c, idx) => {
    console.log(`   #${idx + 1}: ${c.name.padEnd(26)} (Adjusted Score: ${c.adjusted_score.toFixed(2)}, Cached Trust: ${c.trust_score})`);
  });

  if (!searchResult.results.length) {
    console.log("No candidates found.");
    return;
  }

  // 2. Select & Live Verify
  console.log("\n[2. Select & Live-Verify On-Chain]");
  const selection = await selectAndVerifyAgent(searchResult.results);
  const { selectedAgent, liveVerification } = selection;

  console.log(`   Selected Agent:   ${selectedAgent.name}`);
  console.log(`   Asset ID:         ${selectedAgent.asset_id}`);
  console.log(`   Cached Trust:     ${liveVerification.cachedTrustScore} (${liveVerification.cachedFeedbackCount} feedbacks)`);
  console.log(`   Live On-Chain:    ${liveVerification.liveTrustScore} (${liveVerification.liveFeedbackCount} feedbacks)`);
  console.log(`   Discrepancy:      ${liveVerification.hasChanged ? liveVerification.discrepancyReason : "None (Matches live on-chain)"}`);
  console.log(`   Endpoint:         ${selectedAgent.service_endpoint}`);

  // 3. Sign Hire Request
  console.log("\n[3. Cryptographic Signature via Vouch Platform Wallet]");
  const signed = signHireRequest(selectedAgent.asset_id, task);

  console.log(`   Signer Wallet:    ${signed.signerPublicKey}`);
  console.log(`   Signature (b58):  ${signed.parsedPayload.sig}`);
  console.log(`   Nonce:            ${signed.parsedPayload.nonce}`);
  console.log(`   Issued At:        ${new Date(signed.parsedPayload.issuedAt * 1000).toISOString()}`);
  console.log(`   Expires At:       ${new Date(signed.parsedPayload.data.expiresAt).toISOString()}`);

  // 4. Verify signature cryptographically
  const sdk = new SolanaSDK({ cluster: "devnet" });
  const isValid = await sdk.verify(
    signed.rawSignedPayload,
    new PublicKey(selectedAgent.asset_id),
    new PublicKey(signed.signerPublicKey)
  );
  console.log(`   Signature Valid?  ${isValid ? "✓ YES (Cryptographically verified)" : "✗ NO"}`);

  console.log("\n   Canonical Signed Payload JSON Preview:");
  console.log("   " + JSON.stringify(signed.parsedPayload, null, 2).split("\n").join("\n   "));
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
