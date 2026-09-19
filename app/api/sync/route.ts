/**
 * POST/GET /api/sync
 *
 * Manually triggers an agent registry sync from the 8004 indexer into Supabase.
 * Protected by a SYNC_SECRET header check so it can't be called anonymously.
 *
 * Usage:
 *   curl -X POST http://localhost:3000/api/sync \
 *     -H "x-sync-secret: <SYNC_SECRET>" \
 *     -d '{"cluster": "devnet"}'
 *
 * Later: wire this endpoint URL into a Vercel Cron Job or Supabase Edge Function
 * scheduled trigger for automatic periodic sync.
 */

import { NextRequest, NextResponse } from "next/server";
import { syncAgents } from "@/lib/registry/sync";

export const dynamic = "force-dynamic";
export const maxDuration = 300; // 5 min — allow time for large syncs

/** Simple secret-based guard. Set SYNC_SECRET in .env.local */
function isAuthorized(req: NextRequest): boolean {
  const secret = process.env.SYNC_SECRET;
  // If no SYNC_SECRET is configured, allow all (dev mode)
  if (!secret) return true;
  const provided =
    req.headers.get("x-sync-secret") ??
    req.nextUrl.searchParams.get("secret");
  return provided === secret;
}

export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let cluster: "devnet" | "mainnet-beta" = "mainnet-beta";
  try {
    const body = await req.json().catch(() => ({}));
    if (body?.cluster === "devnet" || body?.cluster === "mainnet-beta") {
      cluster = body.cluster;
    }
  } catch {
    // no body — fine, use default
  }

  try {
    const result = await syncAgents(cluster);
    return NextResponse.json(result, {
      status: result.errors.length ? 207 : 200,
    });
  } catch (err) {
    console.error("[api/sync] Unexpected error:", err);
    return NextResponse.json(
      { error: "Sync failed", detail: String(err) },
      { status: 500 }
    );
  }
}

// Also accept GET for easy browser/cURL testing without a body
export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const clusterParam = req.nextUrl.searchParams.get("cluster");
  const cluster: "devnet" | "mainnet-beta" =
    clusterParam === "devnet" ? "devnet" : "mainnet-beta";

  try {
    const result = await syncAgents(cluster);
    return NextResponse.json(result, {
      status: result.errors.length ? 207 : 200,
    });
  } catch (err) {
    console.error("[api/sync] Unexpected error:", err);
    return NextResponse.json(
      { error: "Sync failed", detail: String(err) },
      { status: 500 }
    );
  }
}
