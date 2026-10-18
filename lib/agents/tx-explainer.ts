/**
 * lib/agents/tx-explainer.ts
 *
 * Transaction Explainer: a Vouch demo agent that turns a Solana transaction
 * signature into a plain-English breakdown.
 *
 * It reads the parsed transaction from RPC and reports whether it succeeded,
 * the slot and time, the fee and who paid it, the signers, every instruction
 * and program it called, and the SOL and token balance changes it caused.
 *
 * Vouch grades this agent with its own check in lib/grading/transaction.ts.
 * The grader imports nothing from this file, so a bug here shows up as a
 * failed grade instead of grading itself.
 */

import type {
  Connection,
  ParsedInstruction,
  ParsedTransactionWithMeta,
  PartiallyDecodedInstruction,
  TokenBalance,
} from "@solana/web3.js";
import { decodeBase58 } from "@/lib/solana/signature";

const LAMPORTS_PER_SOL = 1e9;
const MAX_LISTED_ITEMS = 6;

const COMPUTE_BUDGET_PROGRAM = "ComputeBudget111111111111111111111111111111";

/** Readable names for programs that show up in most devnet transactions. */
export const KNOWN_PROGRAMS: Record<string, string> = {
  "11111111111111111111111111111111": "System Program",
  TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA: "Token Program",
  TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb: "Token-2022 Program",
  ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL: "Associated Token Account Program",
  [COMPUTE_BUDGET_PROGRAM]: "Compute Budget Program",
  MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr: "Memo Program",
  Memo1UhkJRfHyvLMcVucJwxXeuD728EqVDDwQDxFMNo: "Memo Program v1",
  Vote111111111111111111111111111111111111111: "Vote Program",
  Stake11111111111111111111111111111111111111: "Stake Program",
  AddressLookupTab1e1111111111111111111111111: "Address Lookup Table Program",
  BPFLoaderUpgradeab1e11111111111111111111111: "BPF Upgradeable Loader",
  Ed25519SigVerify111111111111111111111111111: "Ed25519 Program",
  KeccakSecp256k11111111111111111111111111111: "Secp256k1 Program",
  metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s: "Metaplex Token Metadata",
  CoREENxT6tW1HoK8ypY1SxRMZTcVPm7R94rH4PZNhX7d: "Metaplex Core",
  "8oo4J9tBB3Hna1jRQ3rWvJjojqM5DYTDJo5cejUuJy3C": "8004 Agent Registry",
  "8oo4dC4JvBLwy5tGgiH3WwK4B9PWxL9Z4XjA2jzkQMbQ": "8004 Agent Registry",
  AToMufS4QD6hEXvcvBDg9m1AHeCLpmZQsyfYa5h9MwAF: "8004 ATOM Engine",
  AToMw53aiPQ8j7iHVb4fGt6nzUNxUhcPc3tbPBZuzVVb: "8004 ATOM Engine",
  "72WFGnAp9EjPok7JbadCEC1j83TZe3ti8k6ax25dQVzG": "ProofPass",
};

/** First data byte of a Compute Budget instruction. */
const COMPUTE_BUDGET_TYPES: Record<number, string> = {
  1: "requestHeapFrame",
  2: "setComputeUnitLimit",
  3: "setComputeUnitPrice",
  4: "setLoadedAccountsDataSizeLimit",
};

export type ExplainedProgram = {
  program_id: string;
  name: string;
};

export type ExplainedInstruction = {
  index: number;
  program_id: string;
  program: string;
  type: string;
};

export type SolBalanceChange = {
  account: string;
  change_lamports: number;
  change_sol: number;
};

export type TokenBalanceChange = {
  /** Token account whose balance changed. */
  account: string;
  /** Wallet that owns the token account, when the RPC reports it. */
  owner: string | null;
  mint: string;
  /** Exact change in base units, as an integer string. */
  change_raw: string;
  /** Same change with decimals applied. */
  change: string;
  decimals: number;
};

export type TransactionExplanation = {
  action: "explain_transaction";
  signature: string;
  network: "solana-devnet";
  found: boolean;
  status: "verified" | "not_found";
  tx_status?: "success" | "failed";
  error?: string | null;
  slot?: number;
  block_time?: number | null;
  block_time_iso?: string | null;
  fee_lamports?: number | null;
  fee_sol?: number | null;
  fee_payer?: string | null;
  signers?: string[];
  programs?: ExplainedProgram[];
  cpi_programs?: ExplainedProgram[];
  instructions?: ExplainedInstruction[];
  inner_instruction_count?: number;
  sol_changes?: SolBalanceChange[];
  token_changes?: TokenBalanceChange[];
  memos?: string[];
  compute_units?: number | null;
  summary: string;
};

