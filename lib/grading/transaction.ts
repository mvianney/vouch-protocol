/**
 * lib/grading/transaction.ts
 *
 * Ground truth for "explain this transaction" tasks.
 *
 * Vouch fetches the transaction itself and checks the facts an explanation
 * has to get right: whether the transaction exists, whether it succeeded, its
 * slot, fee and fee payer, the programs it called at the top level, and every
 * SOL and token balance change.
 *
 * This file is written separately from the demo agent in
 * lib/agents/tx-explainer.ts and imports nothing from it.
 */

import type { ParsedTransactionWithMeta } from "@solana/web3.js";

const LAMPORTS_PER_SOL = 1e9;

export type TransactionTruth = {
  signature: string;
  found: boolean;
  tx_status: "success" | "failed" | null;
  slot: number | null;
  fee_lamports: number | null;
  fee_payer: string | null;
  /** Unique program ids called by top-level instructions, sorted. */
  programs: string[];
  /** Account to lamport change, non-zero changes only. */
  sol_changes: Record<string, number>;
  /** "<token account>:<mint>" to raw change in base units, non-zero only. */
  token_changes: Record<string, string>;
};

export type TransactionCheck = {
  field: string;
  ok: boolean;
  reported: string;
  truth: string;
};

export type TransactionComparison = {
  isMatch: boolean;
  checks: TransactionCheck[];
  /** One-line view of what the agent reported, or null if it reported nothing usable. */
  reportedValue: string | null;
  /** One-line view of the ledger, or null if the ledger could not be read. */
  groundTruthValue: string | null;
  details: string;
};

