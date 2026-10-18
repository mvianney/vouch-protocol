/**
 * lib/hiring/capabilities.ts
 *
 * Routing rules that keep a task away from agents that cannot do it.
 *
 * Search ranks agents by keyword relevance and trust. Without these rules, a
 * task that pastes a transaction signature could land on any agent with
 * "transaction" in its name, and grading that agent against the real
 * transaction would post unfair negative feedback on-chain. The rules run
 * after search and before any agent is signed, dispatched or graded.
 */

import { findTransactionSignature } from "@/lib/solana/signature";

/** Skill an agent lists (as the last segment of a skill path) to explain transactions. */
export const TRANSACTION_EXPLAINER_SKILL = "transaction_explainer";

/** Words added to the search query so agents with the skill always surface. */
const TRANSACTION_EXPLAINER_SEARCH_HINT = "transaction explainer";

export interface CandidateRouting<T> {
  /** Candidates allowed to take the task, in search order. */
  candidates: T[];
  /** Skill the task requires, if any. */
  requiredSkill: string | null;
  /** Message for the user when no candidate is left, or null. */
  emptyMessage: string | null;
}

/**
 * True when the agent lists the skill, either as the whole entry or as the
 * last segment of a path such as
 * "data_analytics/blockchain_analytics/transaction_explainer".
 */
export function agentHasSkill(
  agent: { skills?: string[] | null },
  skill: string
): boolean {
  const wanted = skill.toLowerCase();
  return (agent.skills ?? []).some((entry) => {
    const value = String(entry).trim().toLowerCase();
    return value === wanted || value.endsWith(`/${wanted}`);
  });
}

/** Search query for a task: the task itself plus hints for any required skill. */
export function searchQueryForTask(task: string): string {
  return findTransactionSignature(task)
    ? `${task} ${TRANSACTION_EXPLAINER_SEARCH_HINT}`
    : task;
}

/**
 * Filter ranked candidates down to the agents that can do the task.
 *
 * A task with a transaction signature only goes to agents with the
 * transaction_explainer skill. Those agents need a signature to work, so a
 * task without one never goes to them.
 */
export function routeCandidatesForTask<T extends { skills?: string[] | null }>(
  task: string,
  candidates: T[]
): CandidateRouting<T> {
  if (findTransactionSignature(task)) {
    const eligible = candidates.filter((agent) =>
      agentHasSkill(agent, TRANSACTION_EXPLAINER_SKILL)
    );
    return {
      candidates: eligible,
      requiredSkill: TRANSACTION_EXPLAINER_SKILL,
      emptyMessage: eligible.length
        ? null
        : "No registered agent can explain transactions yet, so Vouch did not hire anyone for this task.",
    };
  }

  const eligible = candidates.filter(
    (agent) => !agentHasSkill(agent, TRANSACTION_EXPLAINER_SKILL)
  );
  return {
    candidates: eligible,
    requiredSkill: null,
    emptyMessage:
      eligible.length || candidates.length === 0
        ? null
        : "To explain a transaction, include its signature in the task.",
  };
}
