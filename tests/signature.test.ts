import { describe, expect, it } from "vitest";
import { Keypair, PublicKey } from "@solana/web3.js";
import {
  decodeBase58,
  findTransactionSignature,
  isTransactionSignature,
} from "@/lib/solana/signature";
import { REAL_SIGNATURE, encodeBase58 } from "./fixtures/transactions";

describe("decodeBase58", () => {
  it("matches web3.js for known program ids", () => {
    for (const key of [
      "11111111111111111111111111111111",
      "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
      "ComputeBudget111111111111111111111111111111",
    ]) {
      expect(Array.from(decodeBase58(key)!)).toEqual(Array.from(new PublicKey(key).toBytes()));
    }
  });

  it("round-trips 64-byte values, including leading zero bytes", () => {
    for (let i = 0; i < 100; i++) {
      const bytes = Keypair.generate().secretKey;
      if (i % 20 === 0) {
        bytes[0] = 0;
        bytes[1] = 0;
      }
      expect(Array.from(decodeBase58(encodeBase58(bytes))!)).toEqual(Array.from(bytes));
    }
  });

  it("rejects characters outside the base58 alphabet", () => {
    expect(decodeBase58("0OIl")).toBeNull();
    expect(decodeBase58("")).toBeNull();
  });
});

describe("transaction signatures", () => {
  it("accepts a real devnet signature", () => {
    expect(REAL_SIGNATURE).toHaveLength(88);
    expect(decodeBase58(REAL_SIGNATURE)).toHaveLength(64);
    expect(isTransactionSignature(REAL_SIGNATURE)).toBe(true);
  });

  it("finds a signature in plain text and explorer links", () => {
    expect(findTransactionSignature(`explain this transaction: ${REAL_SIGNATURE}`)).toBe(REAL_SIGNATURE);
    expect(findTransactionSignature(`https://explorer.solana.com/tx/${REAL_SIGNATURE}?cluster=devnet`)).toBe(REAL_SIGNATURE);
    expect(findTransactionSignature(`see https://solscan.io/tx/${REAL_SIGNATURE}#overview.`)).toBe(REAL_SIGNATURE);
  });

  it("ignores wallets, plain tasks and broken signatures", () => {
    expect(findTransactionSignature("check the SOL balance of 4FonJM4jRekrbi3kzrSjEdvUuXFtQB5Rz9J6RnNczCJT")).toBeNull();
    expect(findTransactionSignature("monitor current Solana cluster TPS and slot latency")).toBeNull();
    expect(findTransactionSignature("")).toBeNull();
    expect(isTransactionSignature(REAL_SIGNATURE + "abc")).toBe(false);
    expect(isTransactionSignature("0" + REAL_SIGNATURE.slice(1))).toBe(false);
  });
});
