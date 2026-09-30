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
 * Get the dedicated evaluation client keypair for on-chain feedback.
 *
 * Loaded exclusively from the VOUCH_EVALUATOR_PRIVATE_KEY environment variable
 * (JSON byte array: "[1,2,3,...]"). This avoids any filesystem I/O, which is
 * incompatible with Vercel serverless functions (read-only filesystem).
 *
 * The 8004 protocol forbids self-feedback (the agent owner cannot review their
 * own agent). Since demo agents were registered by the platform deployer wallet,
 * evaluations are submitted by this separate dedicated evaluator keypair.
 *
 * If VOUCH_EVALUATOR_PRIVATE_KEY is not set, falls back to SOLANA_PRIVATE_KEY
 * as a last resort so the pipeline does not hard-fail in basic local setups.
 */
export async function getOrCreateEvaluatorKeypair(conn?: Connection): Promise<Keypair> {
  const envKey = process.env.VOUCH_EVALUATOR_PRIVATE_KEY ?? process.env.SOLANA_PRIVATE_KEY;
  if (!envKey) {
    throw new Error(
      "VOUCH_EVALUATOR_PRIVATE_KEY is not set. " +
      "Generate a keypair locally and set it as an environment variable. " +
      "See .env.local.example for the expected format."
    );
  }
  const keypair = Keypair.fromSecretKey(Uint8Array.from(JSON.parse(envKey)));

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
