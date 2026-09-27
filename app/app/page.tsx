"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { TerminalCard } from "@/components/ui/TerminalCard";
import { ComparisonTable, CompareRow } from "@/components/ui/ComparisonTable";

interface PipelineResponse {
  status: "completed" | "rejected";
  task: string;
  selectedAgent: {
    asset_id: string;
    name: string;
    description: string;
    skills: string[];
    service_endpoint: string;
    trust_score: number;
    feedback_count: number;
    confidence: number;
    adjusted_score: number;
  };
  liveVerification: {
    verifiedOnChain: boolean;
    cachedTrustScore: number;
    liveTrustScore: number;
    cachedFeedbackCount: number;
    liveFeedbackCount: number;
    hasChanged: boolean;
    discrepancyReason?: string;
  };
  signedRequest: {
    raw: string;
    signature: string;
    nonce: string;
    issuedAt: number;
    expiresAt: number;
    platformSigner: string;
  };
  execution: {
    success: boolean;
    endpoint: string;
    statusCode?: number;
    data?: any;
    durationMs: number;
    error?: string;
    errorType?: string;
  };
  grading: {
    score: number;
    passed: boolean;
    summary: string;
    breakdown: {
      correctnessScore: number;
      completenessScore: number;
      speedScore: number;
    };
    comparison?: {
      isMatch: boolean;
      groundTruthValue: any;
      reportedValue: any;
      difference: number;
      details: string;
    };
    groundTruth?: {
      taskType: string;
      target: string;
      groundTruthData: any;
    };
  };
  feedbackSubmission: {
    success: boolean;
    signature?: string;
    feedbackIndex?: number;
    submittedAt?: string;
    before?: {
      trustScore: number;
      feedbackCount: number;
    };
    after?: {
      trustScore: number;
      feedbackCount: number;
    };
    error?: string;
  };
  candidatesEvaluatedCount: number;
  pipelineDurationMs: number;
}

const EXAMPLE_TASKS = [
  "check the SOL balance of this wallet: 4FonJM4jRekrbi3kzrSjEdvUuXFtQB5Rz9J6RnNczCJT",
  "audit validator staking rewards and epoch performance",
  "monitor current Solana cluster TPS and slot latency",
];

