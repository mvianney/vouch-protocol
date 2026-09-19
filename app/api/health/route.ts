import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    status: "ok",
    service: "vouch-solana",
    message: "Vouch API is running",
    timestamp: new Date().toISOString(),
  });
}
