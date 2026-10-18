/**
 * scripts/register-tx-explainer.mjs
 *
 * Registers the Transaction Explainer agent on Solana devnet (8004 registry)
 * and adds it to the Supabase agents table with honest zero reputation.
 *
 * This touches the LIVE app: the preview and production deployments share
 * the same Supabase database. Run it only at go-live, in this order:
 *   1. Merge the branch with the Transaction Explainer into main.
 *   2. Wait for the production deploy to finish.
 *   3. Run this script. It checks the live manifest and endpoint first.
 *
 * Usage:
 *   node --env-file=.env.local scripts/register-tx-explainer.mjs            (checks only)
 *   node --env-file=.env.local scripts/register-tx-explainer.mjs --confirm  (registers)
 *
 * Needs NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY and
 * SOLANA_PRIVATE_KEY in .env.local, the same as seed-demo-agents.mjs.
 */

import { SolanaSDK } from "8004-solana";
import { Keypair } from "@solana/web3.js";
import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";

const APP_URL = "https://vouch-protocol-ashy.vercel.app";
const MANIFEST_KEY = "tx-explainer";
const MANIFEST_FILE = "public/manifests/tx-explainer.json";
const MANIFEST_URI = `${APP_URL}/manifests/${MANIFEST_KEY}.json`;
const REQUIRED_SKILL = "transaction_explainer";

const confirmed = process.argv.includes("--confirm");

function fail(message) {
  console.error(`\n  ✗ ${message}\n`);
  process.exit(1);
}

async function checkManifest(localManifest) {
  let res;
  try {
    res = await fetch(MANIFEST_URI, { headers: { Accept: "application/json" } });
  } catch (err) {
    fail(`Could not reach ${MANIFEST_URI}: ${err.message}`);
  }
  if (!res.ok) {
    fail(`${MANIFEST_URI} returned ${res.status}. Merge to main and wait for the deploy first.`);
  }
  const live = await res.json().catch(() => null);
  const skills = Array.isArray(live?.skills) ? live.skills : [];
  if (!skills.some((s) => String(s).endsWith(`/${REQUIRED_SKILL}`))) {
    fail(`The live manifest does not list the ${REQUIRED_SKILL} skill yet.`);
  }
  if (live.endpoint !== localManifest.endpoint) {
    fail(`The live manifest endpoint (${live.endpoint}) does not match ${MANIFEST_FILE}.`);
  }
  console.log(`  ✓ Live manifest found: ${MANIFEST_URI}`);
}

async function checkEndpoint(endpoint) {
  let res;
  try {
    res = await fetch(endpoint, { headers: { Accept: "application/json" } });
  } catch (err) {
    fail(`Could not reach ${endpoint}: ${err.message}`);
  }
  const body = await res.json().catch(() => null);
  if (!res.ok || body?.agent_id !== MANIFEST_KEY) {
    fail(`${endpoint} is not serving the Transaction Explainer yet (status ${res.status}).`);
  }
  console.log(`  ✓ Live agent endpoint responds: ${endpoint}`);
}

async function main() {
  console.log("\n=======================================================");
  console.log("  Vouch · Register the Transaction Explainer (devnet)");
  console.log("=======================================================\n");

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const rawKey = process.env.SOLANA_PRIVATE_KEY;
  if (!supabaseUrl || !serviceKey) fail("Missing Supabase credentials in .env.local");
  if (!rawKey) fail("Missing SOLANA_PRIVATE_KEY in .env.local");

  const manifest = JSON.parse(fs.readFileSync(path.resolve(MANIFEST_FILE), "utf8"));
  const endpoint = manifest.endpoint;

  // 1. Pre-flight checks against the live deployment.
  await checkManifest(manifest);
  await checkEndpoint(endpoint);

  const db = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: existing, error: lookupError } = await db
    .from("agents")
    .select("asset_id, name")
    .eq("service_endpoint", endpoint)
    .limit(1);
  if (lookupError) fail(`Supabase lookup failed: ${lookupError.message}`);
  if (existing?.length) {
    fail(`Already registered as ${existing[0].asset_id} (${existing[0].name}). Nothing to do.`);
  }
  console.log("  ✓ Not registered yet");

  if (!confirmed) {
    console.log("\n  Checks passed. Run again with --confirm to register on devnet and add the agent to Supabase.\n");
    return;
  }

  // 2. Register on-chain.
  const signer = Keypair.fromSecretKey(Uint8Array.from(JSON.parse(rawKey)));
  console.log(`\n  Deployer wallet: ${signer.publicKey.toBase58()}`);

  const sdk = new SolanaSDK({
    cluster: "devnet",
    signer,
    rpcUrl:
      process.env.HELIUS_RPC_URL ??
      process.env.NEXT_PUBLIC_SOLANA_RPC_URL ??
      "https://api.devnet.solana.com",
  });

  let registration;
  try {
    registration = await sdk.registerAgent(MANIFEST_URI);
  } catch (err) {
    fail(`On-chain registration failed: ${err.message}`);
  }
  if (!registration?.asset) fail("Registration returned no asset address.");

  const assetId = registration.asset.toBase58();
  console.log(`  ✓ Registered on-chain: ${assetId}`);
  if (registration.signature) {
    console.log(`  ✓ Tx: https://explorer.solana.com/tx/${registration.signature}?cluster=devnet`);
  }

  // 3. Add to Supabase with zero reputation. Scores only come from real feedback.
  const row = {
    asset_id: assetId,
    name: manifest.name,
    description: manifest.description,
    skills: manifest.skills || [],
    service_endpoint: endpoint,
    owner_wallet: signer.publicKey.toBase58(),
    trust_score: 0,
    raw_avg_score: 0,
    confidence: 0,
    feedback_count: 0,
    last_synced_at: new Date().toISOString(),
  };

  const { error: upsertError } = await db.from("agents").upsert([row], { onConflict: "asset_id" });
  if (upsertError) {
    fail(`Registered on-chain as ${assetId}, but the Supabase upsert failed: ${upsertError.message}. The next sync will add it.`);
  }
  console.log("  ✓ Added to Supabase (trust 0, feedback 0)");

  console.log(`\n  Done. Try it at ${APP_URL}/app with the "explain this transaction" prompt.\n`);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
