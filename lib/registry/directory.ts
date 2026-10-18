/**
 * lib/registry/directory.ts
 *
 * Helpers for the public agent directory (/agents).
 *
 * Trust scores synced from the 8004 indexer come from its ATOM quality_score
 * (see sync.ts). Until the indexer calibrates an agent, that score stays at 0
 * or lands far above 100. The directory only shows scores above 0 and up to
 * 100, and lists every other agent last as "Unverified".
 */

export const MIN_TRUST_SCORE = 0;
export const MAX_TRUST_SCORE = 100;

/**
 * True when a cached trust score is calibrated: a finite number above 0 and
 * at most 100. Zero, negative, missing and above-100 values all mean the
 * indexer has no calibrated score for the agent yet.
 */
export function isUsableTrustScore(
  score: number | string | null | undefined
): boolean {
  if (score === null || score === undefined || score === "") return false;
  const value = Number(score);
  return (
    Number.isFinite(value) &&
    value > MIN_TRUST_SCORE &&
    value <= MAX_TRUST_SCORE
  );
}

export interface GroupSlice {
  /** Index of the group in the counts list. */
  group: number;
  /** First row to fetch inside that group (inclusive). */
  from: number;
  /** Last row to fetch inside that group (inclusive). */
  to: number;
}

/**
 * The directory lists several groups of agents one after another (for
 * example usable scores first, then the rest). Given how many rows each group
 * has, split the global inclusive row range [from, to] into the per-group
 * ranges that need to be fetched for one page.
 */
export function planGroupSlices(
  counts: number[],
  from: number,
  to: number
): GroupSlice[] {
  const slices: GroupSlice[] = [];
  let offset = 0;

  counts.forEach((rawCount, group) => {
    const count = Math.max(0, rawCount);
    const groupStart = offset;
    const groupEnd = offset + count - 1;
    offset += count;

    if (count === 0) return;

    const start = Math.max(from, groupStart);
    const end = Math.min(to, groupEnd);
    if (start <= end) {
      slices.push({ group, from: start - groupStart, to: end - groupStart });
    }
  });

  return slices;
}
