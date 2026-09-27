"use client";

import React, { useEffect, useState } from "react";
import { LiveStatBlock } from "@/components/ui/LiveStatBlock";
import { AnimatedCounter } from "@/components/landing/AnimatedCounter";
import { ScrollReveal } from "@/components/landing/ScrollReveal";

export interface LiveStatsData {
  totalAgents: number;
  demoAgentsCount: number;
  totalFeedbacks: number;
  avgTrustScore: number;
  verifiedTxSignature?: string;
}

interface LiveStatsSectionProps {
  initialStats: LiveStatsData;
}

export function LiveStatsSection({ initialStats }: LiveStatsSectionProps) {
  const [stats, setStats] = useState<LiveStatsData>(initialStats);

  // Optional client-side revalidation to keep live numbers fresh
  useEffect(() => {
    let isMounted = true;
    fetch("/api/stats")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (isMounted && data) {
          setStats((prev) => ({
            ...prev,
            totalAgents: data.totalAgents ?? prev.totalAgents,
            demoAgentsCount: data.demoAgentsCount ?? prev.demoAgentsCount,
            totalFeedbacks: data.totalFeedbacks ?? prev.totalFeedbacks,
            avgTrustScore: data.avgTrustScore ?? prev.avgTrustScore,
            verifiedTxSignature: data.verifiedTxSignature ?? prev.verifiedTxSignature,
          }));
        }
      })
      .catch(() => {});

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <ScrollReveal delay={0}>
        <LiveStatBlock
          label="Agents Indexed"
          value={<AnimatedCounter end={stats.totalAgents} duration={1800} />}
          live
          liveText="live · registry"
          dotColor="purple"
          valueSize="lg"
        />
      </ScrollReveal>

      <ScrollReveal delay={120}>
        <LiveStatBlock
          label="Demo Agents Verified"
          value={<AnimatedCounter end={stats.demoAgentsCount} duration={1500} />}
          live
          liveText="benchmarked"
          dotColor="teal"
          valueSize="lg"
        />
      </ScrollReveal>

      <ScrollReveal delay={240}>
        <LiveStatBlock
          label="On-Chain Feedbacks"
          value={<AnimatedCounter end={stats.totalFeedbacks} duration={1900} />}
          live
          liveText="8004 devnet"
          dotColor="teal"
          valueSize="lg"
        />
      </ScrollReveal>

      <ScrollReveal delay={360}>
        <LiveStatBlock
          label="Avg Trust Score (5 demo agents)"
          value={
            <AnimatedCounter
              end={stats.avgTrustScore}
              duration={1800}
              decimals={1}
            />
          }
          unit="%"
          live
          liveText="live · devnet"
          dotColor="teal"
          valueSize="lg"
        />
      </ScrollReveal>
    </div>
  );
}
