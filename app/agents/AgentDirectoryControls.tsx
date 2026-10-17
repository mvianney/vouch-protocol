"use client";

import React, { useState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";

interface AgentDirectoryControlsProps {
  currentQ: string;
  currentHireable: boolean;
  currentSort: string;
}

export function AgentDirectoryControls({
  currentQ,
  currentHireable,
  currentSort,
}: AgentDirectoryControlsProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [searchValue, setSearchValue] = useState(currentQ);

  useEffect(() => {
    setSearchValue(currentQ);
  }, [currentQ]);

  const sortValue =
    currentSort === "feedback_count" || currentSort === "feedbacks"
      ? "feedback_count"
      : "trust_score";

  const navigateWith = (params: { q?: string; hireable?: boolean; sort?: string }) => {
    const q = params.q !== undefined ? params.q : searchValue;
    const hireable = params.hireable !== undefined ? params.hireable : currentHireable;
    const sort = params.sort !== undefined ? params.sort : sortValue;

    const urlParams = new URLSearchParams();
    if (q && q.trim()) {
      urlParams.set("q", q.trim());
    }
    if (!hireable) {
      urlParams.set("hireable", "false");
    }
    if (sort && sort !== "trust_score") {
      urlParams.set("sort", sort);
    }

    const queryString = urlParams.toString();
    const targetUrl = queryString ? `/agents?${queryString}` : "/agents";

    startTransition(() => {
      router.push(targetUrl);
    });
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    navigateWith({ q: searchValue });
  };

  const handleToggleHireable = () => {
    navigateWith({ hireable: !currentHireable });
  };

  const handleSortChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    navigateWith({ sort: e.target.value });
  };

  return (
    <form
      onSubmit={handleSearchSubmit}
      method="GET"
      action="/agents"
      className="terminal-card p-4 md:p-5"
    >
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Search input box */}
        <div className="relative flex-1">
          <input
            type="text"
            name="q"
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            placeholder="Search by name or description"
            className="w-full bg-[var(--void-3)] border border-[var(--border-dim)] focus:border-[var(--purple)] rounded px-3.5 py-2 font-mono text-xs text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none transition-colors"
          />
        </div>

        {/* Controls right group: Hireable toggle + Sort dropdown + Submit button */}
        <div className="flex flex-wrap items-center gap-4 sm:gap-6 justify-between lg:justify-end">
          {/* Hireable only toggle */}
          <button
            type="button"
            onClick={handleToggleHireable}
            className="flex items-center gap-2.5 font-mono text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer select-none transition-colors"
            role="switch"
            aria-checked={currentHireable}
          >
            <div
              className={`w-8 h-4 rounded-full transition-colors relative ${
                currentHireable
                  ? "bg-[var(--teal-dim)] border border-[var(--teal)]"
                  : "bg-[var(--void-3)] border border-[var(--border-dim)]"
              }`}
            >
              <div
                className={`w-2.5 h-2.5 rounded-full absolute top-[2px] transition-transform ${
                  currentHireable
                    ? "bg-[var(--teal-bright)] left-[17px]"
                    : "bg-[var(--text-muted)] left-[3px]"
                }`}
              />
            </div>
            <span>Hireable only</span>
          </button>

          {/* Hidden input to support native form submit fallback if needed */}
          {!currentHireable && (
            <input type="hidden" name="hireable" value="false" />
          )}

          {/* Sort select */}
          <div className="flex items-center gap-2">
            <label htmlFor="agent-sort" className="font-mono text-xs text-[var(--text-muted)]">
              Sort:
            </label>
            <select
              id="agent-sort"
              name="sort"
              value={sortValue}
              onChange={handleSortChange}
              className="bg-[var(--void-3)] border border-[var(--border-dim)] text-[var(--text-primary)] rounded px-3 py-1.5 font-mono text-xs focus:outline-none focus:border-[var(--purple)] cursor-pointer"
            >
              <option value="trust_score">Trust score</option>
              <option value="feedback_count">Feedback count</option>
            </select>
          </div>

          {/* Search action button */}
          <button
            type="submit"
            disabled={isPending}
            className="btn-primary text-xs py-1.5 px-3.5 font-mono"
          >
            {isPending ? "Filtering..." : "Search"}
          </button>
        </div>
      </div>
    </form>
  );
}
