import { beforeEach, describe, expect, it, vi } from "vitest";
import { explainParsedTransaction } from "@/lib/agents/tx-explainer";
import { summarizeTransactionTruth } from "@/lib/grading/transaction";
import {
  compareAgainstGroundTruth,
  fetchGroundTruth,
  generateGradeWithLLM,
  type GroundTruthResult,
} from "@/lib/grading/verify";
import { REAL_SIGNATURE, feedbackTx } from "./fixtures/transactions";

// Replace RPC calls with a fake connection so the tests never touch the network.
// vi.mock is hoisted above the imports, so verify.ts loads with the fake.
const fakeConnection = vi.hoisted(() => ({
  getParsedTransaction: vi.fn(),
  getBalance: vi.fn(),
  getSlot: vi.fn(),
  getEpochInfo: vi.fn(),
}));
vi.mock("@/lib/blockchain/rpc", () => ({
  withRpcRetry: (operation: (connection: unknown, url: string) => unknown) =>
    operation(fakeConnection, "https://rpc.test"),
}));

const roundTrip = <T>(value: T): T => JSON.parse(JSON.stringify(value));

beforeEach(() => {
  delete process.env.ANTHROPIC_API_KEY;
  vi.clearAllMocks();
});

describe("fetchGroundTruth", () => {
  it("treats any task with a signature as a transaction task, whatever the other words", async () => {
    const A = feedbackTx();
    fakeConnection.getParsedTransaction.mockResolvedValue(A.tx);

    const truth = await fetchGroundTruth(`explain this solana transaction balance in slot 5: ${REAL_SIGNATURE}`);

    expect(truth.taskType).toBe("transaction_explain");
    expect(truth.target).toBe(REAL_SIGNATURE);
    expect(truth.groundTruthData).toEqual(summarizeTransactionTruth(REAL_SIGNATURE, A.tx));
    expect(fakeConnection.getParsedTransaction).toHaveBeenCalledWith(REAL_SIGNATURE, {
      maxSupportedTransactionVersion: 0,
      commitment: "confirmed",
    });
  });

  it("reports an RPC failure instead of inventing data", async () => {
    fakeConnection.getParsedTransaction.mockRejectedValue(new Error("rpc down"));
    const truth = await fetchGroundTruth(`explain ${REAL_SIGNATURE}`);
    expect(truth.groundTruthData).toBeNull();
    expect(truth.error).toContain("rpc down");
  });

  it("keeps the existing balance and telemetry routes", async () => {
    fakeConnection.getBalance.mockResolvedValue(2_500_000_000);
    const balance = await fetchGroundTruth("check the SOL balance of this wallet: 4FonJM4jRekrbi3kzrSjEdvUuXFtQB5Rz9J6RnNczCJT");
    expect(balance.taskType).toBe("wallet_balance");
    expect(balance.groundTruthData?.balance_sol).toBe(2.5);

    fakeConnection.getSlot.mockResolvedValue(1000);
    fakeConnection.getEpochInfo.mockResolvedValue({ epoch: 5, slotIndex: 10 });
    const telemetry = await fetchGroundTruth("monitor current Solana cluster TPS and slot latency");
    expect(telemetry.taskType).toBe("cluster_telemetry");
  });
});

describe("grading", () => {
  const A = feedbackTx();
  const groundTruth: GroundTruthResult = {
    taskType: "transaction_explain",
    target: REAL_SIGNATURE,
    groundTruthData: summarizeTransactionTruth(REAL_SIGNATURE, A.tx),
    fetchedAt: new Date().toISOString(),
  };
  const grade = (comparison: ReturnType<typeof compareAgainstGroundTruth>, truth = groundTruth) =>
    generateGradeWithLLM({
      task: "explain",
      agentName: "Transaction Explainer",
      executionDurationMs: 900,
      comparison,
      groundTruth: truth,
    });

  it("scores a correct explanation 100", async () => {
    const comparison = compareAgainstGroundTruth(
      roundTrip({ execution: explainParsedTransaction(REAL_SIGNATURE, A.tx) }),
      groundTruth
    );
    expect(comparison.isMatch).toBe(true);
    expect(comparison.checks).toHaveLength(8);
    const result = await grade(comparison);
    expect(result.score).toBe(100);
    expect(result.llmPowered).toBe(false);
    expect(result.summary).toMatch(/^Verified authentic\./);
  });

  it("scores a wrong explanation 30 and says what was wrong", async () => {
    const wrong = { ...explainParsedTransaction(REAL_SIGNATURE, A.tx), fee_lamports: 1 };
    const result = await grade(compareAgainstGroundTruth(roundTrip({ execution: wrong }), groundTruth));
    expect(result.score).toBe(30);
    expect(result.summary).toContain("Mismatch on fee");
  });

  it("does not blame the agent's answer when the ledger could not be read", async () => {
    const noLedger = { ...groundTruth, groundTruthData: null };
    const comparison = compareAgainstGroundTruth(
      roundTrip({ execution: explainParsedTransaction(REAL_SIGNATURE, A.tx) }),
      noLedger
    );
    const result = await grade(comparison, noLedger);
    expect(comparison.isMatch).toBe(false);
    expect(result.summary).toMatch(/could not read this transaction/);
  });

  it("scores a missing explanation 15", async () => {
    const comparison = compareAgainstGroundTruth(
      { execution: { action: "explain_transaction", status: "error", error: "x" } },
      groundTruth
    );
    const result = await grade(comparison);
    expect(result.score).toBe(15);
    expect(result.summary).toMatch(/did not return a transaction explanation/);
  });
});