/** Facts read from an agent response, in the same shape as the truth. */
type ReportedTransaction = {
  found: boolean | null;
  tx_status: "success" | "failed" | null;
  slot: number | null;
  fee_lamports: number | null;
  fee_payer: string | null;
  programs: string[] | null;
  sol_changes: Record<string, number> | null;
  token_changes: Record<string, string> | null;
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function asKey(value: unknown): string | null {
  if (typeof value === "string" && value) return value;
  if (value && typeof (value as { toBase58?: unknown }).toBase58 === "function") {
    return (value as { toBase58: () => string }).toBase58();
  }
  return null;
}

function asNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function rawDifference(after: unknown, before: unknown): string {
  try {
    const a = BigInt(typeof after === "string" && after ? after : "0");
    const b = BigInt(typeof before === "string" && before ? before : "0");
    return (a - b).toString();
  } catch {
    return "0";
  }
}

function solString(lamports: number | null): string {
  if (lamports === null) return "?";
  const sign = lamports < 0 ? "-" : "";
  const abs = Math.abs(lamports);
  const whole = Math.floor(abs / LAMPORTS_PER_SOL);
  const fraction = String(abs % LAMPORTS_PER_SOL).padStart(9, "0").replace(/0+$/, "");
  return `${sign}${whole}${fraction ? `.${fraction}` : ""}`;
}

function lamportsLabel(lamports: number): string {
  return `${lamports} lamport${lamports === 1 ? "" : "s"}`;
}

function sameStringSet(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  const sortedA = [...a].sort();
  const sortedB = [...b].sort();
  return sortedA.every((value, i) => value === sortedB[i]);
}

function sameRecord<T>(a: Record<string, T>, b: Record<string, T>): boolean {
  const keysA = Object.keys(a);
  const keysB = Object.keys(b);
  if (keysA.length !== keysB.length) return false;
  return keysA.every((key) => Object.prototype.hasOwnProperty.call(b, key) && b[key] === a[key]);
}

function normalizeStatus(value: unknown): "success" | "failed" | null {
  if (typeof value === "boolean") return value ? "success" : "failed";
  if (typeof value !== "string") return null;
  const lower = value.toLowerCase();
  if (["success", "succeeded", "successful", "ok"].includes(lower)) return "success";
  if (["failed", "failure", "fail", "error"].includes(lower)) return "failed";
  return null;
}

// ─── Ground truth ────────────────────────────────────────────────────────────

/** Reduce a getParsedTransaction result to the facts Vouch checks. */
export function summarizeTransactionTruth(
  signature: string,
  tx: ParsedTransactionWithMeta | null
): TransactionTruth {
  if (!tx) {
    return {
      signature,
      found: false,
      tx_status: null,
      slot: null,
      fee_lamports: null,
      fee_payer: null,
      programs: [],
      sol_changes: {},
      token_changes: {},
    };
  }

  const meta = tx.meta;
  const accountKeys = (tx.transaction.message.accountKeys ?? []).map(
    (entry) => asKey((entry as { pubkey?: unknown }).pubkey) ?? asKey(entry) ?? ""
  );

  const programs = Array.from(
    new Set(
      (tx.transaction.message.instructions ?? [])
        .map((ix) => asKey(ix.programId))
        .filter((id): id is string => id !== null)
    )
  ).sort();

  const sol_changes: Record<string, number> = {};
  const pre = meta?.preBalances ?? [];
  const post = meta?.postBalances ?? [];
  for (let i = 0; i < accountKeys.length; i++) {
    if (typeof pre[i] !== "number" || typeof post[i] !== "number") continue;
    const delta = post[i] - pre[i];
    if (delta !== 0) sol_changes[accountKeys[i]] = delta;
  }

  const token_changes: Record<string, string> = {};
  const preTokens = meta?.preTokenBalances ?? [];
  const postTokens = meta?.postTokenBalances ?? [];
  const tokenIndexes = Array.from(
    new Set([...preTokens, ...postTokens].map((balance) => balance.accountIndex))
  );
  for (const index of tokenIndexes) {
    const before = preTokens.find((balance) => balance.accountIndex === index);
    const after = postTokens.find((balance) => balance.accountIndex === index);
    const delta = rawDifference(after?.uiTokenAmount?.amount, before?.uiTokenAmount?.amount);
    if (delta === "0") continue;
    const mint = after?.mint ?? before?.mint ?? "";
    token_changes[`${accountKeys[index] ?? `#${index}`}:${mint}`] = delta;
  }

  return {
    signature,
    found: true,
    tx_status: meta ? (meta.err ? "failed" : "success") : null,
    slot: typeof tx.slot === "number" ? tx.slot : null,
    fee_lamports: typeof meta?.fee === "number" ? meta.fee : null,
    fee_payer: accountKeys[0] || null,
    programs,
    sol_changes,
    token_changes,
  };
}

// ─── Reading the agent's answer ──────────────────────────────────────────────

function readPrograms(value: unknown): string[] | null {
  if (!Array.isArray(value)) return null;
  const ids = value
    .map((entry) => {
      if (typeof entry === "string") return entry;
      if (entry && typeof entry === "object") {
        const e = entry as Record<string, unknown>;
        return asKey(e.program_id) ?? asKey(e.programId) ?? asKey(e.id);
      }
      return null;
    })
    .filter((id): id is string => Boolean(id));
  return Array.from(new Set(ids));
}

function readSolChanges(value: unknown): Record<string, number> | null {
  if (Array.isArray(value)) {
    const out: Record<string, number> = {};
    for (const entry of value) {
      if (!entry || typeof entry !== "object") continue;
      const e = entry as Record<string, unknown>;
      const account = asKey(e.account) ?? asKey(e.address);
      const lamports =
        asNumber(e.change_lamports) ??
        (asNumber(e.change_sol) !== null ? Math.round((e.change_sol as number) * LAMPORTS_PER_SOL) : null);
      if (account && lamports !== null && lamports !== 0) out[account] = lamports;
    }
    return out;
  }
  if (value && typeof value === "object") {
    const out: Record<string, number> = {};
    for (const [account, lamports] of Object.entries(value as Record<string, unknown>)) {
      if (typeof lamports === "number" && lamports !== 0) out[account] = lamports;
    }
    return out;
  }
  return null;
}

function readTokenChanges(value: unknown): Record<string, string> | null {
  if (!Array.isArray(value)) return null;
  const out: Record<string, string> = {};
  for (const entry of value) {
    if (!entry || typeof entry !== "object") continue;
    const e = entry as Record<string, unknown>;
    const account = asKey(e.account);
    const mint = asKey(e.mint);
    const raw = e.change_raw ?? e.amount_raw;
    const rawString =
      typeof raw === "string" ? raw : typeof raw === "number" ? String(raw) : null;
    if (account && mint && rawString && rawString !== "0") out[`${account}:${mint}`] = rawString;
  }
  return out;
}

function readReported(execution: unknown): ReportedTransaction | null {
  if (!execution || typeof execution !== "object") return null;
  const e = execution as Record<string, unknown>;

  const tx_status = normalizeStatus(e.tx_status ?? e.transaction_status);
  let found: boolean | null = typeof e.found === "boolean" ? e.found : null;
  if (found === null) {
    if (e.status === "not_found") found = false;
    else if (tx_status !== null) found = true;
  }
  if (found === null) return null;

  const feeSol = asNumber(e.fee_sol);
  return {
    found,
    tx_status,
    slot: asNumber(e.slot),
    fee_lamports:
      asNumber(e.fee_lamports) ?? (feeSol !== null ? Math.round(feeSol * LAMPORTS_PER_SOL) : null),
    fee_payer: asKey(e.fee_payer) ?? asKey(e.feePayer),
    programs: readPrograms(e.programs),
    sol_changes: readSolChanges(e.sol_changes),
    token_changes: readTokenChanges(e.token_changes),
  };
}

// ─── Display ─────────────────────────────────────────────────────────────────

/** One-line view used in the console's comparison table. */
export function formatTransactionFacts(facts: {
  found: boolean | null;
  tx_status: string | null;
  slot: number | null;
  fee_lamports: number | null;
  programs: string[] | null;
  sol_changes: Record<string, number> | null;
  token_changes: Record<string, string> | null;
}): string {
  if (facts.found === false) return "not found on devnet";
  const programs = facts.programs?.length ?? 0;
  const sol = facts.sol_changes ? Object.keys(facts.sol_changes).length : 0;
  const tokens = facts.token_changes ? Object.keys(facts.token_changes).length : 0;
  return [
    facts.tx_status ?? "?",
    `slot ${facts.slot ?? "?"}`,
    `fee ${solString(facts.fee_lamports)} SOL`,
    `${programs} program${programs === 1 ? "" : "s"}`,
    `${sol} SOL / ${tokens} token change${sol + tokens === 1 ? "" : "s"}`,
  ].join(" · ");
}

// ─── Comparison ──────────────────────────────────────────────────────────────

/**
 * Check an agent's explanation against the ledger. Every check has to pass
 * for a match. Lists the agent left out count as empty, so leaving out real
 * balance changes is a mismatch.
 */
export function compareTransactionExplanation(
  execution: unknown,
  truth: TransactionTruth | null
): TransactionComparison {
  const reported = readReported(execution);
  const reportedValue = reported ? formatTransactionFacts(reported) : null;

  if (!truth) {
    return {
      isMatch: false,
      checks: [],
      reportedValue,
      groundTruthValue: null,
      details: "Independent transaction lookup could not be resolved.",
    };
  }

  const groundTruthValue = formatTransactionFacts(truth);

  if (!reported) {
    return {
      isMatch: false,
      checks: [],
      reportedValue: null,
      groundTruthValue,
      details: "Agent did not return a transaction explanation.",
    };
  }

  const checks: TransactionCheck[] = [
    {
      field: "found",
      ok: reported.found === truth.found,
      reported: reported.found ? "found" : "not found",
      truth: truth.found ? "found" : "not found",
    },
  ];

  if (truth.found && reported.found) {
    const reportedPrograms = reported.programs ?? [];
    const reportedSol = reported.sol_changes ?? {};
    const reportedTokens = reported.token_changes ?? {};
    checks.push(
      {
        field: "status",
        ok: reported.tx_status === truth.tx_status,
        reported: reported.tx_status ?? "missing",
        truth: truth.tx_status ?? "unknown",
      },
      {
        field: "slot",
        ok: reported.slot === truth.slot,
        reported: String(reported.slot ?? "missing"),
        truth: String(truth.slot ?? "unknown"),
      },
      {
        field: "fee",
        ok: reported.fee_lamports === truth.fee_lamports,
        reported: reported.fee_lamports === null ? "missing" : lamportsLabel(reported.fee_lamports),
        truth: truth.fee_lamports === null ? "unknown" : lamportsLabel(truth.fee_lamports),
      },
      {
        field: "fee payer",
        ok: reported.fee_payer === truth.fee_payer,
        reported: reported.fee_payer ?? "missing",
        truth: truth.fee_payer ?? "unknown",
      },
      {
        field: "programs",
        ok: sameStringSet(reportedPrograms, truth.programs),
        reported: `${reportedPrograms.length} programs`,
        truth: `${truth.programs.length} programs`,
      },
      {
        field: "SOL changes",
        ok: sameRecord(reportedSol, truth.sol_changes),
        reported: `${Object.keys(reportedSol).length} changes`,
        truth: `${Object.keys(truth.sol_changes).length} changes`,
      },
      {
        field: "token changes",
        ok: sameRecord(reportedTokens, truth.token_changes),
        reported: `${Object.keys(reportedTokens).length} changes`,
        truth: `${Object.keys(truth.token_changes).length} changes`,
      }
    );
  }

  const failed = checks.filter((check) => !check.ok);
  const isMatch = failed.length === 0;

  let details: string;
  if (isMatch && !truth.found) {
    details = "Agent correctly reported that this signature does not exist on Solana devnet.";
  } else if (isMatch) {
    details = `All ${checks.length} checks match the ledger: status, slot, fee, fee payer, programs, SOL and token changes.`;
  } else {
    const first = failed[0];
    details = `Mismatch on ${failed.map((check) => check.field).join(", ")}. First difference: ${first.field} reported ${first.reported}, ledger shows ${first.truth}.`;
  }

  return { isMatch, checks, reportedValue, groundTruthValue, details };
}
