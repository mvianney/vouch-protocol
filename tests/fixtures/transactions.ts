/**
 * Hand-built getParsedTransaction results for tests. They follow the shape
 * @solana/web3.js returns (PublicKey objects for keys, base58 instruction
 * data), so no test needs a network connection.
 */

import { Keypair, PublicKey, type ParsedTransactionWithMeta } from "@solana/web3.js";

/** A real devnet Vouch feedback transaction signature. */
export const REAL_SIGNATURE =
  "4TPdpCEZHGFR6fEqjPgSGBVGsujvLdh6hoL17mrpsVbSWREh3naGT6BHYDPKck8da41BwheMMhVPMX535AHqficc";

export const SYSTEM = "11111111111111111111111111111111";
export const COMPUTE = "ComputeBudget111111111111111111111111111111";
export const REGISTRY = "8oo4J9tBB3Hna1jRQ3rWvJjojqM5DYTDJo5cejUuJy3C";
export const ATOM = "AToMufS4QD6hEXvcvBDg9m1AHeCLpmZQsyfYa5h9MwAF";
export const MEMO = "MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr";
export const TOKEN = "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA";
export const ATA = "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL";

const ALPHABET = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";

/** Minimal base58 encoder for building fixtures. */
export function encodeBase58(bytes: Uint8Array | number[]): string {
  const data = Array.from(bytes);
  let num = BigInt(0);
  for (const b of data) num = num * BigInt(256) + BigInt(b);
  let out = "";
  while (num > BigInt(0)) {
    out = ALPHABET[Number(num % BigInt(58))] + out;
    num = num / BigInt(58);
  }
  for (let i = 0; i < data.length && data[i] === 0; i++) out = "1" + out;
  return out;
}

/** Deterministic test key, so failures are reproducible. */
let seedCounter = 1;
export function testKey(): PublicKey {
  const seed = new Uint8Array(32).fill(seedCounter++ % 256);
  return Keypair.fromSeed(seed).publicKey;
}

const pk = (s: string) => new PublicKey(s);
const acct = (pubkey: PublicKey, signer = false, writable = false, source = "transaction") => ({
  pubkey,
  signer,
  writable,
  source,
});
const u32le = (n: number) => [n & 255, (n >> 8) & 255, (n >> 16) & 255, (n >>> 24) & 255];
const asTx = (value: unknown) => value as ParsedTransactionWithMeta;

