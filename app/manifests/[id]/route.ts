import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const DEMO_MANIFESTS: Record<string, Record<string, unknown>> = {
  "balance-sentinel": {
    name: "Solana Balance Sentinel",
    description: "Real-time SOL and SPL token balance tracker across Solana devnet and mainnet with low-balance alert thresholds.",
    version: "1.0.0",
    skills: [
      "data_analytics/blockchain_analytics/balance_tracking",
      "monitoring/alerting/low_balance_detector",
      "cryptocurrency/solana/account_inspection"
    ],
    url: "https://vouch-solana.vercel.app/api/mock-agents/solana-balance-sentinel",
    endpoint: "https://vouch-solana.vercel.app/api/mock-agents/solana-balance-sentinel",
    services: [
      {
        type: "mcp",
        value: "https://vouch-solana.vercel.app/api/mock-agents/solana-balance-sentinel"
      },
      {
        type: "a2a",
        value: "https://vouch-solana.vercel.app/api/mock-agents/solana-balance-sentinel"
      }
    ],
    capabilities: ["wallet_balance", "spl_balance", "account_monitoring"]
  },
  "tx-chronicle": {
    name: "Transaction Chronicle",
    description: "Detailed transaction history parser, decoding program logs, fee expenditures, and timestamped transfer signatures.",
    version: "1.0.0",
    skills: [
      "data_analytics/blockchain_analytics/transaction_history",
      "forensics/audit/fee_analysis",
      "cryptocurrency/solana/log_decoding"
    ],
    url: "https://vouch-solana.vercel.app/api/mock-agents/tx-chronicle-agent",
    endpoint: "https://vouch-solana.vercel.app/api/mock-agents/tx-chronicle-agent",
    services: [
      {
        type: "mcp",
        value: "https://vouch-solana.vercel.app/api/mock-agents/tx-chronicle-agent"
      }
    ],
    capabilities: ["transaction_history", "log_parsing", "fee_audit"]
  },
  "stake-radar": {
    name: "Stake Yield Radar",
    description: "Validator performance & staking reward auditor calculating APY, epoch credits, and active stake delegation status.",
    version: "1.0.0",
    skills: [
      "decentralized_finance/staking/yield_analytics",
      "cryptocurrency/solana/validator_metrics",
      "monitoring/reporting/epoch_performance"
    ],
    url: "https://vouch-solana.vercel.app/api/mock-agents/stake-yield-radar",
    endpoint: "https://vouch-solana.vercel.app/api/mock-agents/stake-yield-radar",
    services: [
      {
        type: "mcp",
        value: "https://vouch-solana.vercel.app/api/mock-agents/stake-yield-radar"
      }
    ],
    capabilities: ["staking_rewards", "validator_metrics", "epoch_performance"]
  },
  "portfolio-scout": {
    name: "Token Portfolio Scout",
    description: "Comprehensive token holdings analyzer mapping mint addresses, token metadata, decimals, and portfolio valuations.",
    version: "1.0.0",
    skills: [
      "decentralized_finance/portfolio/token_holdings",
      "cryptocurrency/solana/spl_token_metadata",
      "data_analytics/valuation/asset_breakdown"
    ],
    url: "https://vouch-solana.vercel.app/api/mock-agents/token-portfolio-scout",
    endpoint: "https://vouch-solana.vercel.app/api/mock-agents/token-portfolio-scout",
    services: [
      {
        type: "mcp",
        value: "https://vouch-solana.vercel.app/api/mock-agents/token-portfolio-scout"
      }
    ],
    capabilities: ["token_holdings", "mint_inspection", "portfolio_breakdown"]
  },
  "pulse-oracle": {
    name: "Solana Pulse Oracle",
    description: "General-purpose Solana ledger observer providing TPS velocity, slot latency, epoch progression, and cluster telemetry.",
    version: "1.0.0",
    skills: [
      "infrastructure/telemetry/cluster_health",
      "data_analytics/metrics/tps_monitoring",
      "cryptocurrency/solana/ledger_state"
    ],
    url: "https://vouch-solana.vercel.app/api/mock-agents/solana-pulse-oracle",
    endpoint: "https://vouch-solana.vercel.app/api/mock-agents/solana-pulse-oracle",
    services: [
      {
        type: "mcp",
        value: "https://vouch-solana.vercel.app/api/mock-agents/solana-pulse-oracle"
      }
    ],
    capabilities: ["cluster_telemetry", "slot_tracking", "tps_monitoring", "ledger_queries"]
  }
};

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const id = params.id.replace(/\.json$/, "");
  const manifest = DEMO_MANIFESTS[id];

  if (!manifest) {
    return NextResponse.json({ error: `Manifest ${id} not found` }, { status: 404 });
  }

  return NextResponse.json(manifest);
}