type AnyInstruction = ParsedInstruction | PartiallyDecodedInstruction;

// ─── Formatting helpers ──────────────────────────────────────────────────────

function keyToString(key: unknown): string {
  if (typeof key === "string") return key;
  if (key && typeof (key as { toBase58?: unknown }).toBase58 === "function") {
    return (key as { toBase58: () => string }).toBase58();
  }
  return String(key);
}

function shortKey(key: string): string {
  return key.length > 12 ? `${key.slice(0, 4)}...${key.slice(-4)}` : key;
}

/** Exact lamports to SOL string, without floating point noise. */
function formatLamports(lamports: number): string {
  const sign = lamports < 0 ? "-" : "";
  const abs = Math.abs(lamports);
  const whole = Math.floor(abs / LAMPORTS_PER_SOL);
  const fraction = String(abs % LAMPORTS_PER_SOL)
    .padStart(9, "0")
    .replace(/0+$/, "");
  return `${sign}${whole}${fraction ? `.${fraction}` : ""}`;
}

function formatUnits(raw: bigint, decimals: number): string {
  const negative = raw < BigInt(0);
  const digits = (negative ? -raw : raw).toString().padStart(decimals + 1, "0");
  const whole = digits.slice(0, digits.length - decimals);
  const fraction =
    decimals > 0 ? digits.slice(digits.length - decimals).replace(/0+$/, "") : "";
  return `${negative ? "-" : ""}${whole}${fraction ? `.${fraction}` : ""}`;
}

function toBigInt(value: unknown): bigint {
  try {
    if (typeof value === "string" || typeof value === "number") {
      return BigInt(value);
    }
  } catch {
    // fall through
  }
  return BigInt(0);
}

function plural(count: number, word: string): string {
  return `${count} ${word}${count === 1 ? "" : "s"}`;
}

function listWithLimit(items: string[]): string {
  if (items.length <= MAX_LISTED_ITEMS) return items.join(", ");
  const shown = items.slice(0, MAX_LISTED_ITEMS).join(", ");
  return `${shown} and ${items.length - MAX_LISTED_ITEMS} more`;
}

export function programName(programId: string, parserLabel?: string): string {
  if (KNOWN_PROGRAMS[programId]) return KNOWN_PROGRAMS[programId];
  if (parserLabel) return parserLabel;
  return `Program ${shortKey(programId)}`;
}

/** Turns an RPC transaction error into a sentence. */
export function describeTransactionError(err: unknown): string | null {
  if (err === null || err === undefined) return null;
  if (typeof err === "string") return err;

  const instructionError = (err as { InstructionError?: unknown })
    .InstructionError;
  if (Array.isArray(instructionError) && instructionError.length === 2) {
    const [index, detail] = instructionError;
    let reason: string;
    if (typeof detail === "string") {
      reason = detail;
    } else if (
      detail &&
      typeof detail === "object" &&
      typeof (detail as { Custom?: unknown }).Custom === "number"
    ) {
      const code = (detail as { Custom: number }).Custom;
      reason = `custom program error ${code} (0x${code.toString(16)})`;
    } else {
      reason = JSON.stringify(detail);
    }
    return `Instruction ${Number(index) + 1} failed: ${reason}`;
  }

  return JSON.stringify(err);
}

// ─── Log parsing ─────────────────────────────────────────────────────────────

type TopLevelInvocation = { programId: string; name: string | null };

/**
 * Top-level program calls in log order, each with the instruction name the
 * program logged ("Program log: Instruction: GiveFeedback" in Anchor
 * programs). This is how unparsed instructions still get a readable name.
 */
function topLevelInvocations(
  logs: string[] | null | undefined
): TopLevelInvocation[] {
  const invocations: TopLevelInvocation[] = [];
  let depth = 0;

  for (const line of logs ?? []) {
    const invoke = /^Program (\S+) invoke \[(\d+)\]$/.exec(line);
    if (invoke) {
      depth = Number(invoke[2]);
      if (depth === 1) invocations.push({ programId: invoke[1], name: null });
      continue;
    }
    if (/^Program \S+ (success|failed)/.test(line)) {
      depth = Math.max(0, depth - 1);
      continue;
    }
    const named = /^Program log: Instruction: (.+)$/.exec(line);
    const current = invocations[invocations.length - 1];
    if (named && depth === 1 && current && current.name === null) {
      current.name = named[1].trim();
    }
  }

  return invocations;
}

function instructionType(
  instruction: AnyInstruction,
  programId: string,
  loggedName: string | null
): string {
  if ("parsed" in instruction) {
    const parsed = instruction.parsed;
    if (typeof parsed === "string") return "memo";
    if (parsed && typeof parsed.type === "string") return parsed.type;
  }
  if (programId === COMPUTE_BUDGET_PROGRAM && "data" in instruction) {
    const bytes = decodeBase58(instruction.data);
    const label = bytes && bytes.length > 0 ? COMPUTE_BUDGET_TYPES[bytes[0]] : null;
    if (label) return label;
  }
  if (loggedName) return loggedName;
  return "unknown";
}

