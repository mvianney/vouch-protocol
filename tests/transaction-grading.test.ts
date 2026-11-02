import { describe, expect, it } from "vitest";
import { explainParsedTransaction } from "@/lib/agents/tx-explainer";
import {
  compareTransactionExplanation,
  summarizeTransactionTruth,
} from "@/lib/grading/transaction";
import {
  COMPUTE,
  REGISTRY,
  REAL_SIGNATURE,
  failedTx,
  feedbackTx,
  tokenTx,
  transferTx,
} from "./fixtures/transactions";

const roundTrip = <T>(value: T): T => JSON.parse(JSON.stringify(value));
const failedFields = (r: ReturnType<typeof compareTransactionExplanation>) =>
  r.checks.filter((c) => !c.ok).map((c) => c.field);

describe("transaction ground truth", () => {
  it("computes the facts from the raw transaction", () => {
    const A = feedbackTx();
    const truth = summarizeTransactionTruth(REAL_SIGNATURE, A.tx);
    expect(truth.tx_status).toBe("success");
    expect(truth.fee_lamports).toBe(5200);
    expect(truth.fee_payer).toBe(A.payer);
    expect(truth.programs).toEqual([COMPUTE, REGISTRY].sort());
    expect(truth.sol_changes).toEqual({ [A.payer]: -1633840, [A.feedbackPda]: 1628640 });

    const C = tokenTx();
    expect(summarizeTransactionTruth(REAL_SIGNATURE, C.tx).token_changes).toEqual({
      [`${C.ownerAta}:${C.mint}`]: "-2500000",
      [`${C.recipientAta}:${C.mint}`]: "2500000",
    });
    expect(summarizeTransactionTruth(REAL_SIGNATURE, null).found).toBe(false);
  });
});

describe("grading an explanation against the ledger", () => {
  it("passes a correct answer for every kind of transaction", () => {
    for (const tx of [feedbackTx().tx, transferTx().tx, tokenTx().tx, failedTx().tx, null]) {
      const answer = roundTrip(explainParsedTransaction(REAL_SIGNATURE, tx));
      const result = compareTransactionExplanation(answer, summarizeTransactionTruth(REAL_SIGNATURE, tx));
      expect(result.isMatch, result.details).toBe(true);
      expect(result.reportedValue).toBe(result.groundTruthValue);
    }
  });

  it("catches a wrong fee and names it", () => {
    const A = feedbackTx();
    const answer = { ...roundTrip(explainParsedTransaction(REAL_SIGNATURE, A.tx)), fee_lamports: 10000 };
    const result = compareTransactionExplanation(answer, summarizeTransactionTruth(REAL_SIGNATURE, A.tx));
    expect(result.isMatch).toBe(false);
    expect(failedFields(result)).toEqual(["fee"]);
    expect(result.details).toContain("fee reported 10000 lamports, ledger shows 5200 lamports");
  });

  it("catches a wrong status, slot, fee payer or program list", () => {
    const A = feedbackTx();
    const truth = summarizeTransactionTruth(REAL_SIGNATURE, A.tx);
    const base = roundTrip(explainParsedTransaction(REAL_SIGNATURE, A.tx));
    expect(compareTransactionExplanation({ ...base, tx_status: "failed" }, truth).isMatch).toBe(false);
    expect(compareTransactionExplanation({ ...base, slot: base.slot! + 1 }, truth).isMatch).toBe(false);
    expect(compareTransactionExplanation({ ...base, fee_payer: A.feedbackPda }, truth).isMatch).toBe(false);
    expect(compareTransactionExplanation({ ...base, programs: base.programs!.slice(0, 1) }, truth).isMatch).toBe(false);
  });

  it("catches missing or altered balance changes", () => {
    const C = tokenTx();
    const truth = summarizeTransactionTruth(REAL_SIGNATURE, C.tx);
    const base = roundTrip(explainParsedTransaction(REAL_SIGNATURE, C.tx));
    expect(failedFields(compareTransactionExplanation({ ...base, token_changes: undefined }, truth))).toEqual([
      "token changes",
    ]);
    const altered = [{ ...base.token_changes![0], change_raw: "-2400000" }, base.token_changes![1]];
    expect(compareTransactionExplanation({ ...base, token_changes: altered }, truth).isMatch).toBe(false);
    expect(compareTransactionExplanation({ ...base, sol_changes: base.sol_changes!.slice(1) }, truth).isMatch).toBe(false);
  });

  it("accepts SOL amounts when lamports are left out", () => {
    const A = feedbackTx();
    const base = roundTrip(explainParsedTransaction(REAL_SIGNATURE, A.tx));
    const solOnly = {
      ...base,
      fee_lamports: undefined,
      sol_changes: base.sol_changes!.map((c) => ({ account: c.account, change_sol: c.change_sol })),
    };
    expect(compareTransactionExplanation(solOnly, summarizeTransactionTruth(REAL_SIGNATURE, A.tx)).isMatch).toBe(true);
  });

  it("catches a made-up transaction and a wrong 'not found'", () => {
    const A = feedbackTx();
    const found = roundTrip(explainParsedTransaction(REAL_SIGNATURE, A.tx));
    const notFound = roundTrip(explainParsedTransaction(REAL_SIGNATURE, null));
    expect(compareTransactionExplanation(found, summarizeTransactionTruth(REAL_SIGNATURE, null)).isMatch).toBe(false);
    expect(compareTransactionExplanation(notFound, summarizeTransactionTruth(REAL_SIGNATURE, A.tx)).isMatch).toBe(false);
  });

  it("never passes an agent error or an unreadable ledger", () => {
    const A = feedbackTx();
    const truth = summarizeTransactionTruth(REAL_SIGNATURE, A.tx);
    const errored = compareTransactionExplanation({ action: "explain_transaction", status: "error", error: "x" }, truth);
    expect(errored.isMatch).toBe(false);
    expect(errored.reportedValue).toBeNull();

    const noLedger = compareTransactionExplanation(roundTrip(explainParsedTransaction(REAL_SIGNATURE, A.tx)), null);
    expect(noLedger.isMatch).toBe(false);
    expect(noLedger.groundTruthValue).toBeNull();
  });
});
