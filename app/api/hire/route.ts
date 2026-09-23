/**
 * POST /api/hire
 *
 * Full Vouch hiring pipeline:
 *   1. Search: Queries local Supabase cache by task keywords.
 *   2. Select: Picks the highest confidence-adjusted candidate match.
 *   3. Live Verify: Checks on-chain trust score via 8004 SDK (updates cache if changed).
 *   4. Sign: Cryptographically signs a hire authorization using Vouch platform wallet.
 *   5. Response: Returns selected agent details, live verification proof, and signed payload.
 *
 * Payload body:
 *   {
 *     "task": "check the SOL balance of this wallet: 4FonJM4jRekrbi3kzrSjEdvUuXFtQB5Rz9J6RnNczCJT"
 *   }
 */

import { NextRequest, NextResponse } from "next/server";
import { searchAgents } from "@/lib/registry/search";
import { selectAndVerifyAgent } from "@/lib/hiring/select";
import { signHireRequest } from "@/lib/hiring/sign";
import { dispatchTaskToAgent, DispatchResult } from "@/lib/execution/dispatch";
import { gradeAgentExecution } from "@/lib/grading/verify";
import { submitOnChainFeedback, FeedbackSubmissionResult } from "@/lib/feedback/submit";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const task = body.task || body.taskDescription || body.query;

    if (!task || typeof task !== "string" || !task.trim()) {
      return NextResponse.json(
        { error: "Missing required parameter: 'task'" },
        { status: 400 }
      );
    }

    const trimmedTask = task.trim();
    console.log(`[api/hire] Incoming hire request for task: "${trimmedTask}"`);

    // Step 1: Search local Supabase candidates
    const searchResponse = await searchAgents({
      query: trimmedTask,
      limit: 10,
    });

    if (!searchResponse.results || searchResponse.results.length === 0) {
      return NextResponse.json(
        {
          error: "No matching agents found for this task",
          query: trimmedTask,
        },
        { status: 404 }
      );
    }

    console.log(`[api/hire] Found ${searchResponse.results.length} candidate agents. Top candidate: ${searchResponse.results[0].name}`);

    // Step 2 & 3: Select top candidate and verify live on-chain
    const selection = await selectAndVerifyAgent(searchResponse.results);

    if (!selection) {
      return NextResponse.json(
        { error: "Failed to evaluate candidate agents" },
        { status: 500 }
      );
    }

    const { selectedAgent, liveVerification } = selection;

    // Step 4: Cryptographically sign hire request with Vouch platform wallet
    const signedHire = signHireRequest(selectedAgent.asset_id, trimmedTask);

    console.log(`[api/hire] Successfully generated signed hire request for ${selectedAgent.name} (${selectedAgent.asset_id})`);

    // Step 5: Dispatch task to the hired agent's service endpoint
    let executionResult: DispatchResult;
    if (selectedAgent.service_endpoint) {
      console.log(`[api/hire] Dispatching task to agent endpoint: ${selectedAgent.service_endpoint}`);
      executionResult = await dispatchTaskToAgent(
        selectedAgent.service_endpoint,
        signedHire,
        {
          timeoutMs: 8000,
          extraParams: {
            wallet: body.wallet || body.address,
            simulate: body.simulate,
            delay: body.delay,
          },
        }
      );
      console.log(`[api/hire] Dispatch result (success=${executionResult.success}, duration=${executionResult.durationMs}ms)`);
    } else {
      console.warn(`[api/hire] Agent ${selectedAgent.name} has no service_endpoint configured`);
      executionResult = {
        success: false,
        endpoint: "",
        error: "Agent does not have a registered service endpoint",
        errorType: "INVALID_ENDPOINT",
        durationMs: 0,
        dispatchedAt: new Date().toISOString(),
      };
    }

    // Step 6: AI Grading & Ground Truth Verification
    console.log(`[api/hire] Running AI Judge & ground truth verification for ${selectedAgent.name}...`);
    const gradeResult = await gradeAgentExecution({
      task: trimmedTask,
      agentName: selectedAgent.name || "Unknown Agent",
      dispatchResult: executionResult,
    });
    console.log(`[api/hire] Grading complete: score=${gradeResult.score}, passed=${gradeResult.passed}`);

    // Step 7: On-Chain Feedback Submission
    console.log(`[api/hire] Submitting evaluation feedback on-chain for ${selectedAgent.name}...`);
    const feedbackResult = await submitOnChainFeedback({
      agentAssetId: selectedAgent.asset_id,
      grade: gradeResult,
      endpoint: selectedAgent.service_endpoint,
      signedNonce: signedHire.parsedPayload.nonce,
      taskDescription: trimmedTask,
    });
    console.log(
      `[api/hire] Feedback submitted: success=${feedbackResult.success}, tx=${feedbackResult.signature ?? "none"}, score: ${feedbackResult.before.trustScore} -> ${feedbackResult.after.trustScore}, count: ${feedbackResult.before.feedbackCount} -> ${feedbackResult.after.feedbackCount}`
    );

    // Step 8: Return complete pipeline response
    return NextResponse.json({
      status: gradeResult.passed ? "completed" : "rejected",
      task: trimmedTask,
      selectedAgent: {
        asset_id: selectedAgent.asset_id,
        name: selectedAgent.name,
        description: selectedAgent.description,
        skills: selectedAgent.skills,
        service_endpoint: selectedAgent.service_endpoint,
        trust_score: feedbackResult.after.trustScore,
        feedback_count: feedbackResult.after.feedbackCount,
        confidence: selectedAgent.confidence,
        adjusted_score: selectedAgent.adjusted_score,
      },
      liveVerification: {
        verifiedOnChain: true,
        cachedTrustScore: liveVerification.cachedTrustScore,
        liveTrustScore: liveVerification.liveTrustScore,
        cachedFeedbackCount: liveVerification.cachedFeedbackCount,
        liveFeedbackCount: liveVerification.liveFeedbackCount,
        hasChanged: liveVerification.hasChanged,
        discrepancyReason: liveVerification.discrepancyReason,
      },
      signedRequest: {
        raw: signedHire.rawSignedPayload,
        signature: signedHire.parsedPayload.sig,
        nonce: signedHire.parsedPayload.nonce,
        issuedAt: signedHire.parsedPayload.issuedAt,
        expiresAt: signedHire.parsedPayload.data.expiresAt,
        platformSigner: signedHire.signerPublicKey,
      },
      execution: executionResult,
      grading: {
        score: gradeResult.score,
        passed: gradeResult.passed,
        summary: gradeResult.summary,
        breakdown: gradeResult.breakdown,
        comparison: gradeResult.comparison,
        groundTruth: gradeResult.groundTruth,
        gradedAt: gradeResult.gradedAt,
        llmPowered: gradeResult.llmPowered,
      },
      feedbackSubmission: {
        success: feedbackResult.success,
        signature: feedbackResult.signature,
        feedbackIndex: feedbackResult.feedbackIndex,
        submittedAt: feedbackResult.submittedAt,
        feedbackDetails: feedbackResult.feedbackDetails,
        before: feedbackResult.before,
        after: feedbackResult.after,
        error: feedbackResult.error,
      },
      candidatesEvaluatedCount: searchResponse.results.length,
      pipelineDurationMs: searchResponse.duration_ms + (executionResult?.durationMs ?? 0),
    });
  } catch (err: any) {
    console.error("[api/hire] Pipeline error:", err);
    return NextResponse.json(
      { error: "Internal hire pipeline error", detail: err.message },
      { status: 500 }
    );
  }
}