// ─── Balance changes ─────────────────────────────────────────────────────────

function solChanges(
  accounts: string[],
  pre: number[],
  post: number[]
): SolBalanceChange[] {
  const changes: SolBalanceChange[] = [];
  accounts.forEach((account, i) => {
    if (typeof pre[i] !== "number" || typeof post[i] !== "number") return;
    const delta = post[i] - pre[i];
    if (delta !== 0) {
      changes.push({
        account,
        change_lamports: delta,
        change_sol: delta / LAMPORTS_PER_SOL,
      });
    }
  });
  return changes;
}

function tokenChanges(
  accounts: string[],
  pre: TokenBalance[],
  post: TokenBalance[]
): TokenBalanceChange[] {
  const byIndex: Record<number, { before?: TokenBalance; after?: TokenBalance }> = {};
  for (const balance of pre) {
    byIndex[balance.accountIndex] = { ...byIndex[balance.accountIndex], before: balance };
  }
  for (const balance of post) {
    byIndex[balance.accountIndex] = { ...byIndex[balance.accountIndex], after: balance };
  }

  const changes: TokenBalanceChange[] = [];
  Object.keys(byIndex)
    .map(Number)
    .sort((a, b) => a - b)
    .forEach((index) => {
      const { before, after } = byIndex[index];
      const delta =
        toBigInt(after?.uiTokenAmount?.amount ?? "0") -
        toBigInt(before?.uiTokenAmount?.amount ?? "0");
      if (delta === BigInt(0)) return;

      const decimals =
        after?.uiTokenAmount?.decimals ?? before?.uiTokenAmount?.decimals ?? 0;
      changes.push({
        account: accounts[index] ?? `account #${index}`,
        owner: after?.owner ?? before?.owner ?? null,
        mint: after?.mint ?? before?.mint ?? "",
        change_raw: delta.toString(),
        change: formatUnits(delta, decimals),
        decimals,
      });
    });
  return changes;
}

// ─── Explanation ─────────────────────────────────────────────────────────────

function buildSummary(details: {
  txStatus: "success" | "failed";
  error: string | null;
  slot: number;
  blockTimeIso: string | null;
  feeLamports: number | null;
  feePayer: string | null;
  signers: string[];
  instructions: ExplainedInstruction[];
  sol: SolBalanceChange[];
  tokens: TokenBalanceChange[];
  memos: string[];
}): string {
  const parts: string[] = [];
  const when = details.blockTimeIso
    ? ` on ${details.blockTimeIso.replace("T", " ").replace(/\.\d+Z$|Z$/, " UTC")}`
    : "";

  parts.push(
    details.txStatus === "success"
      ? `Successful transaction in slot ${details.slot}${when}.`
      : `Failed transaction in slot ${details.slot}${when}. ${details.error ?? "The runtime rejected it"}.`
  );

  if (details.feePayer && details.feeLamports !== null) {
    const otherSigners = details.signers.filter((s) => s !== details.feePayer);
    parts.push(
      `${shortKey(details.feePayer)} paid the ${formatLamports(details.feeLamports)} SOL fee` +
        (otherSigners.length
          ? `, with ${plural(otherSigners.length, "more signer")}.`
          : ".")
    );
  }

  if (details.instructions.length) {
    const steps = details.instructions.map((ix) =>
      ix.type === "unknown" ? ix.program : `${ix.program} (${ix.type})`
    );
    parts.push(
      `It ran ${plural(details.instructions.length, "instruction")}: ${listWithLimit(steps)}.`
    );
  }

  if (details.sol.length) {
    const moves = details.sol.map(
      (c) =>
        `${shortKey(c.account)} ${c.change_lamports > 0 ? "+" : ""}${formatLamports(c.change_lamports)}`
    );
    parts.push(`SOL changes: ${listWithLimit(moves)}.`);
  }

  if (details.tokens.length) {
    const moves = details.tokens.map(
      (c) =>
        `${shortKey(c.owner ?? c.account)} ${c.change.startsWith("-") ? "" : "+"}${c.change} of mint ${shortKey(c.mint)}`
    );
    parts.push(`Token changes: ${listWithLimit(moves)}.`);
  } else {
    parts.push("No token balances changed.");
  }

  if (details.memos.length) {
    parts.push(`Memo: "${details.memos.join(" | ")}".`);
  }

  return parts.join(" ");
}

