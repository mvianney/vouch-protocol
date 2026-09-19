/**
 * GET /api/agents/search?q=<query>&limit=<n>&min_feedback=<n>
 *
 * Searches the local Supabase agents cache by keyword and returns results
 * sorted by confidence-adjusted trust score.
 *
 * Query params:
 *   q             — search query (required)
 *   limit         — max results to return (default: 20, max: 100)
 *   min_feedback  — minimum feedback count filter (default: 0)
 *
 * Example:
 *   GET /api/agents/search?q=natural+language&limit=10
 */

import { NextRequest, NextResponse } from "next/server";
import { searchAgents } from "@/lib/registry/search";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;

  const query = searchParams.get("q") ?? searchParams.get("query") ?? "";
  const limitParam = parseInt(searchParams.get("limit") ?? "20", 10);
  const minFeedback = parseInt(searchParams.get("min_feedback") ?? "0", 10);

  if (!query.trim()) {
    return NextResponse.json(
      { error: "Missing required param: q" },
      { status: 400 }
    );
  }

  try {
    const result = await searchAgents({
      query,
      limit: isNaN(limitParam) ? 20 : limitParam,
      min_feedback_count: isNaN(minFeedback) ? 0 : minFeedback,
    });

    return NextResponse.json(result);
  } catch (err) {
    console.error("[api/agents/search] Error:", err);
    return NextResponse.json(
      { error: "Search failed", detail: String(err) },
      { status: 500 }
    );
  }
}
