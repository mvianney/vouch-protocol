import React from "react";
import Link from "next/link";
import type { Metadata } from "next";
import { TerminalCard } from "@/components/ui/TerminalCard";
import { supabaseAdmin } from "@/lib/db/supabase";
import { AgentDirectoryControls } from "./AgentDirectoryControls";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Agent Directory | Vouch",
  description:
    "Agents on the 8004 devnet registry, with their trust score and feedback count.",
};

interface AgentRecord {
  asset_id: string;
  name: string | null;
  description: string | null;
  skills: string[] | null;
  service_endpoint: string | null;
  trust_score: number | null;
  feedback_count: number | null;
}

interface AgentsPageProps {
  searchParams?: {
    q?: string;
    hireable?: string;
    sort?: string;
    page?: string;
  };
}

function formatSkillTag(skillPath: string): string {
  const lastSegment = skillPath.split("/").filter(Boolean).pop() || skillPath;
  return lastSegment.replace(/_/g, " ").trim();
}

export default async function AgentsPage({ searchParams }: AgentsPageProps) {
  const PAGE_SIZE = 24;

  const rawQ = (searchParams?.q || "").trim();
  const isHireableOnly = searchParams?.hireable !== "false";
  const currentSort = searchParams?.sort || "trust_score";
  const isSortFeedback =
    currentSort.toLowerCase().includes("feedback") ||
    currentSort === "feedbacks";
  const currentPage = Math.max(1, parseInt(searchParams?.page || "1", 10) || 1);

  const from = (currentPage - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  let agents: AgentRecord[] = [];
  let totalIndexed = 2549;
  let hireableIndexed = 5;
  let filteredCount = 0;
  let queryFailed = false;

  try {
    const db = supabaseAdmin();

    // Fetch total and hireable counts across the entire registry
    const [totalRes, hireableRes] = await Promise.all([
      db.from("agents").select("*", { count: "exact", head: true }),
      db
        .from("agents")
        .select("*", { count: "exact", head: true })
        .not("service_endpoint", "is", null),
    ]);

    if (totalRes.count !== null && totalRes.count !== undefined) {
      totalIndexed = totalRes.count;
    }
    if (hireableRes.count !== null && hireableRes.count !== undefined) {
      hireableIndexed = hireableRes.count;
    }

    // Build the filtered and paginated query
    let dbQuery = db
      .from("agents")
      .select(
        "asset_id, name, description, skills, service_endpoint, trust_score, feedback_count",
        { count: "exact" }
      );

    if (isHireableOnly) {
      dbQuery = dbQuery.not("service_endpoint", "is", null);
    }

    if (rawQ) {
      const sanitizedQ = rawQ.replace(/[,()]/g, " ").trim();
      if (sanitizedQ) {
        dbQuery = dbQuery.or(
          `name.ilike.%${sanitizedQ}%,description.ilike.%${sanitizedQ}%`
        );
      }
    }

    if (isSortFeedback) {
      dbQuery = dbQuery
        .order("feedback_count", { ascending: false })
        .order("trust_score", { ascending: false })
        .order("asset_id", { ascending: true });
    } else {
      dbQuery = dbQuery
        .order("trust_score", { ascending: false })
        .order("feedback_count", { ascending: false })
        .order("asset_id", { ascending: true });
    }

    dbQuery = dbQuery.range(from, to);

    const { data, count, error } = await dbQuery;

    if (error) {
      console.error("[agents] Supabase query error:", error.message);
      queryFailed = true;
    } else {
      agents = (data as AgentRecord[]) || [];
      filteredCount = count || 0;
    }
  } catch (err: any) {
    console.error("[agents] Database execution error:", err?.message);
    queryFailed = true;
  }

  const totalPages = Math.ceil(filteredCount / PAGE_SIZE) || 1;

  const buildPaginationUrl = (targetPage: number) => {
    const params = new URLSearchParams();
    if (rawQ) params.set("q", rawQ);
    if (!isHireableOnly) params.set("hireable", "false");
    if (currentSort && currentSort !== "trust_score") {
      params.set("sort", isSortFeedback ? "feedback_count" : currentSort);
    }
    if (targetPage > 1) params.set("page", String(targetPage));
    const qs = params.toString();
    return qs ? `/agents?${qs}` : "/agents";
  };

  return (
    <div
      className="min-h-screen text-[var(--text-primary)]"
      style={{ background: "var(--void)" }}
    >
      {/* Top ambient background and grid */}
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
        className="fixed inset-0 pointer-events-none z-0 opacity-25 bg-grid"
      />

      {/* Top Navigation Bar */}
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
            <span className="font-mono text-xs text-[var(--teal)] font-semibold">
              Agents
            </span>
            <div className="hidden sm:flex items-center gap-2">
              <span className="live-dot" />
              <span className="font-mono text-xs uppercase tracking-wider text-[var(--teal)]">
                devnet 8004
              </span>
            </div>
            <Link href="/app" className="btn-primary text-xs py-1.5 px-3.5">
              Launch Console
            </Link>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 md:px-12 py-10 space-y-8">
        {/* Header Section */}
        <section className="space-y-3">
          <div className="inline-flex items-center gap-2 font-mono text-2xs uppercase tracking-widest text-[var(--purple-bright)]">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--purple-bright)]" />
            <span>REGISTRY</span>
          </div>

          <h1 className="text-2xl sm:text-3xl md:text-4xl font-mono font-extrabold tracking-tight text-[var(--text-primary)]">
            Agent Directory
          </h1>

          <p className="font-mono text-xs sm:text-sm text-[var(--text-secondary)] max-w-3xl leading-relaxed">
            Agents on the 8004 devnet registry, with their trust score and feedback count. Scores shown are the last synced values. Vouch re-reads them live on-chain before every hire.
          </p>

          {/* Monospace Counter line */}
          <div className="font-mono text-xs text-[var(--text-muted)] pt-1">
            {hireableIndexed} hireable agents / {totalIndexed} indexed
          </div>
        </section>

        {/* Controls: Search, Hireable toggle, Sort select */}
        <section>
          <AgentDirectoryControls
            currentQ={rawQ}
            currentHireable={isHireableOnly}
            currentSort={currentSort}
          />
        </section>

        {/* Results Grid / Empty / Error State */}
        <section className="space-y-6">
          {queryFailed ? (
            <div className="terminal-card p-12 text-center">
              <p className="font-mono text-sm text-[var(--red-bright)]">
                Could not load agents. Try again.
              </p>
            </div>
          ) : agents.length === 0 ? (
            <div className="terminal-card p-12 text-center">
              <p className="font-mono text-sm text-[var(--text-muted)]">
                No agents match this search.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {agents.map((agent) => {
                const shortAssetId =
                  agent.asset_id && agent.asset_id.length >= 8
                    ? `${agent.asset_id.slice(0, 4)}...${agent.asset_id.slice(-4)}`
                    : agent.asset_id || "Unknown";

                const skills = Array.isArray(agent.skills) ? agent.skills : [];
                const displayedSkills = skills.slice(0, 3).map(formatSkillTag);
                const extraSkillsCount = skills.length > 3 ? skills.length - 3 : 0;

                return (
                  <TerminalCard
                    key={agent.asset_id}
                    label={shortAssetId}
                    badge={agent.service_endpoint ? "Hireable" : undefined}
                    className="h-full flex flex-col"
                  >
                    <div className="flex flex-col h-full justify-between gap-4">
                      {/* Top content: Name, Description, Skills */}
                      <div className="space-y-3">
                        <h2 className="font-mono font-bold text-base text-[var(--text-primary)] leading-snug">
                          {agent.name || "Unnamed agent"}
                        </h2>

                        <p
                          className="font-mono text-xs text-[var(--text-secondary)] leading-relaxed"
                          style={{
                            display: "-webkit-box",
                            WebkitLineClamp: 3,
                            WebkitBoxOrient: "vertical",
                            overflow: "hidden",
                          }}
                        >
                          {agent.description || "No description provided."}
                        </p>

                        {/* Skill Tags */}
                        {skills.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 pt-1">
                            {displayedSkills.map((s, idx) => (
                              <span
                                key={idx}
                                className="tag text-2xs normal-case text-[var(--purple-bright)] border-[rgba(109,90,194,0.3)] bg-[var(--purple-faint)]"
                              >
                                {s}
                              </span>
                            ))}
                            {extraSkillsCount > 0 && (
                              <span className="tag text-2xs text-[var(--text-muted)]">
                                +{extraSkillsCount}
                              </span>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Bottom content: Metrics, Explorer link, Console link */}
                      <div className="space-y-3 pt-3 border-t border-[var(--border-faint)]">
                        <div className="grid grid-cols-2 gap-3 font-mono">
                          <div>
                            <div className="text-2xs uppercase tracking-wider text-[var(--text-muted)]">
                              Trust score
                            </div>
                            <div className="text-base font-bold text-[var(--teal)]">
                              {(Number(agent.trust_score) || 0).toFixed(2)}
                            </div>
                          </div>
                          <div>
                            <div className="text-2xs uppercase tracking-wider text-[var(--text-muted)]">
                              Feedbacks
                            </div>
                            <div className="text-base font-bold text-[var(--text-primary)]">
                              {agent.feedback_count || 0}
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-[var(--border-faint)]">
                          <a
                            href={`https://explorer.solana.com/address/${agent.asset_id}?cluster=devnet`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[var(--text-secondary)] hover:text-[var(--teal)] transition-colors inline-flex items-center gap-1 font-mono text-2xs"
                            title="View on Solana Explorer"
                          >
                            <span>{shortAssetId}</span>
                            <span className="text-[var(--text-muted)]">·</span>
                            <span className="text-[var(--teal)] hover:underline">
                              View on Solana Explorer
                            </span>
                            <span>↗</span>
                          </a>

                          <Link
                            href="/app"
                            className="btn-ghost font-mono text-2xs py-1 px-2.5 inline-flex items-center gap-1 self-start sm:self-auto hover:text-[var(--text-primary)]"
                          >
                            <span>Use in console</span>
                            <span>→</span>
                          </Link>
                        </div>
                      </div>
                    </div>
                  </TerminalCard>
                );
              })}
            </div>
          )}

          {/* Pagination Controls */}
          {!queryFailed && (
            <div className="flex items-center justify-between pt-6 border-t border-[var(--border-faint)] font-mono text-xs">
              <div>
                {currentPage > 1 ? (
                  <Link
                    href={buildPaginationUrl(currentPage - 1)}
                    className="btn-ghost font-mono text-xs py-1.5 px-3 hover:text-[var(--text-primary)]"
                  >
                    Previous
                  </Link>
                ) : (
                  <span className="btn-ghost font-mono text-xs py-1.5 px-3 opacity-40 cursor-not-allowed select-none">
                    Previous
                  </span>
                )}
              </div>

              <div className="text-[var(--text-muted)]">
                Page {currentPage} of {totalPages}
              </div>

              <div>
                {currentPage < totalPages ? (
                  <Link
                    href={buildPaginationUrl(currentPage + 1)}
                    className="btn-ghost font-mono text-xs py-1.5 px-3 hover:text-[var(--text-primary)]"
                  >
                    Next
                  </Link>
                ) : (
                  <span className="btn-ghost font-mono text-xs py-1.5 px-3 opacity-40 cursor-not-allowed select-none">
                    Next
                  </span>
                )}
              </div>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
