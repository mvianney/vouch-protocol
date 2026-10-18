/**
 * lib/registry/directory.ts
 *
 * Helpers for the public agent directory (/agents).
 *
 * Trust scores synced from the 8004 indexer come from its ATOM quality_score,
 * which can land outside 0 to 100 before calibration (see sync.ts). The
 * directory only shows scores inside that range and lists the rest last.
 */

export const MIN_TRUST_SCORE = 0;
export const MAX_TRUST_SCORE = 100;

/** True when a cached trust score is a finite number between 0 and 100. */
export function isUsableTrustScore(
  score: number | string | null | undefined
): boolean {
  if (score === null || score === undefined || score === "") return false;
  const value = Number(score);
  return (
    Number.isFinite(value) &&
    value >= MIN_TRUST_SCORE &&
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
