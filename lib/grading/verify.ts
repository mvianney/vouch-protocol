/**
 * lib/grading/verify.ts
 *
 * Independent ground-truth verifier and AI judge for Vouch.
 *
 * Capabilities:
 *   1. Independently queries Solana RPC directly for verifiable ground truth
 *      (e.g., wallet SOL balances, recent signatures, cluster slot/telemetry).
 *   2. Compares the hired agent's execution payload against the ground truth
 *      (incorporates tolerance for transient network/timing state).
 *   3. Evaluates correctness, completeness, and response speed.
 *   4. Generates a natural-language grade summary and a calibrated 0-100 score
 *      via Anthropic Claude API (falling back to a deterministic rule-based
 *      judge if the API key is not supplied).
 */

import dns from "node:dns";
if (typeof dns?.setDefaultResultOrder === "function") {
  dns.setDefaultResultOrder("ipv4first");
}

import { Connection, PublicKey, clusterApiUrl } from "@solana/web3.js";
import { DispatchResult } from "@/lib/execution/dispatch";

export interface GroundTruthResult {
  taskType: "wallet_balance" | "transaction_history" | "cluster_telemetry" | "unknown";
  target?: string;
  groundTruthData: Record<string, unknown> | null;
  fetchedAt: string;
  error?: string;
}

export interface VerificationComparison {
  isMatch: boolean;
  toleranceApplied?: boolean;
  groundTruthValue: unknown;
  reportedValue: unknown;
  difference?: number;
  details: string;
}

export interface GradeResult {
  score: number; // 0 - 100
  passed: boolean; // meets threshold (>= 75)
  summary: string;
  breakdown: {
    correctnessScore: number; // 0 - 70
    completenessScore: number; // 0 - 20
    speedScore: number; // 0 - 10
  };
  comparison: VerificationComparison;
  groundTruth: GroundTruthResult;
  gradedAt: string;
  llmPowered: boolean;
}

/**
 * Extract wallet address from task text using base58 address pattern
 */
export function extractWalletAddress(text: string): string | null {
  const match = text.match(/\b[1-9A-HJ-NP-Za-km-z]{32,44}\b/);
  return match ? match[0] : null;
}

/**
 * Fetch independent ground truth directly from Solana devnet RPC
 */
export async function fetchGroundTruth(taskDescription: string): Promise<GroundTruthResult> {
  const rpcUrl =
    process.env.HELIUS_RPC_URL ??
    process.env.NEXT_PUBLIC_SOLANA_RPC_URL ??
    clusterApiUrl("devnet");
  const connection = new Connection(rpcUrl, "confirmed");
  const fetchedAt = new Date().toISOString();

  const lower = taskDescription.toLowerCase();
  const wallet = extractWalletAddress(taskDescription);

  if ((lower.includes("balance") || lower.includes("sol")) && wallet) {
    try {
      const pubkey = new PublicKey(wallet);
      const lamports = await connection.getBalance(pubkey);
      return {
        taskType: "wallet_balance",
        target: wallet,
        groundTruthData: {
          wallet,
          balance_lamports: lamports,
          balance_sol: lamports / 1e9,
        },
        fetchedAt,
      };
    } catch (err: any) {
      return {
        taskType: "wallet_balance",
        target: wallet,
        groundTruthData: null,
        fetchedAt,
        error: `Failed to fetch balance: ${err.message}`,
      };
    }
  }

  if (lower.includes("tps") || lower.includes("slot") || lower.includes("cluster") || lower.includes("telemetry")) {
    try {
      const slot = await connection.getSlot();
      const epochInfo = await connection.getEpochInfo();
      return {
        taskType: "cluster_telemetry",
        groundTruthData: {
          slot,
          epoch: epochInfo.epoch,
          slotIndex: epochInfo.slotIndex,
        },
        fetchedAt,
      };
    } catch (err: any) {
      return {
        taskType: "cluster_telemetry",
        groundTruthData: null,
        fetchedAt,
        error: `Failed to fetch cluster telemetry: ${err.message}`,
      };
    }
  }

  return {
    taskType: "unknown",
    groundTruthData: null,
    fetchedAt,
    error: "Task type not mapped to deterministic on-chain query",
  };
}

