/**
 * lib/hiring/sign.ts
 *
 * Uses the 8004-solana SDK's sign() function with our Vouch platform wallet
 * (from SOLANA_PRIVATE_KEY in env) to cryptographically sign hire requests.
 *
 * The signed payload guarantees:
 *   - Origin: Signed by Vouch platform's authority keypair
 *   - Target: Bound to the selected agent's on-chain asset_id
 *   - Intent: Includes the user's task description and timestamp
 *   - Nonce & timestamp: RFC 8785 canonical JSON with ed25519 signature
 */

import { SolanaSDK } from "8004-solana";
import { PublicKey } from "@solana/web3.js";
import { loadKeypairFromEnv } from "@/lib/blockchain/solana";

export interface HirePayloadData {
  action: "hire_agent";
  platform: "vouch";
  taskDescription: string;
  agentAssetId: string;
  requesterPlatformWallet: string;
  timestamp: number;
  expiresAt: number;
}

export interface SignedHireRequest {
  /** Canonical JSON string produced by 8004-solana SDK sign() */
  rawSignedPayload: string;
  /** Parsed payload object for easy inspection */
  parsedPayload: {
    alg: string;
    asset: string;
    data: HirePayloadData;
    issuedAt: number;
    nonce: string;
    sig: string;
    v: number;
  };
  signerPublicKey: string;
}

/**
 * Sign a hire request for an agent
 *
 * @param agentAssetId - The Solana Core asset ID of the selected agent
 * @param taskDescription - The user's query / instruction
 */
export function signHireRequest(
  agentAssetId: string,
  taskDescription: string
): SignedHireRequest {
  const platformSigner = loadKeypairFromEnv();
  const assetPubkey = new PublicKey(agentAssetId);

  const sdk = new SolanaSDK({
    cluster: "devnet",
    signer: platformSigner,
  });

  const now = Date.now();
  const data: HirePayloadData = {
    action: "hire_agent",
    platform: "vouch",
    taskDescription,
    agentAssetId,
    requesterPlatformWallet: platformSigner.publicKey.toBase58(),
    timestamp: now,
    expiresAt: now + 15 * 60 * 1000, // 15 minute validity window
  };

  // 8004-solana SDK sign creates canonical RFC 8785 JSON with ed25519 signature
  const canonicalSignedString = sdk.sign(assetPubkey, data);
  const parsed = JSON.parse(canonicalSignedString);

  return {
    rawSignedPayload: canonicalSignedString,
    parsedPayload: parsed,
    signerPublicKey: platformSigner.publicKey.toBase58(),
  };
}
