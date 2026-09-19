import { NextResponse } from "next/server";
import { fetchRegisteredAgents } from "@/lib/blockchain/registry";

export async function GET() {
  try {
    const agents = await fetchRegisteredAgents();
    return NextResponse.json({ agents });
  } catch (error) {
    console.error("[api/agents] Error fetching agents:", error);
    return NextResponse.json(
      { error: "Failed to fetch agents" },
      { status: 500 }
    );
  }
}
