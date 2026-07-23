"use client";

import { useCallback, useEffect, useState, Fragment } from "react";
import Link from "next/link";
import { AlertBanner, PageHeader, Panel, StatCard, StatusPill } from "@/components/ui";

type CriterionResult = {
  criterion?: string;
  status?: string;
  score?: number;
  detail?: string;
  evidence_paths?: string[];
};

type ScoreIssue = {
  severity?: string;
  category?: string;
  path?: string;
  issue?: string;
  fix?: string;
};

type SubmissionRow = {
  id: string;
  name: string;
  email: string;
  status: string;
  originalFilename: string;
  filesExtracted: number;
  filesSentToModel: number;
  filesSentPaths?: string[];
  score?: number;
  feedback?: string;
  summary?: string;
  criteriaResults?: CriterionResult[];
  scoreBreakdown?: Record<string, { score?: number; weight?: number; comments?: string }>;
  issues?: ScoreIssue[];
  scoreMetadata?: {
    files_used_in_prompt?: number;
    grading_status?: string;
    cache_hit?: boolean;
    truncated?: boolean;
  };
  error?: string;
  testId: string;
  testTitle: string;
  testCandidateId: string;
  updatedAt: string;
};

type QueueResponse = {
  summary: {
    email: { running: number; waiting: number; failed: number };
    scoring: {
      running: number;
      queued: number;
      failed: number;
      completed?: number;
      zipsTotal?: number;
      filesExtracted?: number;
      filesSentToModel?: number;
    };
  };
  jobs: {
    id: string;
    type: string;
    label: string;
    status: string;
    detail?: string;
  }[];
  submissions?: SubmissionRow[];
  polledAt: string;
};

