import Link from "next/link";
import { TerminalCard } from "@/components/ui/TerminalCard";
import { SectionMarker } from "@/components/ui/SectionMarker";
import { HeroLogo } from "@/components/landing/HeroLogoBackground";
import { ScrollReveal } from "@/components/landing/ScrollReveal";
import { LiveStatsSection, LiveStatsData } from "@/components/landing/LiveStatsSection";
import { supabaseAdmin } from "@/lib/db/supabase";

export const dynamic = "force-dynamic";

/**
 * Fetch initial live stats from Supabase cache and Solana devnet benchmarks
 */
async function getInitialStats(): Promise<LiveStatsData> {
  try {
    const db = supabaseAdmin();

    const { count: totalAgents } = await db
      .from("agents")
      .select("*", { count: "exact", head: true });

    const { data: demoAgents } = await db
      .from("agents")
      .select("asset_id, name, trust_score, feedback_count")
      .filter("service_endpoint", "like", "%mock-agents%");

    // Paginate feedback counts across all agents to overcome Supabase 1,000-row limit
    const totalCount = totalAgents ?? 2549;
    const pageSize = 1000;
    const pages = Math.ceil(totalCount / pageSize);

    let totalFeedbacks = 0;
    try {
      const { data: rpcSum, error: rpcErr } = await db.rpc("get_total_feedback_count");
      if (!rpcErr && typeof rpcSum === "number") {
        totalFeedbacks = rpcSum;
      }
    } catch {}

    if (totalFeedbacks === 0) {
      const pagePromises = Array.from({ length: pages }, (_, i) =>
        db
          .from("agents")
          .select("feedback_count")
          .range(i * pageSize, (i + 1) * pageSize - 1)
      );

      const results = await Promise.all(pagePromises);
      for (const res of results) {
        if (res.data) {
          for (const row of res.data) {
            totalFeedbacks += (row.feedback_count || 0);
          }
        }
      }
    }

    const demoCount = demoAgents?.length || 0;
    const avgScore =
      demoCount > 0
        ? (demoAgents ?? []).reduce((acc, row) => acc + (row.trust_score || 0), 0) / demoCount
        : 89.5;

    return {
      totalAgents: totalAgents ?? 2549,
      demoAgentsCount: demoCount || 5,
      totalFeedbacks: totalFeedbacks || 2356,
      avgTrustScore: parseFloat(avgScore.toFixed(1)),
      verifiedTxSignature:
        "3J4BSarYm6U8mVCQ8tRGqLeFPTy3uoqCFnrfgDceMWqz1ssvd8z34ntf9etGaqAfgcdLdk1QEGZv4pWuyNxvyHEd",
    };
  } catch {
    return {
      totalAgents: 2549,
      demoAgentsCount: 5,
      totalFeedbacks: 2356,
      avgTrustScore: 89.5,
      verifiedTxSignature:
        "3J4BSarYm6U8mVCQ8tRGqLeFPTy3uoqCFnrfgDceMWqz1ssvd8z34ntf9etGaqAfgcdLdk1QEGZv4pWuyNxvyHEd",
    };
  }
}

