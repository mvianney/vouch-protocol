/**
 * Agent Registry interactions via the 8004-solana SDK.
 *
 * This module wraps the on-chain agent registry for Vouch's AI concierge.
 * Extend this file as you add agent discovery, hiring, and result handling.
 */

// TODO: Import specific exports from 8004-solana once the registry
// interaction pattern is confirmed. Placeholder import below.
// import { AgentRegistry } from "8004-solana";

export type AgentRecord = {
  pubkey: string;
  name: string;
  description: string;
  endpoint: string;
  capabilities: string[];
};

/**
 * Fetch all registered agents from the on-chain registry.
 * Stub — implement with 8004-solana SDK calls.
 */
export async function fetchRegisteredAgents(): Promise<AgentRecord[]> {
  // TODO: replace with real registry query
  return [];
}

/**
 * Hire (invoke) a registered agent by its public key.
 * Stub — implement with 8004-solana SDK calls.
 */
export async function hireAgent(
  agentPubkey: string,
  _payload: Record<string, unknown>
): Promise<{ txSignature: string }> {
  // TODO: build and send the on-chain transaction
  console.log(`[registry] Hiring agent: ${agentPubkey}`);
  return { txSignature: "" };
}