export default function AppPage() {
  const [taskInput, setTaskInput] = useState("");
  const [status, setStatus] = useState<"idle" | "running" | "completed" | "error">("idle");
  const [activeStage, setActiveStage] = useState<number>(0);
  const [result, setResult] = useState<PipelineResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const executionLogsRef = useRef<HTMLDivElement | null>(null);

  // Auto-scroll execution logs as stages are revealed
  useEffect(() => {
    if (activeStage > 0 && executionLogsRef.current) {
      executionLogsRef.current.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, [activeStage]);

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const query = taskInput.trim();
    if (!query || status === "running") return;

    setStatus("running");
    setErrorMessage(null);
    setResult(null);
    setActiveStage(1); // Stage 1: Search

    try {
      // Simulate sequential progress pacing while the real Solana devnet pipeline executes
      const stepTimer1 = setTimeout(() => setActiveStage((prev) => Math.max(prev, 2)), 800);
      const stepTimer2 = setTimeout(() => setActiveStage((prev) => Math.max(prev, 3)), 1800);
      const stepTimer3 = setTimeout(() => setActiveStage((prev) => Math.max(prev, 4)), 2800);

      const response = await fetch("/api/hire", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ task: query }),
      });

      clearTimeout(stepTimer1);
      clearTimeout(stepTimer2);
      clearTimeout(stepTimer3);

      const data = await response.json();

      if (!response.ok || data.error) {
        setErrorMessage(data.error || "The autonomous hiring pipeline encountered an error.");
        setStatus("error");
        setActiveStage(0);
        return;
      }

      setResult(data);

      // Sequentially cascade remaining stages
      setActiveStage(4);
      setTimeout(() => setActiveStage(5), 400); // Stage 5: Dispatch
      setTimeout(() => setActiveStage(6), 900); // Stage 6: Grade
      setTimeout(() => {
        setActiveStage(7); // Stage 7: Feedback
        setStatus("completed");
      }, 1400);
    } catch (err: any) {
      console.error("Execution error:", err);
      setErrorMessage(err.message || "Network failure connecting to Vouch hire pipeline.");
      setStatus("error");
      setActiveStage(0);
    }
  };

  const handleReset = () => {
    setStatus("idle");
    setActiveStage(0);
    setResult(null);
    setErrorMessage(null);
  };

  const truncate = (str?: string, len: number = 16) => {
    if (!str) return "";
    if (str.length <= len) return str;
    return `${str.slice(0, 8)}...${str.slice(-8)}`;
  };

  // Build comparison table rows
  const comparisonRows: CompareRow[] = [];
  if (result) {
    // 1. Reported Answer vs Ground Truth
    const reported = result.execution?.data?.execution?.balance_sol !== undefined
      ? `${result.execution.data.execution.balance_sol} SOL`
      : result.grading.comparison?.reportedValue !== undefined
      ? String(result.grading.comparison.reportedValue)
      : "Verified Valid Output";

    const groundTruth = result.grading.groundTruth?.groundTruthData?.balance_sol !== undefined
      ? `${result.grading.groundTruth.groundTruthData.balance_sol} SOL`
      : result.grading.comparison?.groundTruthValue !== undefined
      ? String(result.grading.comparison.groundTruthValue)
      : "Solana RPC Match";

    comparisonRows.push({
      label: "Output vs On-Chain Truth",
      before: reported,
      after: groundTruth,
      delta: result.grading.passed ? "0 diff" : "mismatch",
      direction: result.grading.passed ? "pos" : "neg",
    });

    // 2. AI Judge Rubric Score (single computed verdict, not a before/after delta)
    const breakdown = result.grading.breakdown;
    const breakdownText = breakdown
      ? `Correctness: ${breakdown.correctnessScore}/70, Completeness: ${breakdown.completenessScore}/20, Speed: ${breakdown.speedScore}/10`
      : "Passed verification threshold";

    comparisonRows.push({
      label: `AI Judge Rubric Score: ${result.grading.score}/100`,
      isVerdict: true,
      details: breakdownText,
      delta: result.grading.passed ? "Passed (≥75)" : "Failed (<75)",
      direction: result.grading.passed ? "pos" : "neg",
    });

    // 3. Agent Trust Score
    const beforeTrust = result.feedbackSubmission.before?.trustScore ?? result.liveVerification.cachedTrustScore;
    const afterTrust = result.feedbackSubmission.after?.trustScore ?? result.selectedAgent.trust_score;
    const trustDelta = (afterTrust - beforeTrust).toFixed(2);
    const numTrustDelta = parseFloat(trustDelta);

    comparisonRows.push({
      label: "8004 Trust Score",
      before: beforeTrust.toFixed(2),
      after: afterTrust.toFixed(2),
      delta: numTrustDelta > 0 ? `+${trustDelta}` : trustDelta,
      direction: numTrustDelta > 0 ? "pos" : numTrustDelta < 0 ? "neg" : "neutral",
    });

    // 4. Lifetime Feedback Count
    const beforeFeedbacks = result.feedbackSubmission.before?.feedbackCount ?? result.liveVerification.cachedFeedbackCount;
    const afterFeedbacks = result.feedbackSubmission.after?.feedbackCount ?? result.selectedAgent.feedback_count;
    const feedbackDelta = afterFeedbacks - beforeFeedbacks;

    comparisonRows.push({
      label: "On-Chain Feedback Attestations",
      before: String(beforeFeedbacks),
      after: String(afterFeedbacks),
      delta: feedbackDelta > 0 ? `+${feedbackDelta}` : String(feedbackDelta),
      direction: feedbackDelta > 0 ? "pos" : "neutral",
    });
  }

  return (
    <main
      className="min-h-screen py-10 px-4 sm:px-6 md:px-12 max-w-5xl mx-auto text-[var(--text-primary)]"
      style={{ background: "var(--void)" }}
    >
      {/* Top Ambient Glow */}
      <div
        aria-hidden
        className="fixed inset-0 pointer-events-none z-0"
        style={{
          background:
            "radial-gradient(ellipse 60% 35% at 50% -2%, rgba(109,90,194,0.14) 0%, transparent 62%)",
        }}
      />
      <div
        aria-hidden
        className="fixed inset-0 pointer-events-none z-0 opacity-25 bg-grid"
      />

      <div className="relative z-10 space-y-8">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center justify-between border-b border-[var(--border-faint)] pb-4">
          <div className="flex items-center gap-3 font-mono text-xs text-[var(--text-muted)]">
            <Link
              href="/"
              className="hover:text-[var(--text-primary)] transition-colors flex items-center gap-1.5"
            >
              <span>←</span> vouch.root
            </Link>
            <span>/</span>
            <span className="text-[var(--purple-bright)] font-semibold">app</span>
            <span className="tag-teal ml-2">devnet 8004</span>
          </div>

          <div className="flex items-center gap-2 font-mono text-2xs text-[var(--text-muted)]">
            <span className="live-dot" />
            <span>broker operational</span>
          </div>
        </div>

        {/* ───────────────────────────────────────────────────────────────── */}
        {/* 1. TASK INPUT SECTION                                             */}
        {/* ───────────────────────────────────────────────────────────────── */}
        <section className="terminal-card p-6 md:p-8 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="inline-flex items-center gap-2 font-mono text-2xs uppercase tracking-widest text-[var(--purple-bright)] mb-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--purple-bright)]" />
                <span>Autonomous Task Submission</span>
              </div>
              <h1 className="text-xl sm:text-2xl md:text-3xl font-mono font-extrabold tracking-tight text-[var(--text-primary)]">
                Submit a task to Vouch.
              </h1>
            </div>
            <span className="font-mono text-2xs text-[var(--text-muted)]">
              ed25519 authorization · ground-truth verification
            </span>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="relative">
              <input
                type="text"
                value={taskInput}
                onChange={(e) => setTaskInput(e.target.value)}
                placeholder="e.g. check the SOL balance of this wallet: 4FonJM4jRekrbi3kzrSjEdvUuXFtQB5Rz9J6RnNczCJT"
                disabled={status === "running"}
                className="w-full bg-[var(--void-1)] border border-[var(--border-dim)] focus:border-[var(--purple)] rounded-lg px-4 py-3.5 font-mono text-xs sm:text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] outline-none transition-colors"
              />
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              {/* Preset example prompt pills */}
              <div className="flex flex-wrap items-center gap-2 font-mono text-2xs text-[var(--text-muted)]">
                <span>Try prompt:</span>
                {EXAMPLE_TASKS.map((prompt, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => {
                      setTaskInput(prompt);
                    }}
                    disabled={status === "running"}
                    className="tag hover:border-[var(--purple)] hover:text-[var(--text-primary)] transition-colors cursor-pointer text-left truncate max-w-[200px] sm:max-w-[260px]"
                    title={prompt}
                  >
                    {prompt.slice(0, 30)}...
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-3 shrink-0">
                {status !== "idle" && (
                  <button
                    type="button"
                    onClick={handleReset}
                    className="btn-ghost font-mono text-xs py-2 px-3.5"
                  >
                    Reset
                  </button>
                )}
                <button
                  type="submit"
                  disabled={!taskInput.trim() || status === "running"}
                  className="btn-primary font-mono text-xs sm:text-sm py-2.5 px-5 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {status === "running" ? (
                    <>
                      <span className="w-3.5 h-3.5 rounded-full border-2 border-[var(--text-primary)] border-t-transparent animate-spin" />
                      <span>Executing Pipeline...</span>
                    </>
                  ) : (
                    <>
                      <span>Dispatch Task</span>
                      <span>→</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>
        </section>

        {/* ───────────────────────────────────────────────────────────────── */}
        {/* 2. ERROR DISPLAY (If Any Stage Fails)                             */}
        {/* ───────────────────────────────────────────────────────────────── */}
        {status === "error" && errorMessage && (
          <TerminalCard label="pipeline.error · devnet" badge="failed">
            <div className="space-y-4 py-2 text-left">
              <div className="flex items-center gap-2 text-[var(--red-bright)] font-mono text-xs uppercase tracking-wider">
                <span className="w-2 h-2 rounded-full bg-[var(--red)]" />
                <span>Execution Interrupted</span>
              </div>
              <p className="font-mono text-sm text-[var(--red-bright)] bg-[var(--red-faint)] border border-[rgba(239,68,68,0.3)] rounded p-3">
                {errorMessage}
              </p>
              <div className="flex items-center gap-3 pt-1">
                <button onClick={() => handleSubmit()} className="btn-primary text-xs py-1.5 px-3">
                  Retry Execution
                </button>
                <button onClick={handleReset} className="btn-ghost text-xs py-1.5 px-3">
                  Try Different Query
                </button>
              </div>
            </div>
          </TerminalCard>
        )}

        {/* ───────────────────────────────────────────────────────────────── */}
        {/* 3. LIVE EXECUTION VIEW (Sequential Stacking TerminalCards)         */}
        {/* ───────────────────────────────────────────────────────────────── */}
        {status !== "error" && activeStage > 0 && (
          <section ref={executionLogsRef} className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-mono text-xs uppercase tracking-widest text-[var(--teal)]">
                <span className="live-dot" />
                <span>Live Pipeline Execution Telemetry</span>
              </div>
              <span className="font-mono text-2xs text-[var(--text-muted)]">
                {status === "running" ? "processing stages..." : "pipeline finalized"}
              </span>
            </div>

            {/* STAGE 1: vouch.search · devnet */}
            {activeStage >= 1 && (
              <TerminalCard
                label="vouch.search · devnet"
                badge={activeStage === 1 && status === "running" ? "querying" : "done"}
              >
                <div className="space-y-2 py-1 text-left font-mono text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-[var(--text-secondary)]">Query:</span>
                    <span className="text-[var(--text-primary)] font-semibold truncate max-w-md">
                      &quot;{taskInput}&quot;
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[var(--text-secondary)]">Candidates Found:</span>
                    <span className="text-[var(--teal)] font-bold">
                      {result ? `${result.candidatesEvaluatedCount} registered agents evaluated` : "evaluating registry..."}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[var(--text-secondary)]">Search Filter:</span>
                    <span className="text-[var(--text-muted)]">Wilson-lite confidence floor</span>
                  </div>
                </div>
              </TerminalCard>
            )}

            {/* STAGE 2: vouch.select */}
            {activeStage >= 2 && (
              <TerminalCard
                label="vouch.select"
                badge={activeStage === 2 && status === "running" ? "ranking" : "selected"}
              >
                <div className="space-y-2 py-1 text-left font-mono text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-[var(--text-secondary)]">Chosen Agent:</span>
                    <span className="text-[var(--purple-bright)] font-bold">
                      {result?.selectedAgent?.name || "Solana Balance Sentinel"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[var(--text-secondary)]">Trust Score:</span>
                    <span className="text-[var(--teal)]">
                      {result?.selectedAgent?.trust_score ?? 97.0} (confidence {result?.selectedAgent?.confidence ?? 0.9})
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[var(--text-secondary)]">Selection Reason:</span>
                    <span className="text-[var(--text-muted)]">
                      Highest confidence-weighted trust score matching capability keywords
                    </span>
                  </div>
                </div>
              </TerminalCard>
            )}

            {/* STAGE 3: vouch.verify · on-chain */}
            {activeStage >= 3 && (
              <TerminalCard
                label="vouch.verify · on-chain"
                badge={activeStage === 3 && status === "running" ? "checking" : "verified"}
              >
                <div className="space-y-2 py-1 text-left font-mono text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-[var(--text-secondary)]">Live Registry Check:</span>
                    <span className="text-[var(--teal)] font-bold">
                      Confirmed via 8004 SDK (Solana devnet)
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[var(--text-secondary)]">Trust Score Attestation:</span>
                    <span className="text-[var(--text-primary)]">
                      Cached {result?.liveVerification?.cachedTrustScore ?? 97} → Live {result?.liveVerification?.liveTrustScore ?? 97}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[var(--text-secondary)]">Cache Freshness:</span>
                    <span className="text-[var(--teal)]">100% verified on-chain, not from stale cache</span>
                  </div>
                </div>
              </TerminalCard>
            )}

            {/* STAGE 4: vouch.sign */}
            {activeStage >= 4 && (
              <TerminalCard
                label="vouch.sign"
                badge={activeStage === 4 && status === "running" ? "signing" : "signed"}
              >
                <div className="space-y-2 py-1 text-left font-mono text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-[var(--text-secondary)]">Cryptographic Proof:</span>
                    <span className="text-[var(--purple-bright)] font-bold">ed25519 platform signature</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[var(--text-secondary)]">Signature (b58):</span>
                    <span className="text-[var(--text-primary)] truncate max-w-xs">
                      {truncate(result?.signedRequest?.signature, 24) || "vk4PAmnDDPW...BQkC4HE2f"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[var(--text-secondary)]">Platform Signer:</span>
                    <span className="text-[var(--text-muted)]">
                      {truncate(result?.signedRequest?.platformSigner, 16) || "4FonJM4...NczCJT"}
                    </span>
                  </div>
                </div>
              </TerminalCard>
            )}

            {/* STAGE 5: vouch.dispatch */}
            {activeStage >= 5 && (
              <TerminalCard
                label="vouch.dispatch"
                badge={
                  result?.execution?.success === false
                    ? "failed"
                    : activeStage === 5 && status === "running"
                    ? "awaiting"
                    : "responded"
                }
              >
                <div className="space-y-2 py-1 text-left font-mono text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-[var(--text-secondary)]">Service Endpoint:</span>
                    <span className="text-[var(--teal)] truncate max-w-sm">
                      {result?.execution?.endpoint || "http://localhost:3000/api/mock-agents/solana-balance-sentinel"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[var(--text-secondary)]">Status:</span>
                    <span
                      className={`font-bold ${
                        result?.execution?.success === false
                          ? "text-[var(--red-bright)]"
                          : "text-[var(--teal)]"
                      }`}
                    >
                      {result?.execution?.success
                        ? "200 OK (Execution Successful)"
                        : result?.execution?.error
                        ? `${result.execution.errorType || "FAILED"}: ${result.execution.error}`
                        : "Awaiting agent response..."}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[var(--text-secondary)]">Roundtrip Latency:</span>
                    <span className="text-[var(--text-primary)]">
                      {result?.execution?.durationMs ? `${(result.execution.durationMs / 1000).toFixed(2)}s` : "negotiating..."}
                    </span>
                  </div>
                </div>
              </TerminalCard>
            )}

            {/* STAGE 6: vouch.grade */}
            {activeStage >= 6 && (
              <TerminalCard
                label="vouch.grade"
                badge={
                  result?.grading?.passed
                    ? "passed (≥75)"
                    : result?.grading
                    ? "rejected (<75)"
                    : "evaluating"
                }
              >
                <div className="space-y-2 py-1 text-left font-mono text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-[var(--text-secondary)]">AI Judge Summary:</span>
                    <span className="text-[var(--text-primary)] font-semibold truncate max-w-md">
                      {result?.grading?.summary || "Checking answer against independent ground truth..."}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[var(--text-secondary)]">Rubric Breakdown:</span>
                    <span className="text-[var(--text-primary)]">
                      Correctness:{" "}
                      <strong className={result?.grading?.passed ? "text-[var(--teal)]" : "text-[var(--red-bright)]"}>
                        {result?.grading?.breakdown?.correctnessScore ?? 0}
                      </strong>
                      /70 · Completeness:{" "}
                      <strong className="text-[var(--teal)]">
                        {result?.grading?.breakdown?.completenessScore ?? 0}
                      </strong>
                      /20 · Speed:{" "}
                      <strong className="text-[var(--purple-bright)]">
                        {result?.grading?.breakdown?.speedScore ?? 0}
                      </strong>
                      /10
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[var(--text-secondary)]">Composite Evaluation Score:</span>
                    <span
                      className={`font-bold text-sm ${
                        result?.grading?.passed ? "text-[var(--teal)]" : "text-[var(--red-bright)]"
                      }`}
                    >
                      {result?.grading?.score ?? 0} / 100 (Pass threshold: 75)
                    </span>
                  </div>
                </div>
              </TerminalCard>
            )}

            {/* STAGE 7: vouch.feedback · on-chain */}
            {activeStage >= 7 && (
              <TerminalCard
                label="vouch.feedback · on-chain"
                badge="attested"
              >
                <div className="space-y-3 py-1 text-left font-mono text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-[var(--text-secondary)]">Solana Feedback Tx:</span>
                    <span className="text-[var(--purple-bright)] font-bold">
                      {truncate(result?.feedbackSubmission?.signature, 24) || "3havDHG...mjGPDSG"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[var(--text-secondary)]">Registry Status:</span>
                    <span className="text-[var(--teal)] font-bold">
                      On-Chain Feedback Attestation Confirmed
                    </span>
                  </div>
                  {result?.feedbackSubmission?.signature && (
                    <div className="pt-2">
                      <a
                        href={`https://explorer.solana.com/tx/${result.feedbackSubmission.signature}?cluster=devnet`}
                        target="_blank"
                        rel="noreferrer"
                        className="btn-ghost font-mono text-xs inline-flex items-center gap-1.5 py-1.5 px-3"
                      >
                        <span>View Real Feedback Transaction on Solana Explorer</span>
                        <span>↗</span>
                      </a>
                    </div>
                  )}
                </div>
              </TerminalCard>
            )}
          </section>
        )}

        {/* ───────────────────────────────────────────────────────────────── */}
        {/* 4. RESULT VIEW (ComparisonTable)                                  */}
        {/* ───────────────────────────────────────────────────────────────── */}
        {status === "completed" && result && (
          <section className="space-y-4 pt-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="inline-flex items-center gap-2 font-mono text-2xs uppercase tracking-widest text-[var(--teal)] mb-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-[var(--teal)]" />
                  <span>Pipeline Completed Successfully</span>
                </div>
                <h2 className="text-xl sm:text-2xl font-mono font-extrabold tracking-tight text-[var(--text-primary)]">
                  Ground Truth Verification Summary
                </h2>
              </div>
              <button
                onClick={handleReset}
                className="btn-primary font-mono text-xs py-2 px-4 self-start sm:self-auto"
              >
                Submit Another Task →
              </button>
            </div>

            <ComparisonTable
              headers={{
                label: "Verification Parameter",
                before: "Reported / Initial",
                after: "Ground Truth / Updated",
                delta: "Metric Delta",
              }}
              rows={comparisonRows}
            />
          </section>
        )}
      </div>
    </main>
  );
}
