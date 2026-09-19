import { TerminalCard } from "@/components/ui/TerminalCard";
import { LiveStatBlock } from "@/components/ui/LiveStatBlock";
import { ComparisonTable } from "@/components/ui/ComparisonTable";
import { SectionMarker } from "@/components/ui/SectionMarker";

// ─── Demo data ────────────────────────────────────────────────────────────────

const compareRows = [
  {
    label: "Latency",
    before: "1,240 ms",
    after: "312 ms",
    delta: "75.8%",
    direction: "pos" as const,
  },
  {
    label: "Trust Score",
    before: "71.2",
    after: "98.4",
    delta: "27.2",
    direction: "pos" as const,
  },
  {
    label: "Cost",
    before: "0.0042 SOL",
    after: "0.0061 SOL",
    delta: "0.0019",
    direction: "neg" as const,
  },
  {
    label: "Tasks completed",
    before: "18",
    after: "31",
    delta: "13",
    direction: "pos" as const,
  },
  {
    label: "Error rate",
    before: "4.2%",
    after: "0.8%",
    delta: "3.4%",
    direction: "pos" as const,
  },
];

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DesignSystemDemo() {
  return (
    <main
      className="min-h-screen py-20 px-6 md:px-12 lg:px-24 max-w-6xl mx-auto"
      style={{ background: "var(--void)" }}
    >
      {/* ── Top radial glow ───────────────────────────────────────────────── */}
      <div
        aria-hidden
        className="fixed inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 60% 40% at 50% -5%, rgba(109,90,194,0.15) 0%, transparent 65%)",
        }}
      />

      {/* ── Wordmark ──────────────────────────────────────────────────────── */}
      <header className="mb-24">
        <div className="flex items-baseline gap-4">
          <h1
            className="text-6xl font-extrabold tracking-tight glow-purple"
            style={{ color: "var(--text-primary)" }}
          >
            Vouch
          </h1>
          <span
            className="font-mono text-sm"
            style={{ color: "var(--text-muted)" }}
          >
            design-system · v0.1
          </span>
        </div>
        <p className="mt-3 text-lg" style={{ color: "var(--text-secondary)" }}>
          AI Concierge — Solana Agent Registry
        </p>

        {/* Tags */}
        <div className="flex flex-wrap gap-2 mt-6">
          <span className="tag-purple">mainnet-beta</span>
          <span className="tag-teal">verified registry</span>
          <span className="tag">next.js 14</span>
          <span className="tag">typescript</span>
        </div>
      </header>

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* SECTION 01 — Terminal Cards                                         */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      <section className="relative overflow-visible mb-28">
        <SectionMarker number="01" />

        <div className="relative z-10">
          <p
            className="font-mono text-2xs uppercase tracking-widest mb-2"
            style={{ color: "var(--text-muted)" }}
          >
            component
          </p>
          <h2
            className="text-3xl font-bold mb-10"
            style={{ color: "var(--text-primary)" }}
          >
            Terminal Cards
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Basic agent card */}
            <TerminalCard label="agent.search · devnet" badge="devnet">
              <div className="space-y-4">
                <div>
                  <p className="stat-label mb-1">Agent ID</p>
                  <p className="mono-address">
                    VCH_a7f3...9d2b
                  </p>
                </div>
                <div>
                  <p className="stat-label mb-1">Pubkey</p>
                  <p className="mono-hash">
                    7xKpR4mN2QdF8sLj1bWnC3vYtU6eA9oP0hMzIqXgEfBk
                  </p>
                </div>
                <div className="flex items-center gap-3 pt-1">
                  <span className="tag-teal">verified</span>
                  <span className="tag-purple">registered</span>
                </div>
              </div>
            </TerminalCard>

            {/* Transaction card */}
            <TerminalCard
              label="tx.confirm · mainnet-beta"
              badge="confirmed"
              showDots={true}
            >
              <div className="space-y-4">
                <div>
                  <p className="stat-label mb-1">Signature</p>
                  <p className="mono-hash">
                    5KJz8mFQx2RpN4vLwB7cYeH1tUgO3iDnA6sPkCqXmWrJ...
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="stat-label mb-1">Fee</p>
                    <p className="font-mono text-sm" style={{ color: "var(--text-primary)" }}>
                      0.000005 SOL
                    </p>
                  </div>
                  <div>
                    <p className="stat-label mb-1">Slot</p>
                    <p className="font-mono text-sm" style={{ color: "var(--text-primary)" }}>
                      294,481,102
                    </p>
                  </div>
                </div>
              </div>
            </TerminalCard>

            {/* Full-width code-style card */}
            <TerminalCard
              label="agent.manifest · v1.2.0"
              badge="JSON"
              className="md:col-span-2"
            >
              <pre
                className="font-mono text-xs leading-relaxed overflow-x-auto"
                style={{ color: "var(--text-secondary)" }}
              >
                <span style={{ color: "var(--text-muted)" }}>{"{"}</span>{"\n"}
                {"  "}<span style={{ color: "var(--purple-bright)" }}>&quot;name&quot;</span>
                {": "}<span style={{ color: "var(--teal)" }}>&quot;vouch-search-agent&quot;</span>{",\n"}
                {"  "}<span style={{ color: "var(--purple-bright)" }}>&quot;version&quot;</span>
                {": "}<span style={{ color: "var(--teal)" }}>&quot;1.2.0&quot;</span>{",\n"}
                {"  "}<span style={{ color: "var(--purple-bright)" }}>&quot;capabilities&quot;</span>
                {": ["}<span style={{ color: "var(--teal)" }}>&quot;search&quot;</span>
                {", "}<span style={{ color: "var(--teal)" }}>&quot;rank&quot;</span>
                {", "}<span style={{ color: "var(--teal)" }}>&quot;verify&quot;</span>{"]\n"}
                {"  "}<span style={{ color: "var(--purple-bright)" }}>&quot;trustScore&quot;</span>
                {": "}<span style={{ color: "var(--text-primary)" }}>98.4</span>{"\n"}
                <span style={{ color: "var(--text-muted)" }}>{"}"}</span>
              </pre>
            </TerminalCard>
          </div>
        </div>
      </section>

      <div className="vouch-divider" />

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* SECTION 02 — Live Stat Blocks                                       */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      <section className="relative overflow-visible mb-28">
        <SectionMarker number="02" />

        <div className="relative z-10">
          <p
            className="font-mono text-2xs uppercase tracking-widest mb-2"
            style={{ color: "var(--text-muted)" }}
          >
            component
          </p>
          <h2
            className="text-3xl font-bold mb-10"
            style={{ color: "var(--text-primary)" }}
          >
            Live Stat Blocks
          </h2>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <LiveStatBlock
              label="Trust Score"
              value="98.4"
              live
              liveText="live · 2s"
              dotColor="teal"
              valueSize="lg"
            />
            <LiveStatBlock
              label="Agents Online"
              value="1,284"
              live
              liveText="live · registry"
              dotColor="purple"
            />
            <LiveStatBlock
              label="Avg Latency"
              value="312"
              unit="ms"
              live
              liveText="rolling 60s"
            />
            <LiveStatBlock
              label="Network"
              value="TPS: 4.2k"
              live={false}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <LiveStatBlock
              label="SOL Balance"
              value="24.881"
              unit="SOL"
              live
              liveText="mainnet-beta"
              dotColor="teal"
              valueSize="md"
            />
            <LiveStatBlock
              label="Jobs Dispatched"
              value="18,304"
              live
              liveText="since epoch 742"
              dotColor="purple"
            />
            <LiveStatBlock
              label="Error Rate"
              value="0.8"
              unit="%"
              live
              liveText="p99 window"
              dotColor="teal"
            />
          </div>
        </div>
      </section>

      <div className="vouch-divider" />

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* SECTION 03 — Comparison Table                                       */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      <section className="relative overflow-visible mb-28">
        <SectionMarker number="03" />

        <div className="relative z-10">
          <p
            className="font-mono text-2xs uppercase tracking-widest mb-2"
            style={{ color: "var(--text-muted)" }}
          >
            component
          </p>
          <h2
            className="text-3xl font-bold mb-10"
            style={{ color: "var(--text-primary)" }}
          >
            Comparison Table
          </h2>

          <ComparisonTable
            headers={{ label: "Metric", before: "Baseline", after: "Vouch", delta: "Δ" }}
            rows={compareRows}
          />
        </div>
      </section>

      <div className="vouch-divider" />

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* SECTION 04 — Tokens & Typography                                    */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      <section className="relative overflow-visible mb-28">
        <SectionMarker number="04" />

        <div className="relative z-10">
          <p
            className="font-mono text-2xs uppercase tracking-widest mb-2"
            style={{ color: "var(--text-muted)" }}
          >
            design tokens
          </p>
          <h2
            className="text-3xl font-bold mb-10"
            style={{ color: "var(--text-primary)" }}
          >
            Colour &amp; Typography
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
            {/* Colour swatches */}
            <div>
              <p className="stat-label mb-4">Palette</p>
              <div className="space-y-2">
                {[
                  { name: "--void",          hex: "#0a0a0f", cls: "bg-[#0a0a0f] border border-[rgba(109,90,194,0.2)]" },
                  { name: "--void-3",        hex: "#181827", cls: "bg-[#181827] border border-[rgba(109,90,194,0.2)]" },
                  { name: "--purple-muted",  hex: "#4338ca", cls: "bg-[#4338ca]" },
                  { name: "--purple",        hex: "#6d5ac2", cls: "bg-[#6d5ac2]" },
                  { name: "--purple-bright", hex: "#8b73e0", cls: "bg-[#8b73e0]" },
                  { name: "--teal",          hex: "#2dd4bf", cls: "bg-[#2dd4bf]" },
                  { name: "--red",           hex: "#ef4444", cls: "bg-[#ef4444]" },
                ].map((swatch) => (
                  <div key={swatch.name} className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-md shrink-0 ${swatch.cls}`} />
                    <span className="font-mono text-xs" style={{ color: "var(--text-muted)" }}>
                      {swatch.name}
                    </span>
                    <span className="font-mono text-xs ml-auto" style={{ color: "var(--text-dim)" }}>
                      {swatch.hex}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Typography specimens */}
            <div className="space-y-8">
              <div>
                <p className="stat-label mb-3">Sans — Inter (headlines, UI)</p>
                <p className="text-4xl font-extrabold" style={{ color: "var(--text-primary)" }}>
                  Hire AI Agents
                </p>
                <p className="text-lg font-semibold mt-1" style={{ color: "var(--text-secondary)" }}>
                  On-chain agent registry
                </p>
                <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
                  Body text, labels, descriptions
                </p>
              </div>

              <div>
                <p className="stat-label mb-3">Mono — JetBrains Mono (all data)</p>
                <p className="font-mono text-3xl font-bold" style={{ color: "var(--teal)" }}>
                  98.4
                </p>
                <p className="font-mono text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
                  7xKpR4mN2QdF8sLj1bWnC3vY
                </p>
                <p className="font-mono text-xs mt-1" style={{ color: "var(--text-muted)" }}>
                  tx · 5KJz8mFQx2RpN4vLwB7cYeH1tUgO3i...
                </p>
              </div>

              <div>
                <p className="stat-label mb-3">Buttons</p>
                <div className="flex flex-wrap gap-3">
                  <button className="btn-primary">Hire Agent</button>
                  <button className="btn-ghost">View Registry</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ────────────────────────────────────────────────────────── */}
      <footer className="pt-4 pb-12">
        <div className="flex items-center justify-between">
          <span className="font-mono text-2xs" style={{ color: "var(--text-dim)" }}>
            vouch · design-system · scaffold
          </span>
          <span className="tag-purple">v0.1.0</span>
        </div>
      </footer>
    </main>
  );
}
