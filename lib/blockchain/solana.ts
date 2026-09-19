import { Connection, Keypair, PublicKey, clusterApiUrl } from "@solana/web3.js";

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
 * Helper to convert a base58 string to a PublicKey.
 */
export function toPublicKey(address: string): PublicKey {
  return new PublicKey(address);
}
