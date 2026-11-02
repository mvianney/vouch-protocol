import { describe, expect, it } from "vitest";
import { isUsableTrustScore, planGroupSlices } from "@/lib/registry/directory";

describe("isUsableTrustScore", () => {
  it("accepts calibrated scores above 0 and up to 100", () => {
    expect(isUsableTrustScore(0.01)).toBe(true);
    expect(isUsableTrustScore(97.5)).toBe(true);
    expect(isUsableTrustScore(100)).toBe(true);
    expect(isUsableTrustScore("42.1")).toBe(true);
  });

  it("treats 0, negatives, values above 100 and missing scores as unverified", () => {
    for (const value of [0, -3, 100.01, 1279, NaN, Infinity, null, undefined, "", "abc"]) {
      expect(isUsableTrustScore(value as number | string | null | undefined)).toBe(false);
    }
  });
});

describe("planGroupSlices", () => {
  it("splits one page across groups", () => {
    expect(planGroupSlices([5, 10], 3, 7)).toEqual([
      { group: 0, from: 3, to: 4 },
      { group: 1, from: 0, to: 2 },
    ]);
  });

  it("skips empty groups and ranges past the end", () => {
    expect(planGroupSlices([0, 4, 0, 2], 0, 9)).toEqual([
      { group: 1, from: 0, to: 3 },
      { group: 3, from: 0, to: 1 },
    ]);
    expect(planGroupSlices([3], 10, 19)).toEqual([]);
  });

  it("covers every row exactly once across all pages", () => {
    const counts = [5, 2503, 41, 0];
    const total = counts.reduce((a, b) => a + b, 0);
    const pageSize = 24;
    const seen = counts.map((count) => new Array(count).fill(0));
    for (let from = 0; from < total; from += pageSize) {
      const to = Math.min(from + pageSize, total) - 1;
      let rows = 0;
      for (const slice of planGroupSlices(counts, from, to)) {
        for (let i = slice.from; i <= slice.to; i++) seen[slice.group][i]++;
        rows += slice.to - slice.from + 1;
      }
      expect(rows).toBe(to - from + 1);
    }
    expect(seen.flat().every((n) => n === 1)).toBe(true);
  });
});
