"use client";

import { useCallback, useEffect, useState } from "react";
import { AlertBanner, PageHeader, StatCard } from "@/components/ui";

type Stats = {
  students: number;
  tests: number;
  candidates: number;
  emailSent: number;
  emailPending: number;
  scored: number;
  submissions: number;
  scoringQueued: number;
  scoringRunning: number;
};

export default function HomePage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/overview", { cache: "no-store" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to load metrics");
      setStats(json.stats);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load metrics");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const id = window.setInterval(load, 15000);
    return () => window.clearInterval(id);
  }, [load]);

  const value = (n: number | undefined) => (loading && !stats ? "—" : (n ?? 0));

  return (
    <main>
      <PageHeader
        eyebrow="Home"
        title="Metrics"
        description="Tests, emails, submissions, and scores."
        actions={
          <button
            type="button"
            onClick={load}
            className="rounded-lg border border-[var(--line)] bg-white px-3 py-2 text-sm hover:bg-stone-50"
          >
            Refresh
          </button>
        }
      />

      {error && <AlertBanner tone="error">{error}</AlertBanner>}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard label="Tests" value={value(stats?.tests)} />
        <StatCard
          label="Candidates"
          value={value(stats?.candidates)}
          hint={`${stats?.emailSent ?? 0} emailed · ${stats?.emailPending ?? 0} pending`}
        />
        <StatCard
          label="Scored"
          value={value(stats?.scored)}
          hint={`${stats?.submissions ?? 0} ZIPs · ${stats?.scoringQueued ?? 0} queued · ${stats?.scoringRunning ?? 0} running`}
        />
      </div>
    </main>
  );
}