/** Anchor program call with a CPI and a new account (like a Vouch feedback tx). */
export function feedbackTx() {
  const payer = testKey();
  const feedbackPda = testKey();
  const atomStats = testKey();
  const asset = testKey();
  const config = testKey();
  const rent = 1_628_640;
  const fee = 5_200;
  return {
    payer: payer.toBase58(),
    feedbackPda: feedbackPda.toBase58(),
    tx: asTx({
      slot: 412_345_678,
      blockTime: 1_760_000_000,
      version: "legacy",
      transaction: {
        signatures: [REAL_SIGNATURE],
        message: {
          accountKeys: [
            acct(payer, true, true),
            acct(feedbackPda, false, true),
            acct(atomStats, false, true),
            acct(asset),
            acct(config),
            acct(pk(SYSTEM)),
            acct(pk(COMPUTE)),
            acct(pk(REGISTRY)),
            acct(pk(ATOM)),
          ],
          recentBlockhash: testKey().toBase58(),
          instructions: [
            { programId: pk(COMPUTE), accounts: [], data: encodeBase58([2, ...u32le(200_000)]) },
            { programId: pk(COMPUTE), accounts: [], data: encodeBase58([3, 232, 3, 0, 0, 0, 0, 0, 0]) },
            {
              programId: pk(REGISTRY),
              accounts: [payer, feedbackPda, atomStats, asset, config, pk(SYSTEM), pk(ATOM)],
              data: encodeBase58([145, 136, 123, 3, 215, 165, 98, 41, 88, 1, 2, 3]),
            },
          ],
        },
      },
      meta: {
        err: null,
        fee,
        preBalances: [2_000_000_000, 0, 1_500_000, 1_461_600, 2_000_000, 1, 1, 1_141_440, 1_141_440],
        postBalances: [2_000_000_000 - fee - rent, rent, 1_500_000, 1_461_600, 2_000_000, 1, 1, 1_141_440, 1_141_440],
        preTokenBalances: [],
        postTokenBalances: [],
        innerInstructions: [
          {
            index: 2,
            instructions: [
              {
                program: "system",
                programId: pk(SYSTEM),
                parsed: { type: "createAccount", info: { lamports: rent, space: 106, owner: REGISTRY } },
              },
              { programId: pk(ATOM), accounts: [atomStats, asset], data: encodeBase58([9, 9, 9, 9, 9, 9, 9, 9]) },
            ],
          },
        ],
        logMessages: [
          `Program ${COMPUTE} invoke [1]`,
          `Program ${COMPUTE} success`,
          `Program ${COMPUTE} invoke [1]`,
          `Program ${COMPUTE} success`,
          `Program ${REGISTRY} invoke [1]`,
          "Program log: Instruction: GiveFeedback",
          `Program ${SYSTEM} invoke [2]`,
          `Program ${SYSTEM} success`,
          `Program ${ATOM} invoke [2]`,
          "Program log: Instruction: UpdateStats",
          `Program ${ATOM} consumed 12000 of 180000 compute units`,
          `Program ${ATOM} success`,
          `Program ${REGISTRY} consumed 45000 of 200000 compute units`,
          `Program ${REGISTRY} success`,
        ],
        computeUnitsConsumed: 57_450,
      },
    }),
  };
}

/** SOL transfer with a memo. */
export function transferTx() {
  const from = testKey();
  const to = testKey();
  return {
    from: from.toBase58(),
    to: to.toBase58(),
    tx: asTx({
      slot: 412_000_001,
      blockTime: 1_760_000_123,
      version: "legacy",
      transaction: {
        signatures: [REAL_SIGNATURE],
        message: {
          accountKeys: [acct(from, true, true), acct(to, false, true), acct(pk(SYSTEM)), acct(pk(MEMO))],
          recentBlockhash: testKey().toBase58(),
          instructions: [
            {
              program: "system",
              programId: pk(SYSTEM),
              parsed: { type: "transfer", info: { source: from.toBase58(), destination: to.toBase58(), lamports: 250_000_000 } },
            },
            { program: "spl-memo", programId: pk(MEMO), parsed: "vouch test" },
          ],
        },
      },
      meta: {
        err: null,
        fee: 5_000,
        preBalances: [5_000_000_000, 1_000_000_000, 1, 521_498_880],
        postBalances: [5_000_000_000 - 250_000_000 - 5_000, 1_250_000_000, 1, 521_498_880],
        preTokenBalances: [],
        postTokenBalances: [],
        innerInstructions: [],
        logMessages: [
          `Program ${SYSTEM} invoke [1]`,
          `Program ${SYSTEM} success`,
          `Program ${MEMO} invoke [1]`,
          'Program log: Memo (len 10): "vouch test"',
          `Program ${MEMO} success`,
        ],
        computeUnitsConsumed: 7_150,
      },
    }),
  };
}