/**
 * Explain a transaction already fetched with getParsedTransaction. Pass null
 * when the RPC found nothing for the signature.
 */
export function explainParsedTransaction(
  signature: string,
  tx: ParsedTransactionWithMeta | null
): TransactionExplanation {
  if (!tx) {
    return {
      action: "explain_transaction",
      signature,
      network: "solana-devnet",
      found: false,
      status: "not_found",
      summary:
        "No transaction with this signature was found on Solana devnet. It may belong to another cluster or may not be confirmed yet.",
    };
  }

  const meta = tx.meta;
  const message = tx.transaction.message;
  const accountEntries = message.accountKeys ?? [];
  const accounts = accountEntries.map((entry) =>
    keyToString((entry as { pubkey?: unknown }).pubkey ?? entry)
  );
  const signers = accountEntries
    .map((entry, i) => ((entry as { signer?: boolean }).signer ? accounts[i] : null))
    .filter((key): key is string => key !== null);

  const txStatus: "success" | "failed" = meta?.err ? "failed" : "success";
  const error = describeTransactionError(meta?.err);
  const feeLamports = typeof meta?.fee === "number" ? meta.fee : null;
  const feePayer = accounts[0] ?? null;
  const blockTime = typeof tx.blockTime === "number" ? tx.blockTime : null;
  const blockTimeIso = blockTime !== null ? new Date(blockTime * 1000).toISOString() : null;

  // Top-level instructions, named from the RPC parser, the Compute Budget
  // data byte, or the program's own log line, in that order.
  const invocations = topLevelInvocations(meta?.logMessages);
  let cursor = 0;
  const memos: string[] = [];
  const instructions: ExplainedInstruction[] = (message.instructions ?? []).map(
    (instruction, index) => {
      const programId = keyToString(instruction.programId);
      let loggedName: string | null = null;
      // Precompiles do not log, so only advance when the program matches.
      if (cursor < invocations.length && invocations[cursor].programId === programId) {
        loggedName = invocations[cursor].name;
        cursor++;
      }
      if ("parsed" in instruction && typeof instruction.parsed === "string") {
        memos.push(instruction.parsed);
      }
      const parserLabel = "program" in instruction ? instruction.program : undefined;
      return {
        index,
        program_id: programId,
        program: programName(programId, parserLabel),
        type: instructionType(instruction, programId, loggedName),
      };
    }
  );

  const programs: ExplainedProgram[] = [];
  for (const ix of instructions) {
    if (!programs.some((p) => p.program_id === ix.program_id)) {
      programs.push({ program_id: ix.program_id, name: ix.program });
    }
  }

  const innerInstructions: AnyInstruction[] = (meta?.innerInstructions ?? []).flatMap(
    (group) => group.instructions
  );
  const cpiPrograms: ExplainedProgram[] = [];
  for (const inner of innerInstructions) {
    const programId = keyToString(inner.programId);
    const known =
      programs.some((p) => p.program_id === programId) ||
      cpiPrograms.some((p) => p.program_id === programId);
    if (!known) {
      const parserLabel = "program" in inner ? inner.program : undefined;
      cpiPrograms.push({ program_id: programId, name: programName(programId, parserLabel) });
    }
  }

  const sol = solChanges(accounts, meta?.preBalances ?? [], meta?.postBalances ?? []);
  const tokens = tokenChanges(
    accounts,
    meta?.preTokenBalances ?? [],
    meta?.postTokenBalances ?? []
  );

  return {
    action: "explain_transaction",
    signature,
    network: "solana-devnet",
    found: true,
    status: "verified",
    tx_status: txStatus,
    error,
    slot: tx.slot,
    block_time: blockTime,
    block_time_iso: blockTimeIso,
    fee_lamports: feeLamports,
    fee_sol: feeLamports !== null ? feeLamports / LAMPORTS_PER_SOL : null,
    fee_payer: feePayer,
    signers,
    programs,
    cpi_programs: cpiPrograms,
    instructions,
    inner_instruction_count: innerInstructions.length,
    sol_changes: sol,
    token_changes: tokens,
    memos,
    compute_units:
      typeof meta?.computeUnitsConsumed === "number" ? meta.computeUnitsConsumed : null,
    summary: buildSummary({
      txStatus,
      error,
      slot: tx.slot,
      blockTimeIso,
      feeLamports,
      feePayer,
      signers,
      instructions,
      sol,
      tokens,
      memos,
    }),
  };
}

/** Fetch a transaction by signature and explain it. */
export async function explainTransaction(
  connection: Connection,
  signature: string
): Promise<TransactionExplanation> {
  const tx = await connection.getParsedTransaction(signature, {
    maxSupportedTransactionVersion: 0,
    commitment: "confirmed",
  });
  return explainParsedTransaction(signature, tx);
}
