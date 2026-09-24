import Link from "next/link";
import { TerminalCard } from "@/components/ui/TerminalCard";

export default function AppPage() {
  return (
    <main className="min-h-screen py-16 px-6 md:px-12 max-w-4xl mx-auto flex flex-col justify-center">
      {/* Top radial glow */}
      <div
        aria-hidden
        className="fixed inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 60% 40% at 50% -5%, rgba(109,90,194,0.18) 0%, transparent 70%)",
        }}
      />

      <div className="relative z-10 space-y-8">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center gap-3 font-mono text-xs text-[var(--text-muted)]">
          <Link
            href="/"
            className="hover:text-[var(--text-primary)] transition-colors flex items-center gap-1.5"
          >
            <span>←</span> vouch.root
          </Link>
          <span>/</span>
          <span className="text-[var(--purple-bright)]">app</span>
          <span className="tag-purple ml-2">devnet</span>
        </div>

        {/* Terminal Placeholder Card */}
        <TerminalCard
          label="vouch.concierge · interactive_session"
          badge="standby"
          showDots={true}
        >
          <div className="space-y-6 py-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="live-dot" />
                <span className="font-mono text-xs uppercase tracking-widest text-[var(--teal)]">
                  Agent Concierge Ready
                </span>
              </div>
              <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-[var(--text-primary)]">
                Autonomous Task Dispatch
              </h1>
              <p className="text-sm text-[var(--text-secondary)] leading-relaxed max-w-xl">
                The full interactive task submission interface is being wired up next.
                In the meantime, the underlying pipeline is live: query search, selection,
                live on-chain verification, ed25519 signing, agent execution, AI grading, and 8004 feedback.
              </p>
            </div>

            {/* Simulated terminal command box */}
            <div className="rounded border border-[var(--border-dim)] bg-[var(--void-1)] p-4 font-mono text-xs space-y-2">
              <div className="text-[var(--text-muted)] flex items-center gap-2">
                <span className="text-[var(--purple-bright)]">$</span>
                <span>curl -X POST /api/hire \</span>
              </div>
              <div className="text-[var(--text-secondary)] pl-4">
                -H &quot;Content-Type: application/json&quot; \
              </div>
              <div className="text-[var(--teal)] pl-4">
                -d &apos;&#123;&quot;task&quot;: &quot;check the SOL balance of this wallet: 4FonJM...czCJT&quot;&#125;&apos;
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-4 pt-2">
              <Link href="/" className="btn-primary">
                Return to Landing Page
              </Link>
              <a
                href="https://explorer.solana.com/tx/3J4BSarYm6U8mVCQ8tRGqLeFPTy3uoqCFnrfgDceMWqz1ssvd8z34ntf9etGaqAfgcdLdk1QEGZv4pWuyNxvyHEd?cluster=devnet"
                target="_blank"
                rel="noreferrer"
                className="btn-ghost font-mono text-xs"
              >
                Inspect Live 8004 Tx ↗
              </a>
            </div>
          </div>
        </TerminalCard>
      </div>
    </main>
  );
}
