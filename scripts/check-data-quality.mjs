/**
 * Data quality check for the Supabase agents table.
 *
 * Run with:
 *   node scripts/check-data-quality.mjs
 *
 * Requires NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY
 * (or SUPABASE_SERVICE_ROLE_KEY) in the environment.
 * Loads from .env.local automatically via --env-file flag or dotenv.
 *
 * Usage:
 *   node --env-file=.env.local scripts/check-data-quality.mjs
 */

import { createClient } from "@supabase/supabase-js";

// ── Load env ──────────────────────────────────────────────────────────────────
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key =
  process.env.SUPABASE_SERVICE_ROLE_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !key) {
  console.error(
    "\n[check-data-quality] Missing Supabase credentials.\n" +
    "Run with:  node --env-file=.env.local scripts/check-data-quality.mjs\n"
  );
  process.exit(1);
}

const db = createClient(url, key, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// ── Queries ───────────────────────────────────────────────────────────────────

async function count(filter) {
  let q = db.from("agents").select("*", { count: "exact", head: true });
  if (filter) q = filter(q);
  const { count: c, error } = await q;
  if (error) throw new Error(`Query failed: ${error.message}`);
  return c ?? 0;
}

// ── Run ───────────────────────────────────────────────────────────────────────

console.log("\n[check-data-quality] Querying Supabase agents table...\n");

const [
  total,
  withDescription,
  withSkills,
  withBoth,
  withEndpoint,
  withFeedback,
  withTrustScore,
] = await Promise.all([
  // 1. Total rows
  count(),

  // 2. Non-null, non-empty description
  count((q) => q.not("description", "is", null).neq("description", "")),

  // 3. Non-empty skills array (array length > 0 via Postgres filter)
  // Supabase REST doesn't expose array_length directly, so we use
  // .not('skills', 'eq', '{}') to exclude empty arrays
  count((q) => q.not("skills", "eq", "{}")),

  // 4. Both description AND skills populated
  count((q) =>
    q
      .not("description", "is", null)
      .neq("description", "")
      .not("skills", "eq", "{}")
  ),

  // Bonus: service_endpoint populated
  count((q) => q.not("service_endpoint", "is", null)),

  // Bonus: has at least 1 feedback
  count((q) => q.gt("feedback_count", 0)),

  // Bonus: has non-zero trust_score
  count((q) => q.gt("trust_score", 0)),
]);

// ── Report ────────────────────────────────────────────────────────────────────

const pct = (n) =>
  total > 0 ? `${((n / total) * 100).toFixed(1)}%` : "n/a";

const bar = (n, width = 30) => {
  const filled = total > 0 ? Math.round((n / total) * width) : 0;
  return "█".repeat(filled) + "░".repeat(width - filled);
};

console.log("══════════════════════════════════════════════════════════");
console.log("  Vouch · Agents Table — Data Quality Report");
console.log("══════════════════════════════════════════════════════════\n");

console.log(`  Total rows              : ${total.toLocaleString()}`);
console.log();
console.log("  ── Metadata coverage ──────────────────────────────────");
console.log(
  `  Has description         : ${withDescription.toLocaleString().padStart(6)} / ${total.toLocaleString()} (${pct(withDescription)})`
);
console.log(`  ${bar(withDescription)}`);
console.log();
console.log(
  `  Has skills              : ${withSkills.toLocaleString().padStart(6)} / ${total.toLocaleString()} (${pct(withSkills)})`
);
console.log(`  ${bar(withSkills)}`);
console.log();
console.log(
  `  Has description + skills: ${withBoth.toLocaleString().padStart(6)} / ${total.toLocaleString()} (${pct(withBoth)})`
);
console.log(`  ${bar(withBoth)}`);
console.log();
console.log("  ── Connectivity ────────────────────────────────────────");
console.log(
  `  Has service_endpoint    : ${withEndpoint.toLocaleString().padStart(6)} / ${total.toLocaleString()} (${pct(withEndpoint)})`
);
console.log(`  ${bar(withEndpoint)}`);
console.log();
console.log("  ── Reputation ──────────────────────────────────────────");
console.log(
  `  Has feedback (count > 0): ${withFeedback.toLocaleString().padStart(6)} / ${total.toLocaleString()} (${pct(withFeedback)})`
);
console.log(`  ${bar(withFeedback)}`);
console.log();
console.log(
  `  Has trust_score > 0     : ${withTrustScore.toLocaleString().padStart(6)} / ${total.toLocaleString()} (${pct(withTrustScore)})`
);
console.log(`  ${bar(withTrustScore)}`);
console.log();
console.log("  ── Search/demo usability ───────────────────────────────");
const usable = withBoth;
const searchable = withDescription;
console.log(
  `  Fully usable (desc+skills): ${usable.toLocaleString().padStart(5)} agents → ideal for demo`
);
console.log(
  `  Searchable (desc only)    : ${searchable.toLocaleString().padStart(5)} agents → text search works`
);

// Query and display sample of agents with description
const { data: descSamples } = await db
  .from("agents")
  .select("asset_id, name, description, skills")
  .not("description", "is", null)
  .limit(10);

console.log("\n  ── Sample agents with populated descriptions ───────────");
if (descSamples && descSamples.length > 0) {
  for (const s of descSamples) {
    console.log(`  • [${s.asset_id.slice(0, 10)}...] ${s.name}`);
    console.log(`    Desc:   "${s.description}"`);
    console.log(`    Skills: [${(s.skills || []).join(", ")}]`);
    console.log();
  }
} else {
  console.log("  (None found)");
}

// Query count of agents with a populated name
const { count: namedCount } = await db
  .from("agents")
  .select("*", { count: "exact", head: true })
  .not("name", "is", null);

console.log(`  Agents with populated name: ${namedCount} / ${total.toLocaleString()}`);
console.log(
  `  Name-only / stub          : ${(total - searchable).toLocaleString().padStart(5)} agents → sync metadata missing`
);
console.log();
console.log("══════════════════════════════════════════════════════════\n");