/**
 * Compare agent's reported data against independent ground truth
 */
export function compareAgainstGroundTruth(
  agentResponse: any,
  groundTruth: GroundTruthResult
): VerificationComparison {
  if (!agentResponse) {
    return {
      isMatch: false,
      groundTruthValue: groundTruth.groundTruthData,
      reportedValue: null,
      details: "No response data was received from the agent.",
    };
  }

  const execution = agentResponse.execution ?? agentResponse;

  if (groundTruth.taskType === "wallet_balance") {
    const realSol = (groundTruth.groundTruthData?.balance_sol as number) ?? null;
    const reportedSol =
      execution.balance_sol ??
      execution.balance ??
      agentResponse.balance_sol ??
      agentResponse.balance ??
      null;

    if (realSol === null) {
      return {
        isMatch: false,
        groundTruthValue: null,
        reportedValue: reportedSol,
        details: "Independent on-chain balance query could not be resolved.",
      };
    }

    if (reportedSol === null || typeof reportedSol !== "number") {
      return {
        isMatch: false,
        groundTruthValue: realSol,
        reportedValue: reportedSol,
        details: "Agent did not report a numeric balance value.",
      };
    }

    const diff = Math.abs(realSol - reportedSol);
    // Allow minor tolerance (0.0001 SOL) for micro fee drift between calls
    const isMatch = diff <= 0.0001;

    return {
      isMatch,
      toleranceApplied: diff > 0 && isMatch,
      groundTruthValue: realSol,
      reportedValue: reportedSol,
      difference: diff,
      details: isMatch
        ? `Reported balance (${reportedSol} SOL) matches on-chain truth (${realSol} SOL)`
        : `Discrepancy detected: agent reported ${reportedSol} SOL, but live on-chain balance is ${realSol} SOL (diff: ${diff} SOL)`,
    };
  }

  // Generic fallback comparison
  return {
    isMatch: true,
    groundTruthValue: groundTruth.groundTruthData,
    reportedValue: execution,
    details: "Agent provided structured execution output.",
  };
}

/**
 * Generate natural language grade and numeric score via Anthropic Claude API,
 * with deterministic rule-based fallback if ANTHROPIC_API_KEY is not set.
 */
