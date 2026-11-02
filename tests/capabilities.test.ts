import { describe, expect, it } from "vitest";
import {
  agentHasSkill,
  routeCandidatesForTask,
  searchQueryForTask,
} from "@/lib/hiring/capabilities";
import { REAL_SIGNATURE } from "./fixtures/transactions";

const chronicle = {
  name: "Transaction Chronicle",
  skills: ["data_analytics/blockchain_analytics/transaction_history", "forensics/audit/fee_analysis"],
};
const explainer = {
  name: "Transaction Explainer",
  skills: ["data_analytics/blockchain_analytics/transaction_explainer", "cryptocurrency/solana/program_identification"],
};
const sentinel = { name: "Solana Balance Sentinel", skills: ["data_analytics/blockchain_analytics/balance_tracking"] };
const noSkills = { name: "Third party", skills: null };
const signatureTask = `explain this transaction: ${REAL_SIGNATURE}`;

describe("agentHasSkill", () => {
  it("matches the whole skill or the last path segment only", () => {
    expect(agentHasSkill(explainer, "transaction_explainer")).toBe(true);
    expect(agentHasSkill({ skills: ["transaction_explainer"] }, "transaction_explainer")).toBe(true);
    expect(agentHasSkill(chronicle, "transaction_explainer")).toBe(false);
    expect(agentHasSkill({ skills: ["x/not_transaction_explainer"] }, "transaction_explainer")).toBe(false);
    expect(agentHasSkill(noSkills, "transaction_explainer")).toBe(false);
  });
});

describe("routeCandidatesForTask", () => {
  it("sends signature tasks only to transaction explainers", () => {
    const routing = routeCandidatesForTask(signatureTask, [chronicle, explainer, sentinel, noSkills]);
    expect(routing.candidates).toEqual([explainer]);
    expect(routing.requiredSkill).toBe("transaction_explainer");
    expect(routing.emptyMessage).toBeNull();
  });

  it("refuses a signature task clearly when no explainer is registered", () => {
    for (const candidates of [[chronicle, sentinel], []]) {
      const routing = routeCandidatesForTask(signatureTask, candidates);
      expect(routing.candidates).toEqual([]);
      expect(routing.emptyMessage).toMatch(/No registered agent can explain transactions yet/);
    }
  });

  it("never sends a task without a signature to an explainer", () => {
    const routing = routeCandidatesForTask(
      "explain the transaction history of 4FonJM4jRekrbi3kzrSjEdvUuXFtQB5Rz9J6RnNczCJT",
      [explainer, chronicle, sentinel]
    );
    expect(routing.candidates).toEqual([chronicle, sentinel]);

    const onlyExplainer = routeCandidatesForTask("explain a transaction", [explainer]);
    expect(onlyExplainer.candidates).toEqual([]);
    expect(onlyExplainer.emptyMessage).toMatch(/include its signature/);

    expect(routeCandidatesForTask("nothing matches", []).emptyMessage).toBeNull();
  });
});

describe("searchQueryForTask", () => {
  it("adds the skill hint only for signature tasks", () => {
    expect(searchQueryForTask(signatureTask)).toBe(`${signatureTask} transaction explainer`);
    expect(searchQueryForTask("check the SOL balance")).toBe("check the SOL balance");
  });
});