export default function QueuePage() {
  const [data, setData] = useState<QueueResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [reevaluatingId, setReevaluatingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await fetch("/api/queue", { cache: "no-store" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to load queue");
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load queue");
    } finally {
      setLoading(false);
    }
  }, []);

  const tick = useCallback(async () => {
    try {
      await fetch("/api/queue/process", { method: "POST" });
    } catch {
      // ignore process errors; status poll still useful
    }
    await load();
  }, [load]);

  useEffect(() => {
    if (reevaluatingId) return;
    tick();
    const id = window.setInterval(tick, 5000);
    return () => window.clearInterval(id);
  }, [tick, reevaluatingId]);

  async function reevaluate(submissionId: string) {
    setReevaluatingId(submissionId);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch("/api/queue/reevaluate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ submissionId }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Reevaluate failed");
      const score = json.submission?.score;
      setMessage(
        typeof score === "number"
          ? `Reevaluated — score ${score}`
          : "Reevaluate finished."
      );
      setExpandedId(submissionId);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Reevaluate failed");
      await load();
    } finally {
      setReevaluatingId(null);
    }
  }

  const activeJobs = data?.jobs || [];
  const submissions = data?.submissions || [];

  return (
    <main>
      <PageHeader
        eyebrow="Queue"
        title="Submissions & scores"
        description="Every ZIP upload, extract/score status, and model feedback. Auto-advances every 5s."
        actions={
          <div className="flex gap-2">
            <Link
              href="/tests"
              className="rounded-lg bg-[var(--accent)] px-3 py-2 text-sm text-white hover:bg-[var(--accent-dark)]"
            >
              Tests
            </Link>
            <button
              type="button"
              onClick={tick}
              className="rounded-lg border border-[var(--line)] bg-white px-3 py-2 text-sm hover:bg-stone-50"
            >
              Process now
            </button>
          </div>
        }
      />

      {error && <AlertBanner tone="error">{error}</AlertBanner>}
      {message && !error && <AlertBanner tone="success">{message}</AlertBanner>}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="ZIPs submitted"
          value={data?.summary.scoring.zipsTotal ?? (loading ? "—" : 0)}
        />
        <StatCard
          label="Completed"
          value={data?.summary.scoring.completed ?? (loading ? "—" : 0)}
        />
        <StatCard
          label="Failed"
          value={data?.summary.scoring.failed ?? (loading ? "—" : 0)}
        />
        <StatCard
          label="In progress"
          value={
            (data?.summary.scoring.running ?? 0) + (data?.summary.scoring.queued ?? 0) ||
            (loading ? "—" : 0)
          }
          hint={
            data?.polledAt
              ? `Updated ${new Date(data.polledAt).toLocaleTimeString()}`
              : undefined
          }
        />
      </div>

      {activeJobs.length > 0 && (
        <Panel title="Currently processing" className="mt-6">
          <ul className="space-y-3">
            {activeJobs.map((job) => (
              <li
                key={`${job.type}-${job.id}`}
                className="flex flex-wrap items-start justify-between gap-2 rounded-xl border border-[var(--line)] bg-white p-4"
              >
                <div>
                  <p className="font-medium">{job.label}</p>
                  {job.detail && (
                    <p className="mt-1 text-sm text-[var(--muted)]">{job.detail}</p>
                  )}
                </div>
                <StatusPill status={job.status} />
              </li>
            ))}
          </ul>
        </Panel>
      )}

      <Panel title="All submissions" className="mt-6">
        {!submissions.length ? (
          <div className="py-6 text-center">
            <p className="m-0 text-sm text-[var(--muted)]">
              No ZIP submissions yet.
            </p>
            <p className="mt-2 mb-0 text-sm text-[var(--muted)]">
              Open a test, email candidates the submit link, then they upload a ZIP.
              Scores appear here after extract → model scoring.
            </p>
            <Link
              href="/tests"
              className="mt-4 inline-flex rounded-lg bg-[var(--accent)] px-3 py-2 text-sm text-white hover:bg-[var(--accent-dark)]"
            >
              Go to Tests
            </Link>
          </div>
        ) : (
          <div className="overflow-auto">
            <table className="w-full min-w-[52rem] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-[var(--line)] text-[var(--muted)]">
                  <th className="py-2 pr-3 font-medium">Candidate</th>
                  <th className="py-2 pr-3 font-medium">Test</th>
                  <th className="py-2 pr-3 font-medium">ZIP</th>
                  <th className="py-2 pr-3 font-medium">Status</th>
                  <th className="py-2 pr-3 font-medium">Score</th>
                  <th className="py-2 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {submissions.map((s) => {
                  const open = expandedId === s.id;
                  return (
                    <Fragment key={s.id}>
                      <tr className="border-b border-[var(--line)] align-top">
                        <td className="py-2.5 pr-3">
                          <p className="m-0 font-medium">{s.name}</p>
                          <p className="m-0 text-xs text-[var(--muted)]">{s.email}</p>
                        </td>
                        <td className="py-2.5 pr-3">
                          <Link
                            href={`/tests/${s.testId}`}
                            className="text-[var(--accent)] hover:underline"
                          >
                            {s.testTitle}
                          </Link>
                        </td>
                        <td className="max-w-[12rem] break-all py-2.5 pr-3 text-xs text-[var(--muted)]">
                          {s.originalFilename}
                          <span className="mt-1 block">
                            {s.filesExtracted} files · {s.filesSentToModel} sent
                          </span>
                        </td>
                        <td className="py-2.5 pr-3">
                          <StatusPill status={s.status} />
                          {s.error && (
                            <p className="mt-1 text-xs text-[var(--danger)]">{s.error}</p>
                          )}
                        </td>
                        <td className="py-2.5 pr-3">
                          {typeof s.score === "number" ? (
                            <span className="font-[family-name:var(--font-display)] text-lg font-bold text-red-600">
                              {s.score}
                            </span>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td className="py-2.5">
                          <div className="flex flex-wrap gap-2">
                            {(s.feedback ||
                              s.error ||
                              (s.criteriaResults && s.criteriaResults.length > 0) ||
                              (s.issues && s.issues.length > 0)) && (
                              <button
                                type="button"
                                onClick={() => setExpandedId(open ? null : s.id)}
                                className="rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                              >
                                {open ? "Hide details" : "View details"}
                              </button>
                            )}
                            {(s.status === "failed" || s.status === "completed") && (
                              <button
                                type="button"
                                disabled={Boolean(reevaluatingId)}
                                onClick={() => reevaluate(s.id)}
                                className="rounded-lg border border-teal-300 px-2.5 py-1.5 text-xs font-semibold text-teal-800 hover:bg-teal-50 disabled:opacity-50"
                              >
                                {reevaluatingId === s.id ? "Reevaluating…" : "Reevaluate"}
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                      {open && (
                        <tr className="border-b border-[var(--line)] bg-stone-50/80">
                          <td colSpan={6} className="px-4 py-4">
                            <div className="grid gap-4 lg:grid-cols-2">
                              <div>
                                <p className="m-0 mb-2 text-xs font-semibold tracking-wide text-slate-500 uppercase">
                                  Criteria results
                                </p>
                                {s.criteriaResults && s.criteriaResults.length > 0 ? (
                                  <ul className="m-0 space-y-2 p-0 list-none">
                                    {s.criteriaResults.map((c, i) => {
                                      const status = String(c.status || "?").toLowerCase();
                                      const tone =
                                        status === "met"
                                          ? "bg-emerald-50 text-emerald-800 ring-emerald-200"
                                          : status === "partial"
                                            ? "bg-amber-50 text-amber-900 ring-amber-200"
                                            : "bg-red-50 text-red-800 ring-red-200";
                                      return (
                                        <li
                                          key={`${c.criterion}-${i}`}
                                          className="rounded-xl border border-slate-200 bg-white p-3"
                                        >
                                          <div className="flex flex-wrap items-center gap-2">
                                            <span
                                              className={`rounded-full px-2 py-0.5 text-[0.65rem] font-bold uppercase ring-1 ${tone}`}
                                            >
                                              {c.status || "?"}
                                            </span>
                                            {typeof c.score === "number" && (
                                              <span className="text-xs text-slate-500">
                                                {c.score}
                                              </span>
                                            )}
                                          </div>
                                          <p className="mt-1 mb-0 text-sm font-medium text-slate-800">
                                            {c.criterion || "Criterion"}
                                          </p>
                                          {c.detail && (
                                            <p className="mt-1 mb-0 text-xs text-slate-600">
                                              {c.detail}
                                            </p>
                                          )}
                                          {c.evidence_paths && c.evidence_paths.length > 0 && (
                                            <p className="mt-1 mb-0 font-mono text-[0.7rem] text-slate-500">
                                              {c.evidence_paths.join(", ")}
                                            </p>
                                          )}
                                        </li>
                                      );
                                    })}
                                  </ul>
                                ) : (
                                  <p className="m-0 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                                    No criteria_results returned. Don’t trust this score until
                                    every acceptance line is covered.
                                  </p>
                                )}
                              </div>

                              <div>
                                <p className="m-0 mb-2 text-xs font-semibold tracking-wide text-slate-500 uppercase">
                                  Issues
                                </p>
                                {s.issues && s.issues.length > 0 ? (
                                  <ul className="m-0 space-y-2 p-0 list-none">
                                    {s.issues.map((issue, i) => (
                                      <li
                                        key={`${issue.path}-${i}`}
                                        className="rounded-xl border border-slate-200 bg-white p-3 text-sm"
                                      >
                                        <p className="m-0 font-semibold text-slate-800">
                                          [{issue.severity || "info"}]{" "}
                                          {issue.path || "file"}
                                        </p>
                                        <p className="mt-1 mb-0 text-slate-700">
                                          {issue.issue}
                                        </p>
                                        {issue.fix && (
                                          <p className="mt-1 mb-0 text-xs text-slate-500">
                                            Fix: {issue.fix}
                                          </p>
                                        )}
                                      </li>
                                    ))}
                                  </ul>
                                ) : (
                                  <p className="m-0 text-sm text-slate-500">No structured issues.</p>
                                )}

                                {s.scoreBreakdown && (
                                  <div className="mt-4">
                                    <p className="m-0 mb-2 text-xs font-semibold tracking-wide text-slate-500 uppercase">
                                      Breakdown
                                    </p>
                                    <ul className="m-0 space-y-2 p-0 list-none">
                                      {Object.entries(s.scoreBreakdown).map(([key, val]) => (
                                        <li
                                          key={key}
                                          className="rounded-xl border border-slate-200 bg-white p-3 text-sm"
                                        >
                                          <span className="font-semibold capitalize">{key}</span>
                                          {typeof val?.score === "number" && (
                                            <span className="ml-2 font-bold text-slate-900">
                                              {val.score}
                                            </span>
                                          )}
                                          {val?.comments && (
                                            <p className="mt-1 mb-0 text-xs text-slate-600">
                                              {val.comments}
                                            </p>
                                          )}
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                )}
                              </div>
                            </div>

                            {(s.filesSentPaths?.length || s.scoreMetadata) && (
                              <p className="mt-4 mb-0 text-xs text-slate-500">
                                Files sent: {(s.filesSentPaths || []).join(", ") || "—"}
                                {s.scoreMetadata?.files_used_in_prompt != null &&
                                  ` · used in prompt: ${s.scoreMetadata.files_used_in_prompt}`}
                                {s.scoreMetadata?.grading_status &&
                                  ` · status: ${s.scoreMetadata.grading_status}`}
                                {s.scoreMetadata?.cache_hit != null &&
                                  ` · cache: ${s.scoreMetadata.cache_hit ? "hit" : "miss"}`}
                                {s.scoreMetadata?.truncated ? " · truncated" : ""}
                              </p>
                            )}

                            <p className="mt-4 mb-2 text-xs font-semibold tracking-wide text-slate-500 uppercase">
                              Full feedback
                            </p>
                            <pre className="m-0 max-h-64 overflow-auto whitespace-pre-wrap rounded-xl border border-[var(--line)] bg-white p-3 text-sm leading-relaxed text-slate-800">
                              {s.feedback || s.error || "No feedback"}
                            </pre>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </main>
  );
}
