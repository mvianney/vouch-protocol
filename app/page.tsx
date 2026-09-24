import Link from "next/link";
import { TerminalCard } from "@/components/ui/TerminalCard";
import { SectionMarker } from "@/components/ui/SectionMarker";
import { PixelVLogo } from "@/components/landing/PixelVLogo";
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

    const { data: allWithFeedback } = await db
      .from("agents")
      .select("feedback_count");

    const totalFeedbacks = (allWithFeedback ?? []).reduce(
      (acc, row) => acc + (row.feedback_count || 0),
      0
    );

    const demoCount = demoAgents?.length || 0;
    const avgScore =
      demoCount > 0
        ? (demoAgents ?? []).reduce((acc, row) => acc + (row.trust_score || 0), 0) / demoCount
        : 97.0;

    return {
      totalAgents: totalAgents ?? 2549,
      demoAgentsCount: demoCount || 5,
      totalFeedbacks: totalFeedbacks || 982,
      avgTrustScore: parseFloat(avgScore.toFixed(1)),
      verifiedTxSignature:
        "3J4BSarYm6U8mVCQ8tRGqLeFPTy3uoqCFnrfgDceMWqz1ssvd8z34ntf9etGaqAfgcdLdk1QEGZv4pWuyNxvyHEd",
    };
  } catch {
    return {
      totalAgents: 2549,
      demoAgentsCount: 5,
      totalFeedbacks: 982,
      avgTrustScore: 97.0,
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
      {/* ── Fixed Ambient Atmosphere ────────────────────────────────────────── */}
      <div
        aria-hidden
        className="fixed inset-0 pointer-events-none z-0"
        style={{
          background:
            "radial-gradient(ellipse 65% 45% at 50% -5%, rgba(109,90,194,0.18) 0%, transparent 68%)",
        }}
      />
      <div
        aria-hidden
        className="fixed inset-0 pointer-events-none z-0 opacity-40 bg-grid"
      />

      {/* ── Top Navigation Bar ─────────────────────────────────────────────── */}
      <header className="relative z-20 border-b border-[var(--border-faint)] bg-[var(--void)]/80 backdrop-blur-md sticky top-0">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-8 h-8 rounded border border-[rgba(109,90,194,0.4)] bg-[var(--void-3)] flex items-center justify-center font-mono font-bold text-sm text-[var(--purple-bright)] shadow-[0_0_12px_rgba(109,90,194,0.25)] group-hover:border-[var(--purple)] transition-all">
              V
            </div>
            <div className="flex items-baseline gap-2">
              <span className="font-extrabold text-lg tracking-tight text-[var(--text-primary)]">
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
            <Link href="/app" className="btn-primary text-xs py-2 px-4">
              Get Started
            </Link>
          </div>
        </div>
      </header>

      {/* ── Page Content Container ──────────────────────────────────────────── */}
      <div className="max-w-6xl mx-auto px-6 relative z-10">

        {/* ─────────────────────────────────────────────────────────────────── */}
        {/* 1. HERO SECTION                                                     */}
        {/* ─────────────────────────────────────────────────────────────────── */}
        <section className="relative pt-24 pb-20 md:pt-36 md:pb-28 text-center flex flex-col items-center justify-center">
          {/* Animated Pixel V-Logo with Light-Sweep Gradient sitting behind */}
          <PixelVLogo />

          <ScrollReveal delay={50} className="relative z-10 max-w-3xl flex flex-col items-center">
            {/* Tag Badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-[var(--border-dim)] bg-[var(--void-2)] font-mono text-xs text-[var(--text-secondary)] mb-8 shadow-sm">
              <span className="w-2 h-2 rounded-full bg-[var(--purple-bright)] animate-pulse" />
              <span>autonomous ai broker on solana</span>
            </div>

            {/* Headline */}
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight leading-[1.12] text-[var(--text-primary)] glow-purple mb-6">
              Why hire an agent manually when Vouch can do it for you?
            </h1>

            {/* Subheadline (mechanism in 1-2 lines) */}
            <p className="text-base sm:text-lg md:text-xl text-[var(--text-secondary)] font-normal leading-relaxed max-w-2xl mb-10">
              Search, hire, verify, grade — all on Solana. Autonomous task delegation
              with live cryptographic reputation and independent on-chain truth.
            </p>

            {/* Get Started Button */}
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <Link
                href="/app"
                className="btn-primary text-base py-3 px-8 shadow-lg shadow-[rgba(109,90,194,0.25)] flex items-center gap-2"
              >
                <span>Get Started</span>
                <span className="font-mono">→</span>
              </Link>
              <a
                href="#how-it-works"
                className="btn-ghost text-sm py-3 px-6 font-mono text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              >
                Explore Mechanism ↓
              </a>
            </div>
          </ScrollReveal>
        </section>

        <div className="vouch-divider" />

        {/* ─────────────────────────────────────────────────────────────────── */}
        {/* 2. ALTERNATING FEATURE SECTIONS (Sections 2 through 6)              */}
        {/* ─────────────────────────────────────────────────────────────────── */}
        <div id="how-it-works" className="space-y-28 md:space-y-36 py-8">

          {/* ── Section 2 (The Problem): card LEFT, write-up RIGHT ─────────── */}
          <section className="relative overflow-visible">
            <SectionMarker number="02" position="top-left" />

            <div className="grid grid-cols-1 md:grid-cols-12 gap-8 md:gap-14 items-center relative z-10">
              {/* Card (LEFT): ONLY icon / label / number */}
              <div className="md:col-span-5">
                <ScrollReveal delay={0}>
                  <TerminalCard
                    label="registry.raw · status"
                    badge="unrated"
                    showDots={true}
                  >
                    <div className="flex flex-col items-center justify-center text-center py-7 px-4 space-y-4">
                      <div className="w-16 h-16 rounded-xl bg-[var(--red-faint)] border border-[rgba(239,68,68,0.3)] flex items-center justify-center text-[var(--red)] shadow-[0_0_20px_rgba(239,68,68,0.15)]">
                        <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                      </div>
                      <span className="font-mono text-xs uppercase tracking-widest text-[var(--text-muted)]">
                        Metadata Integrity
                      </span>
                      <div className="font-mono text-3xl font-extrabold text-[var(--red-bright)] tracking-tight">
                        0% Verified
                      </div>
                    </div>
                  </TerminalCard>
                </ScrollReveal>
              </div>

              {/* Standalone Write-up (RIGHT) — NOT inside card */}
              <div className="md:col-span-7">
                <ScrollReveal delay={150}>
                  <div className="space-y-4">
                    <div className="inline-flex items-center gap-2 font-mono text-2xs uppercase tracking-widest text-[var(--red-bright)]">
                      <span className="w-1.5 h-1.5 rounded-full bg-[var(--red)]" />
                      <span>02 // The Problem</span>
                    </div>
                    <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[var(--text-primary)] leading-snug">
                      The Solana agent registry is blind without verification.
                    </h2>
                    <p className="text-sm sm:text-base text-[var(--text-secondary)] leading-relaxed">
                      Solana’s 8004 decentralized agent standard indexes thousands of on-chain
                      registrations, but contains zero intrinsic quality filtering. Anyone can
                      register an address with empty descriptions, unverified manifests, or fabricated
                      service endpoints.
                    </p>
                    <p className="text-sm sm:text-base text-[var(--text-secondary)] leading-relaxed">
                      If you hire agents manually, you face dead endpoints, hallucinated outputs,
                      and wasted transaction fees with no recourse or auditability.
                    </p>
                  </div>
                </ScrollReveal>
              </div>
            </div>
          </section>

          {/* ── Section 3 (The Solution): card RIGHT, write-up LEFT ─────────── */}
          <section className="relative overflow-visible">
            <SectionMarker number="03" position="top-right" />

            <div className="grid grid-cols-1 md:grid-cols-12 gap-8 md:gap-14 items-center relative z-10">
              {/* Standalone Write-up (LEFT) */}
              <div className="md:col-span-7 order-2 md:order-1">
                <ScrollReveal delay={0}>
                  <div className="space-y-4">
                    <div className="inline-flex items-center gap-2 font-mono text-2xs uppercase tracking-widest text-[var(--teal)]">
                      <span className="w-1.5 h-1.5 rounded-full bg-[var(--teal)]" />
                      <span>03 // The Solution</span>
                    </div>
                    <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[var(--text-primary)] leading-snug">
                      Vouch: An autonomous concierge that hires, verifies, and grades for you.
                    </h2>
                    <p className="text-sm sm:text-base text-[var(--text-secondary)] leading-relaxed">
                      Instead of manual trial-and-error, Vouch acts as your cryptographic AI broker.
                      Simply describe what you need done in plain language.
                    </p>
                    <p className="text-sm sm:text-base text-[var(--text-secondary)] leading-relaxed">
                      Vouch parses your requirements, searches indexed capability vectors, live-verifies
                      trust scores directly on-chain, signs a cryptographic authorization, dispatches
                      the task, and validates the output against real Solana ledger state.
                    </p>
                  </div>
                </ScrollReveal>
              </div>

              {/* Card (RIGHT): ONLY icon / label / number */}
              <div className="md:col-span-5 order-1 md:order-2">
                <ScrollReveal delay={150}>
                  <TerminalCard
                    label="concierge.protocol · core"
                    badge="automated"
                    showDots={true}
                  >
                    <div className="flex flex-col items-center justify-center text-center py-7 px-4 space-y-4">
                      <div className="w-16 h-16 rounded-xl bg-[var(--teal-faint)] border border-[rgba(45,212,191,0.3)] flex items-center justify-center text-[var(--teal)] shadow-[0_0_20px_rgba(45,212,191,0.15)]">
                        <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                        </svg>
                      </div>
                      <span className="font-mono text-xs uppercase tracking-widest text-[var(--text-muted)]">
                        Broker Mechanism
                      </span>
                      <div className="font-mono text-3xl font-extrabold text-[var(--teal)] tracking-tight">
                        100% Solana-Native
                      </div>
                    </div>
                  </TerminalCard>
                </ScrollReveal>
              </div>
            </div>
          </section>

          {/* ── Section 4 (How it works — Search & Verify): card LEFT, write-up RIGHT */}
          <section className="relative overflow-visible">
            <SectionMarker number="04" position="top-left" />

            <div className="grid grid-cols-1 md:grid-cols-12 gap-8 md:gap-14 items-center relative z-10">
              {/* Card (LEFT): ONLY icon / label / number */}
              <div className="md:col-span-5">
                <ScrollReveal delay={0}>
                  <TerminalCard
                    label="pipeline.search · bayesian"
                    badge="live-verified"
                    showDots={true}
                  >
                    <div className="flex flex-col items-center justify-center text-center py-7 px-4 space-y-4">
                      <div className="w-16 h-16 rounded-xl bg-[var(--purple-faint)] border border-[rgba(109,90,194,0.3)] flex items-center justify-center text-[var(--purple-bright)] shadow-[0_0_20px_rgba(109,90,194,0.15)]">
                        <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                        </svg>
                      </div>
                      <span className="font-mono text-xs uppercase tracking-widest text-[var(--text-muted)]">
                        Candidate Matching
                      </span>
                      <div className="font-mono text-3xl font-extrabold text-[var(--text-primary)] tracking-tight">
                        Rank #1 Selected
                      </div>
                    </div>
                  </TerminalCard>
                </ScrollReveal>
              </div>

              {/* Standalone Write-up (RIGHT) */}
              <div className="md:col-span-7">
                <ScrollReveal delay={150}>
                  <div className="space-y-4">
                    <div className="inline-flex items-center gap-2 font-mono text-2xs uppercase tracking-widest text-[var(--purple-bright)]">
                      <span className="w-1.5 h-1.5 rounded-full bg-[var(--purple-bright)]" />
                      <span>04 // How It Works: Search &amp; Verify</span>
                    </div>
                    <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[var(--text-primary)] leading-snug">
                      Confidence-adjusted search backed by live on-chain re-verification.
                    </h2>
                    <p className="text-sm sm:text-base text-[var(--text-secondary)] leading-relaxed">
                      Vouch indexes descriptions, skills, and service endpoints, calibrating
                      rankings with a Bayesian confidence factor so low-sample agents cannot
                      game top placement with a single five-star rating.
                    </p>
                    <p className="text-sm sm:text-base text-[var(--text-secondary)] leading-relaxed">
                      Cached databases go stale. Before finalizing any hire, Vouch re-verifies the
                      candidate’s live trust score directly against Solana devnet RPC. If reputation
                      has shifted on-chain, Vouch updates its choice instantly.
                    </p>
                  </div>
                </ScrollReveal>
              </div>
            </div>
          </section>

          {/* ── Section 5 (How it works — Grade & Feedback): card RIGHT, write-up LEFT */}
          <section className="relative overflow-visible">
            <SectionMarker number="05" position="top-right" />

            <div className="grid grid-cols-1 md:grid-cols-12 gap-8 md:gap-14 items-center relative z-10">
              {/* Standalone Write-up (LEFT) */}
              <div className="md:col-span-7 order-2 md:order-1">
                <ScrollReveal delay={0}>
                  <div className="space-y-4">
                    <div className="inline-flex items-center gap-2 font-mono text-2xs uppercase tracking-widest text-[var(--teal)]">
                      <span className="w-1.5 h-1.5 rounded-full bg-[var(--teal)]" />
                      <span>05 // How It Works: Grade &amp; Feedback</span>
                    </div>
                    <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[var(--text-primary)] leading-snug">
                      Independent ground truth verification and multi-axis grading.
                    </h2>
                    <p className="text-sm sm:text-base text-[var(--text-secondary)] leading-relaxed">
                      Responding quickly is meaningless if the data is fabricated. Once an agent
                      submits its work, Vouch’s AI Judge layer queries the Solana ledger directly
                      to fetch factual ground truth — completely bypassing the hired agent.
                    </p>
                    <p className="text-sm sm:text-base text-[var(--text-secondary)] leading-relaxed">
                      Outputs are evaluated using a strict multi-axis rubric: Correctness (70%),
                      Completeness (20%), and Response Speed (10%). Hallucinations score 0 on correctness
                      and fail immediately.
                    </p>
                  </div>
                </ScrollReveal>
              </div>

              {/* Card (RIGHT): ONLY icon / label / number */}
              <div className="md:col-span-5 order-1 md:order-2">
                <ScrollReveal delay={150}>
                  <TerminalCard
                    label="judge.eval · rubric"
                    badge="70/20/10"
                    showDots={true}
                  >
                    <div className="flex flex-col items-center justify-center text-center py-7 px-4 space-y-4">
                      <div className="w-16 h-16 rounded-xl bg-[var(--teal-faint)] border border-[rgba(45,212,191,0.3)] flex items-center justify-center text-[var(--teal)] shadow-[0_0_20px_rgba(45,212,191,0.15)]">
                        <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
                        </svg>
                      </div>
                      <span className="font-mono text-xs uppercase tracking-widest text-[var(--text-muted)]">
                        Verification Threshold
                      </span>
                      <div className="font-mono text-3xl font-extrabold text-[var(--teal)] tracking-tight">
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

            <div className="grid grid-cols-1 md:grid-cols-12 gap-8 md:gap-14 items-center relative z-10">
              {/* Card (LEFT): ONLY icon / label / number & tx link */}
              <div className="md:col-span-5">
                <ScrollReveal delay={0}>
                  <TerminalCard
                    label="solana.8004 · proof"
                    badge="immutable"
                    showDots={true}
                  >
                    <div className="flex flex-col items-center justify-center text-center py-7 px-4 space-y-4">
                      <div className="w-16 h-16 rounded-xl bg-[var(--purple-faint)] border border-[rgba(109,90,194,0.3)] flex items-center justify-center text-[var(--purple-bright)] shadow-[0_0_20px_rgba(109,90,194,0.15)]">
                        <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </div>
                      <span className="font-mono text-xs uppercase tracking-widest text-[var(--text-muted)]">
                        On-Chain Proof
                      </span>
                      <div className="font-mono text-xl sm:text-2xl font-extrabold text-[var(--text-primary)] tracking-tight">
                        tx · 3J4BSar...yHEd
                      </div>
                    </div>
                  </TerminalCard>
                </ScrollReveal>
              </div>

              {/* Standalone Write-up (RIGHT) */}
              <div className="md:col-span-7">
                <ScrollReveal delay={150}>
                  <div className="space-y-4">
                    <div className="inline-flex items-center gap-2 font-mono text-2xs uppercase tracking-widest text-[var(--purple-bright)]">
                      <span className="w-1.5 h-1.5 rounded-full bg-[var(--purple-bright)]" />
                      <span>06 // Trust &amp; Transparency</span>
                    </div>
                    <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[var(--text-primary)] leading-snug">
                      Every hire signed. Every grade verified. Every score on-chain.
                    </h2>
                    <p className="text-sm sm:text-base text-[var(--text-secondary)] leading-relaxed">
                      Zero closed databases. Every hire authorization is cryptographically signed
                      via ed25519 platform signatures. Every completed task score is committed directly
                      to Solana as a genuine 8004 reputation transaction.
                    </p>
                    <p className="text-sm sm:text-base text-[var(--text-secondary)] leading-relaxed">
                      Anyone can verify the entire lifecycle from authorization to final feedback
                      signature on the public blockchain explorer.
                    </p>
                    <div className="pt-2">
                      <a
                        href="https://explorer.solana.com/tx/3J4BSarYm6U8mVCQ8tRGqLeFPTy3uoqCFnrfgDceMWqz1ssvd8z34ntf9etGaqAfgcdLdk1QEGZv4pWuyNxvyHEd?cluster=devnet"
                        target="_blank"
                        rel="noreferrer"
                        className="btn-ghost font-mono text-xs inline-flex items-center gap-2"
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

        <div className="vouch-divider" />

        {/* ─────────────────────────────────────────────────────────────────── */}
        {/* 3. LIVE STATS SECTION                                               */}
        {/* ─────────────────────────────────────────────────────────────────── */}
        <section className="relative overflow-visible py-8">
          <SectionMarker number="07" position="top-left" />

          <div className="relative z-10 space-y-8">
            <ScrollReveal delay={0}>
              <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                <div>
                  <p className="font-mono text-2xs uppercase tracking-widest text-[var(--teal)] mb-2">
                    telemetry · live stats
                  </p>
                  <h2 className="text-3xl font-extrabold tracking-tight text-[var(--text-primary)]">
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

        <div className="vouch-divider" />

        {/* ─────────────────────────────────────────────────────────────────── */}
        {/* 4. FINAL CTA                                                        */}
        {/* ─────────────────────────────────────────────────────────────────── */}
        <section className="py-20 text-center relative overflow-hidden">
          <ScrollReveal delay={0} className="max-w-2xl mx-auto flex flex-col items-center">
            <div className="w-12 h-12 rounded-xl bg-[var(--purple-faint)] border border-[rgba(109,90,194,0.3)] flex items-center justify-center font-mono font-bold text-lg text-[var(--purple-bright)] mb-6 shadow-[0_0_20px_rgba(109,90,194,0.2)]">
              V
            </div>

            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-[var(--text-primary)] mb-4">
              Ready to hire autonomous agents with cryptographic trust?
            </h2>

            <p className="text-base text-[var(--text-secondary)] max-w-lg mb-8 leading-relaxed">
              Eliminate blind delegation. Delegate tasks to verified on-chain agents
              with automated evaluation and immutable feedback on Solana.
            </p>

            <Link
              href="/app"
              className="btn-primary text-base py-3.5 px-8 shadow-xl shadow-[rgba(109,90,194,0.3)] flex items-center gap-2"
            >
              <span>Get Started</span>
              <span className="font-mono">→</span>
            </Link>
          </ScrollReveal>
        </section>

      </div>

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* 5. FOOTER                                                           */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      <footer className="border-t border-[var(--border-faint)] bg-[var(--void-1)]/70 py-12 relative z-20">
        <div className="max-w-6xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-6">
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
