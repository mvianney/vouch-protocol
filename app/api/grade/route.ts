/**
 * POST /api/grade
 *
 * Standalone grading and verification endpoint:
 *   Takes a task description and an agent's execution response data,
 *   fetches independent Solana on-chain ground truth, and runs the AI Judge evaluation.
 *
 * Payload body:
 *   {
 *     "task": "check the SOL balance of this wallet: 4FonJM4jRekrbi3kzrSjEdvUuXFtQB5Rz9J6RnNczCJT",
 *     "agentName": "Solana Balance Sentinel",
 *     "agentResponse": {
 *       "balance_sol": 2.798690618
 *     },
 *     "durationMs": 1200
 *   }
 */

import { NextRequest, NextResponse } from "next/server";
import { gradeAgentExecution } from "@/lib/grading/verify";
import { DispatchResult } from "@/lib/execution/dispatch";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const task = body.task || body.taskDescription;
    const agentName = body.agentName || "Agent Under Test";
    const agentResponse = body.agentResponse || body.response || body.data;
    const durationMs = Number(body.durationMs ?? 1500);

    if (!task) {
      return NextResponse.json(
        { error: "Missing required parameter: 'task'" },
        { status: 400 }
      );
    }

    const syntheticDispatchResult: DispatchResult = {
      success: true,
      endpoint: body.endpoint || "http://localhost:3000/api/mock-agents/test",
      statusCode: 200,
      data: agentResponse,
      durationMs,
      dispatchedAt: new Date().toISOString(),
    };

    const gradeResult = await gradeAgentExecution({
      task,
      agentName,
      dispatchResult: syntheticDispatchResult,
    });

    return NextResponse.json({
      status: "success",
      task,
      agentName,
      grade: gradeResult,
    });
  } catch (err: any) {
    console.error("[api/grade] Error:", err);
    return NextResponse.json(
      { error: "Grading endpoint error", detail: err.message },
      { status: 500 }
    );
  }
}
