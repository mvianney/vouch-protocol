import { Connection } from "@solana/web3.js";

/**
 * Returns prioritized list of Solana devnet RPC endpoints for failover.
 * 1. HELIUS_RPC_URL (high performance, private API key)
 * 2. NEXT_PUBLIC_SOLANA_RPC_URL (configured devnet endpoint)
 * 3. Public Solana Devnet RPC (canonical fallback)
 */
export function getRpcEndpoints(): string[] {
  const endpoints: string[] = [];

  if (process.env.HELIUS_RPC_URL) {
    endpoints.push(process.env.HELIUS_RPC_URL);
  }

  if (
    process.env.NEXT_PUBLIC_SOLANA_RPC_URL &&
    !endpoints.includes(process.env.NEXT_PUBLIC_SOLANA_RPC_URL)
  ) {
    endpoints.push(process.env.NEXT_PUBLIC_SOLANA_RPC_URL);
  }

  const publicDevnet = "https://api.devnet.solana.com";
  if (!endpoints.includes(publicDevnet)) {
    endpoints.push(publicDevnet);
  }

  return endpoints;
}

export interface RpcRetryOptions {
  maxRetries?: number;
  initialBackoffMs?: number;
  label?: string;
}

/**
 * Execute an RPC operation with automatic failover across endpoints and exponential backoff.
 */
export async function withRpcRetry<T>(
  operation: (connection: Connection, rpcUrl: string) => Promise<T>,
  options: RpcRetryOptions = {}
): Promise<T> {
  const endpoints = getRpcEndpoints();
  const maxRetries = options.maxRetries ?? 2;
  const initialBackoffMs = options.initialBackoffMs ?? 800;
  const label = options.label || "rpc-op";

  let lastError: any = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    // Round-robin or failover to next endpoint on each retry
    const endpointIndex = attempt % endpoints.length;
    const rpcUrl = endpoints[endpointIndex];
    const connection = new Connection(rpcUrl, "confirmed");

    try {
      return await operation(connection, rpcUrl);
    } catch (err: any) {
      lastError = err;
      const isLastAttempt = attempt === maxRetries;

      if (!isLastAttempt) {
        const backoffMs = initialBackoffMs * Math.pow(1.5, attempt);
        const nextEndpoint = endpoints[(attempt + 1) % endpoints.length];
        console.warn(
          `[${label}] Attempt ${attempt + 1} failed on ${rpcUrl.slice(0, 30)}... (${err.message}). Retrying in ${backoffMs}ms using ${nextEndpoint.slice(0, 30)}...`
        );
        await new Promise((resolve) => setTimeout(resolve, backoffMs));
      }
    }
  }

  throw lastError ?? new Error(`[${label}] All ${maxRetries + 1} RPC attempts failed`);
}