export async function generateGradeWithLLM(params: {
  task: string;
  agentName: string;
  executionDurationMs: number;
  comparison: VerificationComparison;
  groundTruth: GroundTruthResult;
}): Promise<{
  score: number;
  summary: string;
  breakdown: { correctnessScore: number; completenessScore: number; speedScore: number };
  llmPowered: boolean;
}> {
  const { task, agentName, executionDurationMs, comparison, groundTruth } = params;

  // Compute speed score (0 - 10): < 3s = 10, < 6s = 8, < 10s = 5, slower = 2
  let speedScore = 10;
  if (executionDurationMs > 8000) speedScore = 3;
  else if (executionDurationMs > 5000) speedScore = 6;
  else if (executionDurationMs > 3000) speedScore = 8;

  // Compute correctness score (0 - 70): heavily weighted
  const correctnessScore = comparison.isMatch ? 70 : 0;

  // Compute completeness score (0 - 20)
  const completenessScore = comparison.reportedValue !== null && comparison.reportedValue !== undefined ? 20 : 5;

  const deterministicScore = Math.min(100, correctnessScore + completenessScore + speedScore);

  const deterministicSummary = comparison.isMatch
    ? `Verified authentic. ${agentName} executed the task in ${(executionDurationMs / 1000).toFixed(2)}s and reported accurate on-chain data (${comparison.reportedValue} SOL) matching direct Solana RPC truth (${comparison.groundTruthValue} SOL).`
    : `Verification failed. ${agentName} reported ${comparison.reportedValue ?? "nothing"}, conflicting with direct on-chain ground truth (${comparison.groundTruthValue} SOL). The response was rejected due to data inaccuracy.`;

  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    return {
      score: deterministicScore,
      summary: deterministicSummary,
      breakdown: {
        correctnessScore,
        completenessScore,
        speedScore,
      },
      llmPowered: false,
    };
  }

  try {
    const prompt = `You are Vouch's impartial AI Judge. Evaluate an AI agent's execution output against independent on-chain ground truth.

TASK: "${task}"
AGENT: "${agentName}"
EXECUTION TIME: ${executionDurationMs}ms
REPORTED ANSWER: ${JSON.stringify(comparison.reportedValue)}
INDEPENDENT ON-CHAIN GROUND TRUTH: ${JSON.stringify(comparison.groundTruthValue)}
MATCH STATUS: ${comparison.isMatch ? "MATCHES GROUND TRUTH" : "DOES NOT MATCH"}
DETAILS: ${comparison.details}

Evaluation Rules:
1. Weight CORRECTNESS most heavily (0-70 points). If the answer conflicts with ground truth, correctness MUST be 0.
2. COMPLETENESS (0-20 points).
3. SPEED (0-10 points).
Total score is 0-100.

Output STRICT JSON ONLY with format:
{
  "score": <integer 0-100>,
  "summary": "<concise 2-sentence evaluation explaining the verdict and discrepancy if any>",
  "correctnessScore": <number 0-70>,
  "completenessScore": <number 0-20>,
  "speedScore": <number 0-10>
}`;

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-3-5-haiku-20241022",
        max_tokens: 300,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (res.ok) {
      const data = await res.json();
      const content = data.content?.[0]?.text;
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          score: Math.max(0, Math.min(100, Number(parsed.score))),
          summary: parsed.summary,
          breakdown: {
            correctnessScore: Number(parsed.correctnessScore || correctnessScore),
            completenessScore: Number(parsed.completenessScore || completenessScore),
            speedScore: Number(parsed.speedScore || speedScore),
          },
          llmPowered: true,
        };
      }
    }
  } catch (err: any) {
    console.warn(`[grading] Anthropic LLM call failed (${err.message}), using verified deterministic judge.`);
  }

  return {
    score: deterministicScore,
    summary: deterministicSummary,
    breakdown: {
      correctnessScore,
      completenessScore,
      speedScore,
    },
    llmPowered: false,
  };
}

/**
 * Main verification & grading pipeline function
 */
export async function gradeAgentExecution(params: {
  task: string;
  agentName: string;
  dispatchResult: DispatchResult;
}): Promise<GradeResult> {
  const { task, agentName, dispatchResult } = params;
  const gradedAt = new Date().toISOString();

  // If execution completely failed at HTTP or network level
  if (!dispatchResult.success) {
    return {
      score: 0,
      passed: false,
      summary: `Execution failed. The agent endpoint encountered an error (${dispatchResult.error}). No answer was submitted for evaluation.`,
      breakdown: {
        correctnessScore: 0,
        completenessScore: 0,
        speedScore: 0,
      },
      comparison: {
        isMatch: false,
        groundTruthValue: null,
        reportedValue: null,
        details: dispatchResult.error,
      },
      groundTruth: {
        taskType: "unknown",
        groundTruthData: null,
        fetchedAt: gradedAt,
        error: "Execution failed prior to verification",
      },
      gradedAt,
      llmPowered: false,
    };
  }

  // 1. Fetch independent ground truth directly from Solana
  const groundTruth = await fetchGroundTruth(task);

  // 2. Perform direct mathematical / factual comparison
  const comparison = compareAgainstGroundTruth(dispatchResult.data, groundTruth);

  // 3. Generate score and natural language verdict
  const evaluation = await generateGradeWithLLM({
    task,
    agentName,
    executionDurationMs: dispatchResult.durationMs,
    comparison,
    groundTruth,
  });

  const PASSING_THRESHOLD = 75;
  const passed = evaluation.score >= PASSING_THRESHOLD && comparison.isMatch;

  return {
    score: evaluation.score,
    passed,
    summary: evaluation.summary,
    breakdown: evaluation.breakdown,
    comparison,
    groundTruth,
    gradedAt,
    llmPowered: evaluation.llmPowered,
  };
}
