import fs from "fs";
import path from "path";
import {
  Connection,
  Keypair,
  PublicKey,
  clusterApiUrl,
  SystemProgram,
  Transaction,
  sendAndConfirmTransaction,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";

/**
 * Solana RPC connection.
 * Defaults to devnet; override via NEXT_PUBLIC_SOLANA_RPC_URL env var.
 */
export const connection = new Connection(
  process.env.NEXT_PUBLIC_SOLANA_RPC_URL ?? clusterApiUrl("devnet"),
  "confirmed"
);

/**
 * Load a Keypair from a JSON array stored in an env var (server-side only).
 * e.g. SOLANA_PRIVATE_KEY='[1,2,3,...]'
 */
export function loadKeypairFromEnv(): Keypair {
  const raw = process.env.SOLANA_PRIVATE_KEY;
  if (!raw) throw new Error("SOLANA_PRIVATE_KEY env var is not set");
  const secretKey = Uint8Array.from(JSON.parse(raw) as number[]);
  return Keypair.fromSecretKey(secretKey);
}

/**
 * Get or create a dedicated evaluation client keypair for on-chain feedback.
 * The 8004 protocol forbids self-feedback (agent owner cannot review their own agent).
 * Since demo agents were registered by the platform deployer wallet, evaluations are
 * submitted by this dedicated client evaluator keypair, funded automatically as needed.
 */
export async function getOrCreateEvaluatorKeypair(conn?: Connection): Promise<Keypair> {
  const envKey = process.env.VOUCH_EVALUATOR_PRIVATE_KEY;
  let keypair: Keypair;

  if (envKey) {
    keypair = Keypair.fromSecretKey(Uint8Array.from(JSON.parse(envKey)));
  } else {
    const keyPath = path.join(process.cwd(), ".vouch-evaluator.json");
    if (fs.existsSync(keyPath)) {
      const data = JSON.parse(fs.readFileSync(keyPath, "utf-8"));
      keypair = Keypair.fromSecretKey(Uint8Array.from(data));
    } else {
      keypair = Keypair.generate();
      fs.writeFileSync(keyPath, JSON.stringify(Array.from(keypair.secretKey)), "utf-8");
    }
  }

  // Ensure evaluator has enough SOL to pay for transactions
  const activeConn = conn ?? connection;
  try {
    const balance = await activeConn.getBalance(keypair.publicKey);
    if (balance < 0.02 * LAMPORTS_PER_SOL) {
      console.log(`[solana] Funding evaluator ${keypair.publicKey.toBase58()} from platform wallet...`);
      const platformSigner = loadKeypairFromEnv();
      const fundTx = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: platformSigner.publicKey,
          toPubkey: keypair.publicKey,
          lamports: 0.05 * LAMPORTS_PER_SOL,
        })
      );
      await sendAndConfirmTransaction(activeConn, fundTx, [platformSigner]);
      console.log(`[solana] Evaluator funded successfully.`);
    }
  } catch (err: any) {
    console.warn(`[solana] Evaluator funding check notice: ${err.message}`);
  }

  return keypair;
}

/**
 * Helper to convert a base58 string to a PublicKey.
 */
export function toPublicKey(address: string): PublicKey {
  return new PublicKey(address);
}
