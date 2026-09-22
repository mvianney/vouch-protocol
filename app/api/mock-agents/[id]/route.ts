import dns from "node:dns";
if (typeof dns?.setDefaultResultOrder === "function") {
  dns.setDefaultResultOrder("ipv4first");
}

import { NextRequest, NextResponse } from "next/server";
import { Connection, PublicKey, clusterApiUrl } from "@solana/web3.js";

export const dynamic = "force-dynamic";

interface AgentDef {
  id: string;
  name: string;
  description: string;
  capabilities: string[];
}

const AGENT_CATALOG: Record<string, AgentDef> = {
  "solana-balance-sentinel": {
    id: "solana-balance-sentinel",
    name: "Solana Balance Sentinel",
    description: "Real-time SOL and SPL token balance tracker across Solana devnet and mainnet with low-balance alert thresholds.",
    capabilities: ["wallet_balance", "spl_balance", "account_monitoring"],
  },
  "tx-chronicle-agent": {
    id: "tx-chronicle-agent",
    name: "Transaction Chronicle",
    description: "Detailed transaction history parser, decoding program logs, fee expenditures, and timestamped transfer signatures.",
    capabilities: ["transaction_history", "log_parsing", "fee_audit"],
  },
  "stake-yield-radar": {
    id: "stake-yield-radar",
    name: "Stake Yield Radar",
    description: "Validator performance & staking reward auditor calculating APY, epoch credits, and active stake delegation status.",
    capabilities: ["staking_rewards", "validator_metrics", "epoch_performance"],
  },
  "token-portfolio-scout": {
    id: "token-portfolio-scout",
    name: "Token Portfolio Scout",
    description: "Comprehensive token holdings analyzer mapping mint addresses, token metadata, decimals, and portfolio valuations.",
    capabilities: ["token_holdings", "mint_inspection", "portfolio_breakdown"],
  },
  "solana-pulse-oracle": {
    id: "solana-pulse-oracle",
    name: "Solana Pulse Oracle",
    description: "General-purpose Solana ledger observer providing TPS velocity, slot latency, epoch progression, and cluster telemetry.",
    capabilities: ["cluster_telemetry", "slot_tracking", "tps_monitoring", "ledger_queries"],
  },
};

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const agentId = params.id;
  const agent = AGENT_CATALOG[agentId];

  if (!agent) {
    return NextResponse.json({ error: `Mock agent ${agentId} not found` }, { status: 404 });
  }

  const { searchParams } = req.nextUrl;
  const targetWallet = searchParams.get("wallet") || searchParams.get("address");

  let liveSolanaData: Record<string, unknown> = {};

  try {
    const rpcUrl = process.env.HELIUS_RPC_URL ?? process.env.NEXT_PUBLIC_SOLANA_RPC_URL ?? clusterApiUrl("devnet");
    const connection = new Connection(rpcUrl, "confirmed");

    if (agentId === "solana-balance-sentinel" && targetWallet) {
      try {
        const pubkey = new PublicKey(targetWallet);
        const balLamports = await connection.getBalance(pubkey);
        liveSolanaData = {
          wallet: targetWallet,
          balance_lamports: balLamports,
          balance_sol: balLamports / 1e9,
          network: "solana-devnet",
        };
      } catch (err: any) {
        liveSolanaData = { note: `Could not fetch live balance: ${err.message}` };
      }
    } else if (agentId === "solana-pulse-oracle") {
      const slot = await connection.getSlot();
      const blockTime = await connection.getBlockTime(slot);
      liveSolanaData = {
        current_slot: slot,
        block_time: blockTime,
        cluster: "devnet",
      };
    }
  } catch {
    // Gracefully fallback to simulated payload if RPC is unreachable
  }

  return NextResponse.json({
    status: "ok",
    agent: agent.name,
    agent_id: agent.id,
    description: agent.description,
    capabilities: agent.capabilities,
    live_data: Object.keys(liveSolanaData).length ? liveSolanaData : undefined,
    response: `Agent ${agent.name} is online and operational on devnet.`,
    timestamp: new Date().toISOString(),
  });
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const agentId = params.id;
  const agent = AGENT_CATALOG[agentId];

  if (!agent) {
    return NextResponse.json({ error: `Mock agent ${agentId} not found` }, { status: 404 });
  }

  const body = await req.json().catch(() => ({}));
  const { searchParams } = req.nextUrl;

  // Support simulated failure modes for testing resilience
  if (searchParams.get("simulate") === "timeout" || body.simulate === "timeout") {
    const delay = parseInt(searchParams.get("delay") || "10000", 10);
    await new Promise((resolve) => setTimeout(resolve, delay));
  }

  if (searchParams.get("simulate") === "error" || body.simulate === "error") {
    return NextResponse.json(
      { error: "Simulated internal agent processing failure", code: "AGENT_RUNTIME_EXCEPTION" },
      { status: 500 }
    );
  }

  let targetWallet = body.wallet || body.address;

  // If wallet not passed directly, attempt extraction from taskDescription or task text (base58 regex)
  if (!targetWallet) {
    const textToSearch = body.taskDescription || body.task || "";
    const b58Match = textToSearch.match(/\b[1-9A-HJ-NP-Za-km-z]{32,44}\b/);
    if (b58Match) {
      targetWallet = b58Match[0];
    }
  }

  let executionResult: Record<string, unknown> = {};

  try {
    const rpcUrl = process.env.HELIUS_RPC_URL ?? process.env.NEXT_PUBLIC_SOLANA_RPC_URL ?? clusterApiUrl("devnet");
    const connection = new Connection(rpcUrl, "confirmed");

    if (agentId === "solana-balance-sentinel" && targetWallet) {
      try {
        const pubkey = new PublicKey(targetWallet);
        const balLamports = await connection.getBalance(pubkey);
        executionResult = {
          action: "get_wallet_balance",
          wallet: targetWallet,
          balance_sol: balLamports / 1e9,
          status: "verified",
        };
      } catch (err: any) {
        executionResult = { error: `Invalid wallet or query failure: ${err.message}` };
      }
    } else if (agentId === "tx-chronicle-agent" && targetWallet) {
      try {
        const pubkey = new PublicKey(targetWallet);
        const sigs = await connection.getSignaturesForAddress(pubkey, { limit: 5 });
        executionResult = {
          action: "fetch_recent_signatures",
          wallet: targetWallet,
          signatures: sigs.map((s) => ({
            signature: s.signature,
            slot: s.slot,
            err: s.err,
            memo: s.memo,
          })),
        };
      } catch (err: any) {
        executionResult = { error: err.message };
      }
    } else if (agentId === "solana-pulse-oracle") {
      const slot = await connection.getSlot();
      executionResult = {
        action: "cluster_telemetry",
        slot,
        epoch_info: await connection.getEpochInfo(),
      };
    } else {
      executionResult = {
        action: "simulated_task_execution",
        task: body.task || "default_query",
        result: `Task executed successfully by ${agent.name}.`,
      };
    }
  } catch (err: any) {
    executionResult = {
      action: "simulated_task_execution",
      notice: "RPC unavailable, returning verified simulation.",
      details: body,
    };
  }

  return NextResponse.json({
    success: true,
    agent: agent.name,
    agent_id: agent.id,
    execution: executionResult,
    executed_at: new Date().toISOString(),
  });
}
