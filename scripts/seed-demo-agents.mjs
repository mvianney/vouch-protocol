/**
 * scripts/seed-demo-agents.mjs
 *
 * Registers 5 specialized demo agents on Solana Devnet using 8004-solana SDK,
 * assigns operational agent wallets, and records the manifests in Supabase
 * for immediate, high-fidelity discovery, search, and invocation.
 */

import { SolanaSDK } from "8004-solana";
import { Keypair } from "@solana/web3.js";
import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceKey) {
  console.error("Missing Supabase credentials in .env.local");
  process.exit(1);
}

const rawKey = process.env.SOLANA_PRIVATE_KEY;
if (!rawKey) {
  console.error("Missing SOLANA_PRIVATE_KEY in .env.local");
  process.exit(1);
}

const signer = Keypair.fromSecretKey(Uint8Array.from(JSON.parse(rawKey)));
console.log(`[seed] Using deployer wallet: ${signer.publicKey.toBase58()}`);

const db = createClient(supabaseUrl, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const sdk = new SolanaSDK({
  cluster: "devnet",
  signer,
  rpcUrl: process.env.HELIUS_RPC_URL ?? process.env.NEXT_PUBLIC_SOLANA_RPC_URL ?? "https://api.devnet.solana.com",
});

const DEMO_AGENTS_CONFIG = [
  {
    manifestKey: "balance-sentinel",
    file: "public/manifests/balance-sentinel.json",
    trust_score: 96.5,
    raw_avg_score: 98.0,
    confidence: 0.88,
    feedback_count: 24,
  },
  {
    manifestKey: "tx-chronicle",
    file: "public/manifests/tx-chronicle.json",
    trust_score: 94.2,
    raw_avg_score: 95.5,
    confidence: 0.85,
    feedback_count: 19,
  },
  {
    manifestKey: "stake-radar",
    file: "public/manifests/stake-radar.json",
    trust_score: 98.0,
    raw_avg_score: 99.1,
    confidence: 0.92,
    feedback_count: 31,
  },
  {
    manifestKey: "portfolio-scout",
    file: "public/manifests/portfolio-scout.json",
    trust_score: 91.8,
    raw_avg_score: 93.0,
    confidence: 0.82,
    feedback_count: 14,
  },
  {
    manifestKey: "pulse-oracle",
    file: "public/manifests/pulse-oracle.json",
    trust_score: 99.4,
    raw_avg_score: 99.8,
    confidence: 0.95,
    feedback_count: 42,
  },
];

async function main() {
  console.log("\n=======================================================");
  console.log("  Vouch · Registering 5 Demo Agents on Solana Devnet");
  console.log("=======================================================\n");

  const results = [];

  for (const config of DEMO_AGENTS_CONFIG) {
    const manifestPath = path.resolve(config.file);
    const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
    const manifestUri = `https://vouch-protocol-ashy.vercel.app/manifests/${config.manifestKey}.json`;

    console.log(`[registering] "${manifest.name}"...`);
    console.log(`  manifest URI: ${manifestUri}`);

    let registration;
    try {
      registration = await sdk.registerAgent(manifestUri);
      console.log(`  ✓ On-chain NFT asset registered: ${registration.asset.toBase58()}`);
      console.log(`  ✓ Tx signature: ${registration.signature}`);
    } catch (err) {
      console.error(`  ✗ Registration failed for ${manifest.name}:`, err.message);
      continue;
    }

    const assetPubkey = registration.asset;
    const assetId = assetPubkey.toBase58();

    // Assign an operational wallet
    let opWalletPubkey = null;
    try {
      const opWallet = Keypair.generate();
      opWalletPubkey = opWallet.publicKey.toBase58();
      await sdk.setAgentWallet(assetPubkey, opWallet);
      console.log(`  ✓ Operational wallet configured: ${opWalletPubkey}`);
    } catch (err) {
      console.warn(`  ! Operational wallet assignment note: ${err.message}`);
    }

    // Upsert into local Supabase agents table
    const dbRow = {
      asset_id: assetId,
      name: manifest.name,
      description: manifest.description,
      skills: manifest.skills || [],
      service_endpoint: manifest.endpoint || manifest.url || null,
      owner_wallet: signer.publicKey.toBase58(),
      trust_score: config.trust_score,
      raw_avg_score: config.raw_avg_score,
      confidence: config.confidence,
      feedback_count: config.feedback_count,
      last_synced_at: new Date().toISOString(),
    };

    const { error: upsertErr } = await db
      .from("agents")
      .upsert([dbRow], { onConflict: "asset_id" });

    if (upsertErr) {
      console.error(`  ✗ Supabase upsert error for ${assetId}:`, upsertErr.message);
    } else {
      console.log(`  ✓ Upserted to Supabase with full metadata`);
    }

    results.push({
      asset_id: assetId,
      name: manifest.name,
      skills: manifest.skills,
      endpoint: dbRow.service_endpoint,
      trust_score: dbRow.trust_score,
      feedback_count: dbRow.feedback_count,
      tx_signature: registration.signature,
    });

    console.log();
    // Brief pause to avoid devnet rate limits
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }

  console.log("\n=======================================================");
  console.log(`  Successfully registered and synced ${results.length} agents`);
  console.log("=======================================================\n");

  console.log(JSON.stringify(results, null, 2));

  // Write results out to scratch/demo-agents.json for convenience
  fs.mkdirSync("scripts/output", { recursive: true });
  fs.writeFileSync(
    "scripts/output/demo-agents.json",
    JSON.stringify(results, null, 2)
  );
  console.log("\nSaved agent details to scripts/output/demo-agents.json\n");
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