/** v0 token transfer that also creates the recipient's token account. */
export function tokenTx() {
  const owner = testKey();
  const ownerAta = testKey();
  const recipientAta = testKey();
  const recipient = testKey();
  const mint = testKey();
  const rent = 2_039_280;
  const balance = (accountIndex: number, who: PublicKey, amount: string) => ({
    accountIndex,
    mint: mint.toBase58(),
    owner: who.toBase58(),
    programId: TOKEN,
    uiTokenAmount: { amount, decimals: 6, uiAmount: Number(amount) / 1e6, uiAmountString: String(Number(amount) / 1e6) },
  });
  return {
    owner: owner.toBase58(),
    ownerAta: ownerAta.toBase58(),
    recipientAta: recipientAta.toBase58(),
    recipient: recipient.toBase58(),
    mint: mint.toBase58(),
    tx: asTx({
      slot: 412_111_222,
      blockTime: null,
      version: 0,
      transaction: {
        signatures: [REAL_SIGNATURE],
        message: {
          accountKeys: [
            acct(owner, true, true),
            acct(ownerAta, false, true),
            acct(recipientAta, false, true),
            acct(recipient),
            acct(mint),
            acct(pk(TOKEN)),
            acct(pk(ATA)),
            acct(pk(SYSTEM), false, false, "lookupTable"),
          ],
          recentBlockhash: testKey().toBase58(),
          addressTableLookups: [{ accountKey: testKey(), writableIndexes: [], readonlyIndexes: [0] }],
          instructions: [
            {
              program: "spl-associated-token-account",
              programId: pk(ATA),
              parsed: { type: "createIdempotent", info: {} },
            },
            {
              program: "spl-token",
              programId: pk(TOKEN),
              parsed: { type: "transferChecked", info: {} },
            },
          ],
        },
      },
      meta: {
        err: null,
        fee: 5_000,
        preBalances: [3_000_000_000, 2_039_280, 0, 0, 1_461_600, 934_087_680, 731_913_600, 1],
        postBalances: [3_000_000_000 - 5_000 - rent, 2_039_280, rent, 0, 1_461_600, 934_087_680, 731_913_600, 1],
        preTokenBalances: [balance(1, owner, "10000000")],
        postTokenBalances: [balance(1, owner, "7500000"), balance(2, recipient, "2500000")],
        innerInstructions: [
          {
            index: 0,
            instructions: [
              { program: "spl-token", programId: pk(TOKEN), parsed: { type: "getAccountDataSize", info: {} } },
              { program: "system", programId: pk(SYSTEM), parsed: { type: "createAccount", info: {} } },
              { program: "spl-token", programId: pk(TOKEN), parsed: { type: "initializeAccount3", info: {} } },
            ],
          },
        ],
        logMessages: [
          `Program ${ATA} invoke [1]`,
          `Program ${TOKEN} invoke [2]`,
          `Program ${TOKEN} success`,
          `Program ${ATA} success`,
          `Program ${TOKEN} invoke [1]`,
          "Program log: Instruction: TransferChecked",
          `Program ${TOKEN} success`,
        ],
        computeUnitsConsumed: 30_000,
      },
    }),
  };
}

/** Failed transaction: custom program error in instruction 2. */
export function failedTx() {
  const payer = testKey();
  const program = testKey();
  const data = testKey();
  return {
    payer: payer.toBase58(),
    program: program.toBase58(),
    tx: asTx({
      slot: 412_999_000,
      blockTime: 1_760_100_000,
      version: "legacy",
      transaction: {
        signatures: [REAL_SIGNATURE],
        message: {
          accountKeys: [acct(payer, true, true), acct(data, false, true), acct(pk(COMPUTE)), acct(program)],
          recentBlockhash: testKey().toBase58(),
          instructions: [
            { programId: pk(COMPUTE), accounts: [], data: encodeBase58([2, ...u32le(300_000)]) },
            { programId: program, accounts: [payer, data], data: encodeBase58([1, 2, 3, 4, 5, 6, 7, 8]) },
          ],
        },
      },
      meta: {
        err: { InstructionError: [1, { Custom: 6001 }] },
        fee: 5_000,
        preBalances: [1_000_000_000, 0, 1, 1_141_440],
        postBalances: [999_995_000, 0, 1, 1_141_440],
        preTokenBalances: [],
        postTokenBalances: [],
        innerInstructions: [],
        logMessages: [
          `Program ${COMPUTE} invoke [1]`,
          `Program ${COMPUTE} success`,
          `Program ${program.toBase58()} invoke [1]`,
          "Program log: Instruction: Swap",
          `Program ${program.toBase58()} failed: custom program error: 0x1771`,
        ],
        computeUnitsConsumed: 9_150,
      },
    }),
  };
}
