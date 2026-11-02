import { describe, expect, it } from "vitest";
import { explainParsedTransaction } from "@/lib/agents/tx-explainer";
import {
  ATA,
  ATOM,
  SYSTEM,
  TOKEN,
  REAL_SIGNATURE,
  failedTx,
  feedbackTx,
  tokenTx,
  transferTx,
} from "./fixtures/transactions";

const NO_EM_DASH = /—/;

describe("Transaction Explainer agent", () => {
  it("explains an Anchor program call with a CPI", () => {
    const A = feedbackTx();
    const ex = explainParsedTransaction(REAL_SIGNATURE, A.tx);

    expect(ex.found).toBe(true);
    expect(ex.tx_status).toBe("success");
    expect(ex.error).toBeNull();
    expect(ex.fee_lamports).toBe(5200);
    expect(ex.fee_payer).toBe(A.payer);
    expect(ex.signers).toEqual([A.payer]);
    expect(ex.instructions!.map((i) => i.type)).toEqual([
      "setComputeUnitLimit",
      "setComputeUnitPrice",
      "GiveFeedback",
    ]);
    expect(ex.programs!.map((p) => p.name)).toEqual(["Compute Budget Program", "8004 Agent Registry"]);
    expect(ex.cpi_programs!.map((p) => p.program_id)).toEqual([SYSTEM, ATOM]);
    expect(ex.sol_changes!.map((c) => [c.account, c.change_lamports])).toEqual([
      [A.payer, -(5200 + 1628640)],
      [A.feedbackPda, 1628640],
    ]);
    expect(ex.token_changes).toEqual([]);
    expect(ex.summary).toMatch(/^Successful transaction in slot 412345678 on 2025-10-09 08:53:20 UTC\./);
    expect(ex.summary).toMatch(/paid the 0\.0000052 SOL fee\./);
    expect(ex.summary).toMatch(/8004 Agent Registry \(GiveFeedback\)/);
    expect(ex.summary).not.toMatch(NO_EM_DASH);
  });

  it("explains a SOL transfer with a memo", () => {
    const ex = explainParsedTransaction(REAL_SIGNATURE, transferTx().tx);
    expect(ex.instructions!.map((i) => `${i.program}:${i.type}`)).toEqual([
      "System Program:transfer",
      "Memo Program:memo",
    ]);
    expect(ex.memos).toEqual(["vouch test"]);
    expect(ex.sol_changes!.map((c) => c.change_lamports)).toEqual([-250005000, 250000000]);
    expect(ex.summary).toMatch(/Memo: "vouch test"\./);
  });

  it("reports exact token changes on a v0 transaction", () => {
    const C = tokenTx();
    const ex = explainParsedTransaction(REAL_SIGNATURE, C.tx);
    expect(ex.token_changes).toEqual([
      { account: C.ownerAta, owner: C.owner, mint: C.mint, change_raw: "-2500000", change: "-2.5", decimals: 6 },
      { account: C.recipientAta, owner: C.recipient, mint: C.mint, change_raw: "2500000", change: "2.5", decimals: 6 },
    ]);
    expect(ex.programs!.map((p) => p.program_id)).toEqual([ATA, TOKEN]);
    expect(ex.block_time_iso).toBeNull();
  });

  it("explains why a transaction failed", () => {
    const D = failedTx();
    const ex = explainParsedTransaction(REAL_SIGNATURE, D.tx);
    expect(ex.tx_status).toBe("failed");
    expect(ex.error).toBe("Instruction 2 failed: custom program error 6001 (0x1771)");
    expect(ex.instructions!.map((i) => i.type)).toEqual(["setComputeUnitLimit", "Swap"]);
    expect(ex.instructions![1].program).toBe(`Program ${D.program.slice(0, 4)}...${D.program.slice(-4)}`);
  });

  it("says so honestly when the transaction does not exist", () => {
    const ex = explainParsedTransaction(REAL_SIGNATURE, null);
    expect(ex.found).toBe(false);
    expect(ex.status).toBe("not_found");
  });

  it("returns plain JSON (no BigInt or PublicKey objects)", () => {
    for (const fixture of [feedbackTx(), transferTx(), tokenTx(), failedTx()]) {
      const ex = explainParsedTransaction(REAL_SIGNATURE, fixture.tx);
      expect(JSON.parse(JSON.stringify(ex))).toEqual(ex);
    }
  });
});