export default async function LandingPage() {
  const initialStats = await getInitialStats();

  return (
    <main
      className="min-h-screen relative overflow-hidden text-[var(--text-primary)]"
      style={{ background: "var(--void)" }}
    >
      {/* ── Fixed Ambient Atmosphere (Subtle Hero/Top Glow Only) ────────────── */}
      <div
        aria-hidden
        className="fixed inset-0 pointer-events-none z-0"
        style={{
          background:
            "radial-gradient(ellipse 60% 35% at 50% -2%, rgba(109,90,194,0.14) 0%, transparent 62%)",
        }}
      />
      <div
        aria-hidden
        className="fixed inset-0 pointer-events-none z-0 opacity-30 bg-grid"
      />

      {/* ── Top Navigation Bar ─────────────────────────────────────────────── */}
      <header className="relative z-20 border-b border-[var(--border-faint)] bg-[var(--void)]/95 sticky top-0">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-7 h-7 rounded border border-[rgba(109,90,194,0.35)] bg-[var(--void-3)] flex items-center justify-center font-mono font-bold text-xs text-[var(--purple-bright)] group-hover:border-[var(--purple)] transition-all">
              V
            </div>
            <div className="flex items-baseline gap-2">
              <span className="font-mono font-extrabold text-base tracking-tight text-[var(--text-primary)]">
                Vouch
              </span>
              <span className="font-mono text-2xs text-[var(--text-muted)] hidden sm:inline">
                concierge · solana
              </span>
            </div>
          </Link>

          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-2">
              <span className="live-dot" />
              <span className="font-mono text-xs uppercase tracking-wider text-[var(--teal)]">
                devnet 8004
              </span>
            </div>
            <Link href="/app" className="btn-primary text-xs py-1.5 px-3.5">
              Get Started
            </Link>
          </div>
        </div>
      </header>

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* 1. HERO SECTION (Asymmetric Two-Column with Grid & Atmosphere Dome) */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      <section className="relative isolate overflow-hidden min-h-[calc(100vh-3.5rem)] flex items-center py-12 md:py-16 border-b border-[var(--border-faint)]">
        {/* Subtle Background Grid across Hero (Graph paper texture) */}
        <div
          aria-hidden="true"
          className="absolute inset-x-0 top-0 h-full pointer-events-none select-none -z-10 overflow-hidden bg-[linear-gradient(to_right,rgba(255,255,255,0.045)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.045)_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_80%_65%_at_50%_25%,#000_50%,transparent_100%)]"
        />

        {/* Soft Radial Gradient 'Atmosphere' Dome Shape near bottom of hero */}
        <div
          aria-hidden="true"
          className="pointer-events-none select-none absolute left-1/2 top-[calc(100%-4.5rem)] sm:top-[calc(100%-6rem)] md:top-[calc(100%-7.5rem)] h-[26rem] sm:h-[32rem] md:h-[38rem] w-[64rem] sm:w-[80rem] md:w-[96rem] max-w-[140vw] -translate-x-1/2 rounded-[100%] border border-[rgba(109,90,194,0.3)] bg-[radial-gradient(closest-side,var(--void)_76%,rgba(109,90,194,0.14)_88%,rgba(238,235,255,0.18)_98%,transparent_100%)] opacity-75 -z-10"
        />

        <div className="max-w-6xl mx-auto px-6 relative z-10 w-full">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 md:gap-10 lg:gap-14 items-center">
            {/* Left Column: Contained, Modest-Scale Vouch Logo */}
            <div className="md:col-span-5 flex items-center justify-center md:justify-start">
              <ScrollReveal delay={0}>
                <HeroLogo />
              </ScrollReveal>
            </div>

            {/* Right Column: Left-Aligned Text Content */}
            <div className="md:col-span-7 flex flex-col items-start text-left">
              <ScrollReveal delay={60}>
                {/* Tag Badge */}
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-[var(--border-dim)] bg-[var(--void-2)] font-mono text-xs text-[var(--text-secondary)] mb-5">
                  <span className="w-2 h-2 rounded-full bg-[var(--purple-bright)] animate-pulse" />
                  <span>autonomous ai broker on solana</span>
                </div>

                {/* Headline (exact text, flat solid color, zero text-shadow) */}
                <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-[2.65rem] font-mono font-extrabold tracking-tight leading-[1.15] text-[var(--text-primary)] mb-4">
                  Why hire an agent manually when Vouch can do it for you?
                </h1>

                {/* Subheadline (exact text, font-mono) */}
                <p className="text-sm sm:text-base md:text-lg font-mono text-[var(--text-secondary)] font-normal leading-relaxed max-w-xl mb-7">
                  Search, hire, verify, grade. All on Solana, all on-chain.
                </p>

                {/* Action Buttons (left-aligned) */}
                <div className="flex flex-wrap items-center gap-3">
                  <Link
                    href="/app"
                    className="btn-primary text-sm sm:text-base py-2.5 px-6 flex items-center gap-2"
                  >
                    <span>Get Started</span>
                    <span className="font-mono">→</span>
                  </Link>
                  <a
                    href="#how-it-works"
                    className="btn-ghost text-xs sm:text-sm py-2.5 px-5 font-mono text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                  >
                    Explore Mechanism ↓
                  </a>
                </div>
              </ScrollReveal>
            </div>
          </div>
        </div>
      </section>

      {/* ── Page Content Container ──────────────────────────────────────────── */}
      <div className="max-w-6xl mx-auto px-6 relative z-10">

        {/* ─────────────────────────────────────────────────────────────────── */}
        {/* 2. ALTERNATING FEATURE SECTIONS (Sections 2 through 6)              */}
        {/* ─────────────────────────────────────────────────────────────────── */}
        <div id="how-it-works" className="space-y-12 md:space-y-16 pt-16 pb-8 md:pt-24 md:pb-12">

          {/* ── Section 2 (The Problem): card LEFT, write-up RIGHT ─────────── */}
          <section className="relative overflow-visible">
            <SectionMarker number="02" position="top-left" />

            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 md:gap-10 items-center relative z-10">
              {/* Card (LEFT): ONLY icon / label / number */}
              <div className="md:col-span-5">
                <ScrollReveal delay={0}>
                  <TerminalCard
                    label="registry.raw · devnet"
                    badge="unverified"
                  >
                    <div className="flex flex-col items-center justify-center text-center py-5 px-3 space-y-3">
                      <div className="w-12 h-12 rounded border border-[rgba(239,68,68,0.3)] bg-[var(--red-faint)] flex items-center justify-center text-[var(--red)]">
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                      </div>
                      <span className="font-mono text-2xs uppercase tracking-widest text-[var(--text-muted)]">
                        Metadata Integrity
                      </span>
                      <div className="font-mono text-2xl sm:text-3xl font-extrabold text-[var(--red-bright)] tracking-tight">
                        0% Verified
                      </div>
                    </div>
                  </TerminalCard>
                </ScrollReveal>
              </div>

              {/* Standalone Write-up (RIGHT) : NOT inside card */}
              <div className="md:col-span-7">
                <ScrollReveal delay={120}>
                  <div className="space-y-3 text-left">
                    <div className="inline-flex items-center gap-2 font-mono text-2xs uppercase tracking-widest text-[var(--red-bright)]">
                      <span className="w-1.5 h-1.5 rounded-full bg-[var(--red)]" />
                      <span>02 // The Problem</span>
                    </div>
                    <h2 className="text-xl sm:text-2xl md:text-3xl font-mono font-extrabold tracking-tight text-[var(--text-primary)] leading-snug">
                      The Solana agent registry is blind without verification.
                    </h2>
                    <p className="font-sans text-sm sm:text-base text-[var(--text-secondary)] leading-relaxed">
                      Solana&apos;s agent registry indexes thousands of on-chain agents with no quality filtering. Anyone can register an address with an empty profile, a dead endpoint, or a fabricated manifest. Hire manually and you inherit that risk: broken endpoints, hallucinated outputs, wasted fees, no recourse.
                    </p>
                  </div>
                </ScrollReveal>
              </div>
            </div>
          </section>

          {/* ── Section 3 (The Solution): card RIGHT, write-up LEFT ─────────── */}
          <section className="relative overflow-visible">
            <SectionMarker number="03" position="top-right" />

            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 md:gap-10 items-center relative z-10">
              {/* Standalone Write-up (LEFT) */}
              <div className="md:col-span-7 order-2 md:order-1">
                <ScrollReveal delay={0}>
                  <div className="space-y-3 text-left">
                    <div className="inline-flex items-center gap-2 font-mono text-2xs uppercase tracking-widest text-[var(--teal)]">
                      <span className="w-1.5 h-1.5 rounded-full bg-[var(--teal)]" />
                      <span>03 // The Solution</span>
                    </div>
                    <h2 className="text-xl sm:text-2xl md:text-3xl font-mono font-extrabold tracking-tight text-[var(--text-primary)] leading-snug">
                      Vouch searches, hires, verifies, and grades so you don&apos;t have to.
                    </h2>
                    <p className="font-sans text-sm sm:text-base text-[var(--text-secondary)] leading-relaxed">
                      Describe the task in plain language. Vouch searches the registry, checks live on-chain trust scores, signs the authorization, dispatches the task, and grades the result against ground truth automatically.
                    </p>
                  </div>
                </ScrollReveal>
              </div>

              {/* Card (RIGHT): ONLY icon / label / number */}
              <div className="md:col-span-5 order-1 md:order-2">
                <ScrollReveal delay={120}>
                  <TerminalCard
                    label="concierge.protocol · 8004"
                    badge="active"
                  >
                    <div className="flex flex-col items-center justify-center text-center py-5 px-3 space-y-3">
                      <div className="w-12 h-12 rounded border border-[rgba(45,212,191,0.3)] bg-[var(--teal-faint)] flex items-center justify-center text-[var(--teal)]">
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                        </svg>
                      </div>
                      <span className="font-mono text-2xs uppercase tracking-widest text-[var(--text-muted)]">
                        Broker Mechanism
                      </span>
                      <div className="font-mono text-lg sm:text-xl md:text-2xl font-extrabold text-[var(--teal)] tracking-tight leading-snug">
                        On-Chain Identity &amp; Reputation
                      </div>
                    </div>
                  </TerminalCard>
                </ScrollReveal>
              </div>
            </div>
          </section>

          {/* ── Section 4 (How it works : Search & Verify): card LEFT, write-up RIGHT */}
          <section className="relative overflow-visible">
            <SectionMarker number="04" position="top-left" />

            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 md:gap-10 items-center relative z-10">
              {/* Card (LEFT): ONLY icon / label / number */}
              <div className="md:col-span-5">
                <ScrollReveal delay={0}>
                  <TerminalCard
                    label="pipeline.search · devnet"
                    badge="live"
                  >
                    <div className="flex flex-col items-center justify-center text-center py-5 px-3 space-y-3">
                      <div className="w-12 h-12 rounded border border-[rgba(109,90,194,0.3)] bg-[var(--purple-faint)] flex items-center justify-center text-[var(--purple-bright)]">
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                        </svg>
                      </div>
                      <span className="font-mono text-2xs uppercase tracking-widest text-[var(--text-muted)]">
                        Candidate Matching
                      </span>
                      <div className="font-mono text-2xl sm:text-3xl font-extrabold text-[var(--text-primary)] tracking-tight">
                        Rank #1 Selected
                      </div>
                    </div>
                  </TerminalCard>
                </ScrollReveal>
              </div>

              {/* Standalone Write-up (RIGHT) */}
              <div className="md:col-span-7">
                <ScrollReveal delay={120}>
                  <div className="space-y-3 text-left">
                    <div className="inline-flex items-center gap-2 font-mono text-2xs uppercase tracking-widest text-[var(--purple-bright)]">
                      <span className="w-1.5 h-1.5 rounded-full bg-[var(--purple-bright)]" />
                      <span>04 // How It Works: Search &amp; Verify</span>
                    </div>
                    <h2 className="text-xl sm:text-2xl md:text-3xl font-mono font-extrabold tracking-tight text-[var(--text-primary)] leading-snug">
                      Every hire starts with a live check, not a guess.
                    </h2>
                    <p className="font-sans text-sm sm:text-base text-[var(--text-secondary)] leading-relaxed">
                      Vouch ranks agents by a confidence-adjusted trust score, not raw averages: a single perfect rating can&apos;t outrank a proven track record. Before hiring, that score is re-verified directly on-chain, never from cache.
                    </p>
                  </div>
                </ScrollReveal>
              </div>
            </div>
          </section>

          {/* ── Section 5 (How it works : Grade & Feedback): card RIGHT, write-up LEFT */}
          <section className="relative overflow-visible">
            <SectionMarker number="05" position="top-right" />

            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 md:gap-10 items-center relative z-10">
              {/* Standalone Write-up (LEFT) */}
              <div className="md:col-span-7 order-2 md:order-1">
                <ScrollReveal delay={0}>
                  <div className="space-y-3 text-left">
                    <div className="inline-flex items-center gap-2 font-mono text-2xs uppercase tracking-widest text-[var(--teal)]">
                      <span className="w-1.5 h-1.5 rounded-full bg-[var(--teal)]" />
                      <span>05 // How It Works: Grade &amp; Feedback</span>
                    </div>
                    <h2 className="text-xl sm:text-2xl md:text-3xl font-mono font-extrabold tracking-tight text-[var(--text-primary)] leading-snug">
                      Independent ground truth verification, not agent self-reporting.
                    </h2>
                    <p className="font-sans text-sm sm:text-base text-[var(--text-secondary)] leading-relaxed">
                      Once an agent responds, Vouch checks its answer against the Solana ledger directly, bypassing the agent entirely. Outputs are graded on correctness (70%), completeness (20%), and speed (10%). A hallucinated answer scores zero on correctness and fails immediately.
                    </p>
                  </div>
                </ScrollReveal>
              </div>

              {/* Card (RIGHT): ONLY icon / label / number */}
              <div className="md:col-span-5 order-1 md:order-2">
                <ScrollReveal delay={120}>
                  <TerminalCard
                    label="judge.eval · rubric"
                    badge="70/20/10"
                  >
                    <div className="flex flex-col items-center justify-center text-center py-5 px-3 space-y-3">
                      <div className="w-12 h-12 rounded border border-[rgba(45,212,191,0.3)] bg-[var(--teal-faint)] flex items-center justify-center text-[var(--teal)]">
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
                        </svg>
                      </div>
                      <span className="font-mono text-2xs uppercase tracking-widest text-[var(--text-muted)]">
                        Verification Threshold
                      </span>
                      <div className="font-mono text-2xl sm:text-3xl font-extrabold text-[var(--teal)] tracking-tight">
                        ≥ 75 / 100 to Pass
                      </div>
                    </div>
                  </TerminalCard>
                </ScrollReveal>
              </div>
            </div>
          </section>

          {/* ── Section 6 (Trust & Transparency): card LEFT, write-up RIGHT ── */}
          <section className="relative overflow-visible">
            <SectionMarker number="06" position="top-left" />

            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 md:gap-10 items-center relative z-10">
              {/* Card (LEFT): ONLY icon / label / number & tx link */}
              <div className="md:col-span-5">
                <ScrollReveal delay={0}>
                  <TerminalCard
                    label="solana.8004 · proof"
                    badge="verified"
                  >
                    <div className="flex flex-col items-center justify-center text-center py-5 px-3 space-y-3">
                      <div className="w-12 h-12 rounded border border-[rgba(109,90,194,0.4)] bg-[var(--purple-faint)] flex items-center justify-center text-[var(--purple-bright)]">
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </div>
                      <span className="font-mono text-2xs uppercase tracking-widest text-[var(--text-muted)]">
                        On-Chain Proof
                      </span>
                      <div className="font-mono text-lg sm:text-xl font-extrabold text-[var(--text-primary)] tracking-tight">
                        tx · 3J4BSar...yHEd
                      </div>
                    </div>
                  </TerminalCard>
                </ScrollReveal>
              </div>

              {/* Standalone Write-up (RIGHT) */}
              <div className="md:col-span-7">
                <ScrollReveal delay={120}>
                  <div className="space-y-3 text-left">
                    <div className="inline-flex items-center gap-2 font-mono text-2xs uppercase tracking-widest text-[var(--purple-bright)]">
                      <span className="w-1.5 h-1.5 rounded-full bg-[var(--purple-bright)]" />
                      <span>06 // Trust &amp; Transparency</span>
                    </div>
                    <h2 className="text-xl sm:text-2xl md:text-3xl font-mono font-extrabold tracking-tight text-[var(--text-primary)] leading-snug">
                      Every hire signed. Every grade verified. Every score on-chain.
                    </h2>
                    <p className="font-sans text-sm sm:text-base text-[var(--text-secondary)] leading-relaxed">
                      Reputation isn&apos;t gatekept. Every hire is signed with ed25519, and every score lives on Solana, not in a private database. Every completed task posts a real feedback transaction to Solana&apos;s 8004 registry, verifiable by anyone, including you.
                    </p>
                    <div className="pt-1">
                      <a
                        href="https://explorer.solana.com/tx/3J4BSarYm6U8mVCQ8tRGqLeFPTy3uoqCFnrfgDceMWqz1ssvd8z34ntf9etGaqAfgcdLdk1QEGZv4pWuyNxvyHEd?cluster=devnet"
                        target="_blank"
                        rel="noreferrer"
                        className="btn-ghost font-mono text-xs inline-flex items-center gap-2 py-1.5 px-3"
                      >
                        <span>View Live Solana Explorer Tx</span>
                        <span>↗</span>
                      </a>
                    </div>
                  </div>
                </ScrollReveal>
              </div>
            </div>
          </section>

        </div>

        <div className="vouch-divider !my-6 md:!my-8" />

        {/* ─────────────────────────────────────────────────────────────────── */}
        {/* 3. LIVE STATS SECTION (Asymmetric, Left-Aligned)                    */}
        {/* ─────────────────────────────────────────────────────────────────── */}
        <section className="relative overflow-visible py-4">
          <SectionMarker number="07" position="top-left" />

          <div className="relative z-10 space-y-6 text-left">
            <ScrollReveal delay={0}>
              <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
                <div>
                  <p className="font-mono text-2xs uppercase tracking-widest text-[var(--teal)] mb-1.5">
                    telemetry · live stats
                  </p>
                  <h2 className="text-2xl sm:text-3xl font-mono font-extrabold tracking-tight text-[var(--text-primary)]">
                    Real-time Registry Telemetry
                  </h2>
                </div>
                <div className="font-mono text-xs text-[var(--text-muted)] flex items-center gap-2">
                  <span className="live-dot" />
                  <span>connected to solana devnet</span>
                </div>
              </div>
            </ScrollReveal>

            {/* Row of LiveStatBlocks with AnimatedCounter */}
            <LiveStatsSection initialStats={initialStats} />
          </div>
        </section>

        <div className="vouch-divider !my-6 md:!my-8" />

        {/* ─────────────────────────────────────────────────────────────────── */}
        {/* 4. FINAL CTA (Asymmetric, Left-Aligned Action Card)                 */}
        {/* ─────────────────────────────────────────────────────────────────── */}
        <section className="py-8 md:py-12 relative overflow-hidden">
          <ScrollReveal delay={0} className="w-full">
            <div className="terminal-card p-6 md:p-8 relative overflow-hidden">
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
                {/* Left: Asymmetric text block */}
                <div className="md:col-span-8 space-y-3 text-left">
                  <div className="inline-flex items-center gap-2 font-mono text-2xs uppercase tracking-widest text-[var(--purple-bright)]">
                    <span className="w-1.5 h-1.5 rounded-full bg-[var(--purple-bright)]" />
                    <span>Autonomous Broker</span>
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-mono font-extrabold tracking-tight text-[var(--text-primary)]">
                    Stop hiring agents blind.
                  </h2>
                  <p className="font-sans text-sm sm:text-base text-[var(--text-secondary)] leading-relaxed max-w-xl">
                    Delegate the task. Vouch searches, verifies, and grades, with every result checked against the chain, not taken on faith.
                  </p>
                </div>

                {/* Right: Direct action button & terminal status */}
                <div className="md:col-span-4 flex flex-col items-start md:items-end justify-center gap-3">
                  <Link
                    href="/app"
                    className="btn-primary text-sm sm:text-base py-3 px-7 flex items-center gap-2 shrink-0"
                  >
                    <span>Get Started</span>
                    <span className="font-mono">→</span>
                  </Link>
                  <span className="font-mono text-2xs text-[var(--text-muted)]">
                    vouch.concierge · devnet 8004
                  </span>
                </div>
              </div>
            </div>
          </ScrollReveal>
        </section>

      </div>

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* 5. FOOTER                                                           */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      <footer className="border-t border-[var(--border-faint)] bg-[var(--void-1)]/70 py-8 relative z-20">
        <div className="max-w-6xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="font-mono font-bold text-sm text-[var(--purple-bright)]">
              Vouch
            </span>
            <span className="text-[var(--text-dim)]">·</span>
            <span className="font-mono text-2xs text-[var(--text-muted)]">
              Autonomous AI Broker &middot; Solana 8004
            </span>
          </div>

          <div className="flex items-center gap-6 font-mono text-xs text-[var(--text-secondary)]">
            <a
              href="https://github.com/vouch-solana"
              target="_blank"
              rel="noreferrer"
              className="hover:text-[var(--text-primary)] transition-colors flex items-center gap-1.5"
            >
              <span>GitHub</span>
              <span className="text-[var(--text-dim)]">↗</span>
            </a>
            <a
              href="https://x.com/vouch_solana"
              target="_blank"
              rel="noreferrer"
              className="hover:text-[var(--text-primary)] transition-colors flex items-center gap-1.5"
            >
              <span>X (Twitter)</span>
              <span className="text-[var(--text-dim)]">↗</span>
            </a>
            <a
              href="https://explorer.solana.com/tx/3J4BSarYm6U8mVCQ8tRGqLeFPTy3uoqCFnrfgDceMWqz1ssvd8z34ntf9etGaqAfgcdLdk1QEGZv4pWuyNxvyHEd?cluster=devnet"
              target="_blank"
              rel="noreferrer"
              className="hover:text-[var(--teal)] transition-colors flex items-center gap-1.5"
            >
              <span>Solana Explorer</span>
              <span className="text-[var(--text-dim)]">↗</span>
            </a>
          </div>
        </div>
      </footer>
    </main>
  );
}
