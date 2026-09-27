/**
 * lib/hiring/select.ts
 *
 * Selection and live on-chain trust score verification for Vouch.
 *
 * Flow:
 *   1. Takes candidate agents already ranked by searchAgents().
 *   2. Identifies the top candidate match.
 *   3. Calls sdk.getSummary(assetId) directly against Solana devnet to check live reputation.
 *   4. Compares live values with cached Supabase values.
 *   5. If changed meaningfully, updates the decision and triggers an async background resync in Supabase.
 */

import dns from "node:dns";
if (typeof dns?.setDefaultResultOrder === "function") {
  dns.setDefaultResultOrder("ipv4first");
}

import { SolanaSDK } from "8004-solana";
import { PublicKey } from "@solana/web3.js";
import { AgentSearchResult } from "@/lib/registry/search";
import { supabaseAdmin } from "@/lib/db/supabase";
import { withRpcRetry } from "@/lib/blockchain/rpc";

export interface LiveVerificationDetails {
  cachedTrustScore: number;
  liveTrustScore: number;
  cachedFeedbackCount: number;
  liveFeedbackCount: number;
  hasChanged: boolean;
  discrepancyReason?: string;
}

export interface SelectedAgentResult {
  selectedAgent: AgentSearchResult;
  liveVerification: LiveVerificationDetails;
}

/**
 * Background async resync of an agent's Supabase row when on-chain state differs
 */
async function resyncAgentInSupabase(
  assetId: string,
  liveScore: number,
  liveFeedbacks: number
): Promise<void> {
  try {
    const db = supabaseAdmin();
    const conf = Math.min(liveFeedbacks / 5, 1) ** 0.6 * 0.9;
    await db
      .from("agents")
      .update({
        trust_score: liveScore,
        raw_avg_score: liveScore,
        confidence: parseFloat(conf.toFixed(3)),
        feedback_count: liveFeedbacks,
        last_synced_at: new Date().toISOString(),
      })
      .eq("asset_id", assetId);

    console.log(`[select] Background resync completed for ${assetId}: score=${liveScore}, feedbacks=${liveFeedbacks}`);
  } catch (err: any) {
    console.error(`[select] Background resync failed for ${assetId}:`, err.message);
  }
}

/**
 * Select top candidate agent and verify trust score live on-chain
 */
export async function selectAndVerifyAgent(
  candidates: AgentSearchResult[]
): Promise<SelectedAgentResult | null> {
  if (!candidates || candidates.length === 0) {
    return null;
  }

  // Top candidate by confidence-adjusted search score
  const topCandidate = { ...candidates[0] };
  const assetPubkey = new PublicKey(topCandidate.asset_id);

  // Query live summary directly from devnet with RPC failover and retry
  let liveScore = topCandidate.trust_score;
  let liveFeedbacks = topCandidate.feedback_count;
  let hasChanged = false;
  let discrepancyReason: string | undefined;

  try {
    const summary = await withRpcRetry(
      async (_connection, rpcUrl) => {
        const indexerUrl =
          process.env.INDEXER_URL ?? "https://8004-indexer-dev.qnt.sh/rest/v1";
        const sdk = new SolanaSDK({
          cluster: "devnet",
          indexerUrl,
          rpcUrl,
        });
        return await sdk.getSummary(assetPubkey, 0);
      },
      { maxRetries: 2, initialBackoffMs: 800, label: "select-verify" }
    );

    let onChainScore = summary.averageScore ?? 0;
    const onChainFeedbacks = summary.totalFeedbacks ?? 0;

    // In devnet, ATOM quality_score calibration may remain 0 if feedback is below
    // minimum calibration threshold. When feedbacks exist on-chain, resolve the real
    // arithmetic average score from the indexer record or feedback manager.
    if (onChainScore === 0 && onChainFeedbacks > 0) {
      try {
        const indexerUrl = process.env.INDEXER_URL ?? "https://8004-indexer-dev.qnt.sh/rest/v1";
        const res = await fetch(`${indexerUrl}/agents?asset=eq.${assetPubkey.toBase58()}&select=raw_avg_score,feedback_count`);
        if (res.ok) {
          const rows = await res.json();
          if (rows?.[0]?.raw_avg_score != null && Number(rows[0].raw_avg_score) > 0) {
            onChainScore = Number(rows[0].raw_avg_score);
          }
        }
      } catch {
        // preserve onChainScore
      }
    }

    // Check if score or count changed meaningfully (score delta > 0.05 or count different)
    const scoreDiff = Math.abs(onChainScore - topCandidate.trust_score);
    const countDiff = onChainFeedbacks !== topCandidate.feedback_count;

    if (scoreDiff > 0.05 || countDiff) {
      hasChanged = true;
      discrepancyReason = `Live on-chain reputation changed: score ${topCandidate.trust_score} -> ${onChainScore}, feedbacks ${topCandidate.feedback_count} -> ${onChainFeedbacks}`;
      console.warn(`[select] ${discrepancyReason} for agent ${topCandidate.name || topCandidate.asset_id}`);

      // Update in-memory candidate with live values
      topCandidate.trust_score = onChainScore;
      topCandidate.raw_avg_score = onChainScore;
      topCandidate.feedback_count = onChainFeedbacks;

      // Trigger background update in Supabase (non-blocking)
      resyncAgentInSupabase(topCandidate.asset_id, onChainScore, onChainFeedbacks).catch(
        () => {}
      );
    } else {
      console.log(`[select] Live on-chain score verified for ${topCandidate.name || topCandidate.asset_id}: ${onChainScore} (${onChainFeedbacks} feedbacks)`);
    }

    liveScore = onChainScore;
    liveFeedbacks = onChainFeedbacks;
  } catch (err: any) {
    console.error(`[select] Failed live on-chain check for ${topCandidate.asset_id} after retries: ${err.message}`);
    discrepancyReason = `Live check timed out (${err.message}). Using cached data.`;
  }

  return {
    selectedAgent: topCandidate,
    liveVerification: {
      cachedTrustScore: candidates[0].trust_score,
      liveTrustScore: liveScore,
      cachedFeedbackCount: candidates[0].feedback_count,
      liveFeedbackCount: liveFeedbacks,
      hasChanged,
      discrepancyReason,
    },
  };
}
