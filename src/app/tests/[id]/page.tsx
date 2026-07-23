"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useEmailTemplateModal } from "@/components/EmailTemplateModal";
import { AlertBanner } from "@/components/ui";

type TestDto = {
  _id: string;
  title: string;
  description?: string;
  status: string;
  submitToken: string;
  candidateCount: number;
  emailedCount: number;
  scoredCount: number;
};

type CandidateDto = {
  _id: string;
  name: string;
  email: string;
  emailStatus: string;
  scoreStatus?: string;
  score?: number;
  feedback?: string;
};

function IconBack() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M15 18l-6-6 6-6" />
    </svg>
  );
}
function IconChart() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M4 19V5M10 19V9M16 19v-6M22 19H2" />
    </svg>
  );
}
function IconTrash() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" />
    </svg>
  );
}
function IconGear() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="3" />
      <path d="M12 1v2M12 21v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M1 12h2M21 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4" />
    </svg>
  );
}
function IconEdit() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 20h9M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4L16.5 3.5z" />
    </svg>
  );
}
function IconLink() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M10 13a5 5 0 007.5.5l2-2a5 5 0 00-7-7l-1.2 1.2" />
      <path d="M14 11a5 5 0 00-7.5-.5l-2 2a5 5 0 007 7L12.7 18" />
    </svg>
  );
}
function IconCopy() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="9" y="9" width="13" height="13" rx="2" />
      <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
    </svg>
  );
}
function IconDownload() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 3v12M7 10l5 5 5-5M5 21h14" />
    </svg>
  );
}
function IconSend() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
    </svg>
  );
}
function IconPlus() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}
function IconRefresh() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 12a9 9 0 11-3-6.7M21 3v6h-6" />
    </svg>
  );
}

const AVATAR_COLORS = [
  "bg-violet-500",
  "bg-sky-500",
  "bg-teal-500",
  "bg-indigo-500",
  "bg-fuchsia-500",
  "bg-cyan-600",
];

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

function avatarColor(seed: string) {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) hash = (hash + seed.charCodeAt(i) * 17) % AVATAR_COLORS.length;
  return AVATAR_COLORS[hash];
}

function statusLabel(c: CandidateDto) {
  if (c.scoreStatus === "completed") return "Completed";
  if (c.scoreStatus === "failed") return "Failed";
  if (c.scoreStatus === "scoring" || c.scoreStatus === "extracting" || c.scoreStatus === "extracted" || c.scoreStatus === "queued") {
    return "In progress";
  }
  if (c.emailStatus === "sent") return "Invited";
  if (c.emailStatus === "failed") return "Email failed";
  return "Pending";
}

function statusTone(label: string) {
  if (label === "Completed") return "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200";
  if (label === "Failed" || label === "Email failed") return "bg-red-50 text-red-700 ring-1 ring-red-200";
  if (label === "In progress") return "bg-amber-50 text-amber-800 ring-1 ring-amber-200";
  if (label === "Invited") return "bg-sky-50 text-sky-800 ring-1 ring-sky-200";
  return "bg-stone-100 text-stone-600 ring-1 ring-stone-200";
}

export default function TestDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = String(params.id || "");
  const { openEmailTemplate } = useEmailTemplateModal();

  const [test, setTest] = useState<TestDto | null>(null);
  const [candidates, setCandidates] = useState<CandidateDto[]>([]);
  const [submissionUrl, setSubmissionUrl] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [addTab, setAddTab] = useState<"manual" | "csv">("manual");
  const [manualName, setManualName] = useState("");
  const [manualEmail, setManualEmail] = useState("");
  const [manualLabsEmail, setManualLabsEmail] = useState("");
  const [manualLabsPassword, setManualLabsPassword] = useState("");
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const testRes = await fetch(`/api/tests/${id}`, { cache: "no-store" });
      const testData = await testRes.json();
      if (!testRes.ok) throw new Error(testData.error || "Failed to load test");
      setTest(testData.test);
      setCandidates(testData.candidates || []);
      setSubmissionUrl(testData.submissionUrl || "");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  function closeAddModal() {
    setShowAdd(false);
    setCsvFile(null);
    setManualName("");
    setManualEmail("");
    setManualLabsEmail("");
    setManualLabsPassword("");
    setAddTab("manual");
  }

  async function addCandidateManual() {
    const name = manualName.trim();
    const email = manualEmail.trim().toLowerCase();
    const labsEmail = manualLabsEmail.trim().toLowerCase();
    const labsPassword = manualLabsPassword.trim();
    if (!name || !email) {
      setError("Name and email are required");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Enter a valid email address");
      return;
    }
    if (labsEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(labsEmail)) {
      setError("Enter a valid labs email");
      return;
    }
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch(`/api/tests/${id}/candidates`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          people: [
            {
              name,
              email,
              labsEmail: labsEmail || undefined,
              labsPassword: labsPassword || undefined,
            },
          ],
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to add candidate");
      if (data.added === 0 && data.skipped > 0) {
        setError("This email is already on this test");
        return;
      }
      setMessage(`Added ${name}.`);
      closeAddModal();
      setTest(data.test);
      setCandidates(data.candidates || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add candidate");
    } finally {
      setBusy(false);
    }
  }

  async function addCandidatesFromCsv() {
    if (!csvFile) {
      setError("Choose a CSV file first");
      return;
    }
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const form = new FormData();
      form.append("file", csvFile);
      const res = await fetch(`/api/tests/${id}/candidates`, {
        method: "POST",
        body: form,
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(
          (data.error || "Failed to add candidates") +
            (data.errors?.length ? ` — ${data.errors.slice(0, 3).join("; ")}` : "")
        );
      }
      const skipNote = data.skipped ? ` (${data.skipped} already on this test)` : "";
      setMessage(`Added ${data.added} candidate${data.added === 1 ? "" : "s"}${skipNote}.`);
      closeAddModal();
      setTest(data.test);
      setCandidates(data.candidates || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add candidates");
    } finally {
      setBusy(false);
    }
  }

  async function copyLink() {
    if (!submissionUrl) return;
    await navigator.clipboard.writeText(submissionUrl);
    setMessage("Test URL copied.");
  }

  async function sendEmailToAll() {
    const ok = window.confirm("Send email to all candidates on this test?");
    if (!ok) return;
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch(`/api/tests/${id}/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sendAll: true }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Send failed");
      setMessage(`Emails sent: ${data.batch.sent}, failed: ${data.batch.failed}.`);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Send failed");
    } finally {
      setBusy(false);
    }
  }

  async function resendEmail(candidateId: string) {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch(`/api/tests/${id}/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ candidateId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Resend failed");
      setMessage("Email resent.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Resend failed");
    } finally {
      setBusy(false);
    }
  }

  async function removeCandidate(candidateId: string) {
    const ok = window.confirm("Remove this candidate from the test?");
    if (!ok) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/tests/${id}/candidates`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ candidateId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Remove failed");
      setTest(data.test);
      setCandidates(data.candidates || []);
      setMessage("Candidate removed.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Remove failed");
    } finally {
      setBusy(false);
    }
  }

  async function removeAllCandidates() {
    const ok = window.confirm("Remove ALL candidates from this test?");
    if (!ok) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/tests/${id}/candidates`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ removeAll: true }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Remove failed");
      setTest(data.test);
      setCandidates(data.candidates || []);
      setMessage("All candidates removed.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Remove failed");
    } finally {
      setBusy(false);
    }
  }

  async function deleteAssessment() {
    const ok = window.confirm("Delete this assessment and all its candidates?");
    if (!ok) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/tests/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Delete failed");
      router.push("/tests");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
      setBusy(false);
    }
  }

  function exportResults() {
    const header = ["name", "email", "score", "feedback", "status", "email_status"];
    const rows = candidates.map((c) => [
      c.name,
      c.email,
      typeof c.score === "number" ? String(c.score) : "",
      (c.feedback || "").replace(/\n/g, " "),
      statusLabel(c),
      c.emailStatus,
    ]);
    const csv = [header, ...rows]
      .map((r) => r.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${test?.title || "results"}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (loading && !test) {
    return (
      <main className="py-10">
        <p className="text-[var(--muted)]">Loading assessment…</p>
      </main>
    );
  }

  if (!test) {
    return (
      <main>
        <AlertBanner tone="error">{error || "Assessment not found"}</AlertBanner>
        <Link href="/tests" className="text-[var(--accent)] underline">
          Back to Dashboard
        </Link>
      </main>
    );
  }

  return (
    <main className="pb-10">
      <Link
        href="/tests"
        className="mb-5 inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--accent)] hover:underline"
      >
        <IconBack /> Back to Dashboard
      </Link>

      {error && <AlertBanner tone="error">{error}</AlertBanner>}
      {message && !error && <AlertBanner tone="success">{message}</AlertBanner>}

      {/* Assessment Analytics */}
      <section className="mb-5 overflow-hidden rounded-2xl border border-sky-100 bg-white shadow-sm">
        <div className="flex flex-col gap-4 bg-gradient-to-r from-sky-50 to-white px-5 py-5 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-sky-100 text-[var(--accent)]">
                <IconChart />
              </span>
              <h1 className="m-0 text-[1.35rem] font-bold tracking-tight text-slate-900">
                Assessment Analytics
              </h1>
            </div>
            <p className="mt-2 mb-0 text-[0.95rem] text-slate-500">
              {test.title} | View detailed analytics and candidate submissions
            </p>
          </div>
          <button
            type="button"
            disabled={busy}
            onClick={deleteAssessment}
            className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-red-300 bg-white px-4 py-2.5 text-sm font-semibold text-red-600 hover:bg-red-50 disabled:opacity-60"
          >
            <IconTrash /> Delete Assessment
          </button>
        </div>
      </section>

      {/* Test Access & Email Settings */}
      <section className="mb-5 rounded-2xl border border-violet-100 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex gap-3">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-violet-100 text-violet-600">
              <IconGear />
            </span>
            <div>
              <h2 className="m-0 text-[1.1rem] font-bold text-slate-900">
                Test Access & Email Settings
              </h2>
              <p className="mt-1 mb-0 text-sm text-slate-500">Using system default template</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => openEmailTemplate(test._id)}
            className="inline-flex items-center gap-2 rounded-xl border border-violet-300 bg-white px-4 py-2 text-sm font-semibold text-violet-700 hover:bg-violet-50"
          >
            <IconEdit /> Edit Template
          </button>
        </div>

        <div className="mt-5">
          <p className="mb-2 flex items-center gap-1.5 text-[0.7rem] font-semibold tracking-[0.12em] text-slate-400 uppercase">
            <IconLink /> Test URL
          </p>
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              readOnly
              value={submissionUrl}
              className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 font-mono text-sm text-slate-700"
            />
            <button
              type="button"
              onClick={copyLink}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              <IconCopy /> Copy URL
            </button>
          </div>
        </div>
      </section>

      {/* Candidates */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-2">
            <h2 className="m-0 text-[1.15rem] font-bold text-slate-900">Candidates</h2>
            <span className="rounded-full bg-violet-100 px-2.5 py-0.5 text-xs font-bold text-violet-700">
              {candidates.length}
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={exportResults}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              <IconDownload /> Export Results
            </button>
            <button
              type="button"
              disabled={busy || !candidates.length}
              onClick={sendEmailToAll}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              <IconSend /> Send Email to All
            </button>
            <button
              type="button"
              onClick={() => setShowAdd(true)}
              className="inline-flex items-center gap-2 rounded-xl bg-[var(--accent)] px-3 py-2 text-sm font-semibold text-white hover:bg-[var(--accent-dark)]"
            >
              <IconPlus /> Add Candidate
            </button>
            <button
              type="button"
              disabled={busy || !candidates.length}
              onClick={removeAllCandidates}
              className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-3 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
            >
              <IconTrash /> Remove All Candidates
            </button>
          </div>
        </div>

        <div className="max-h-[32rem] overflow-auto rounded-xl border border-slate-100">
          <table className="w-full min-w-[56rem] border-collapse text-left text-sm">
            <thead className="sticky top-0 bg-slate-50">
              <tr className="border-b border-slate-200 text-[0.68rem] tracking-[0.08em] text-slate-500 uppercase">
                <th className="px-4 py-3 font-semibold">Name</th>
                <th className="px-4 py-3 font-semibold">Email</th>
                <th className="px-4 py-3 font-semibold">Score</th>
                <th className="px-4 py-3 font-semibold">Feedback</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {candidates.map((c) => {
                const label = statusLabel(c);
                return (
                  <tr key={c._id} className="border-b border-slate-100 hover:bg-slate-50/70">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <span
                          className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white ${avatarColor(c.email)}`}
                        >
                          {initials(c.name)}
                        </span>
                        <span className="font-semibold text-slate-900">{c.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{c.email}</td>
                    <td className="px-4 py-3 font-[family-name:var(--font-display)] text-base font-bold text-red-600">
                      {typeof c.score === "number" ? c.score : "—"}
                    </td>
                    <td className="max-w-[14rem] truncate px-4 py-3 text-slate-500">
                      {c.feedback || "—"}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${statusTone(label)}`}
                      >
                        {label}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => resendEmail(c._id)}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-300 px-2.5 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-50 disabled:opacity-50"
                        >
                          <IconRefresh /> Resend Email
                        </button>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => removeCandidate(c._id)}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-red-300 px-2.5 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50"
                        >
                          <IconTrash /> Remove
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {!candidates.length && (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-slate-500">
                    No candidates yet. Click Add Candidate to enter name/email or upload a CSV.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {showAdd && (
        <div className="fixed inset-0 z-[90] flex items-end justify-center bg-slate-900/40 p-0 sm:items-center sm:p-4">
          <button
            type="button"
            className="absolute inset-0"
            aria-label="Close"
            onClick={closeAddModal}
          />
          <div className="relative z-10 w-full max-w-lg rounded-t-2xl border border-slate-200 bg-white p-5 shadow-2xl sm:rounded-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="m-0 text-lg font-bold">Add Candidate</h3>
              <button
                type="button"
                onClick={closeAddModal}
                className="rounded-lg border border-slate-200 px-2 py-1 text-sm"
              >
                Close
              </button>
            </div>

            <div className="mb-4 inline-flex rounded-xl border border-slate-200 bg-slate-50 p-1">
              <button
                type="button"
                onClick={() => setAddTab("manual")}
                className={`rounded-lg px-3 py-1.5 text-sm font-semibold ${
                  addTab === "manual" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"
                }`}
              >
                Manual
              </button>
              <button
                type="button"
                onClick={() => setAddTab("csv")}
                className={`rounded-lg px-3 py-1.5 text-sm font-semibold ${
                  addTab === "csv" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"
                }`}
              >
                Upload CSV
              </button>
            </div>

            {addTab === "manual" ? (
              <form
                className="grid gap-3"
                onSubmit={(e) => {
                  e.preventDefault();
                  addCandidateManual();
                }}
              >
                <label className="block text-sm font-medium text-slate-700">
                  Name
                  <input
                    type="text"
                    value={manualName}
                    onChange={(e) => setManualName(e.target.value)}
                    placeholder="Full name"
                    className="mt-1.5 block w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm"
                    autoFocus
                  />
                </label>
                <label className="block text-sm font-medium text-slate-700">
                  Email
                  <input
                    type="email"
                    value={manualEmail}
                    onChange={(e) => setManualEmail(e.target.value)}
                    placeholder="name@example.com"
                    className="mt-1.5 block w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm"
                  />
                </label>
                <label className="block text-sm font-medium text-slate-700">
                  Labs email
                  <input
                    type="email"
                    value={manualLabsEmail}
                    onChange={(e) => setManualLabsEmail(e.target.value)}
                    placeholder="vm lab login email"
                    className="mt-1.5 block w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm"
                  />
                </label>
                <label className="block text-sm font-medium text-slate-700">
                  Labs password
                  <input
                    type="text"
                    value={manualLabsPassword}
                    onChange={(e) => setManualLabsPassword(e.target.value)}
                    placeholder="vm lab password"
                    className="mt-1.5 block w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm"
                  />
                </label>
                <button
                  type="submit"
                  disabled={busy || !manualName.trim() || !manualEmail.trim()}
                  className="mt-1 w-full rounded-xl bg-[var(--accent)] py-2.5 text-sm font-semibold text-white disabled:opacity-50"
                >
                  {busy ? "Adding…" : "Add candidate"}
                </button>
              </form>
            ) : (
              <div>
                <p className="m-0 mb-3 text-sm text-slate-500">
                  CSV columns:{" "}
                  <code className="rounded bg-slate-100 px-1">name</code>,{" "}
                  <code className="rounded bg-slate-100 px-1">email</code>,{" "}
                  <code className="rounded bg-slate-100 px-1">labsemail</code>,{" "}
                  <code className="rounded bg-slate-100 px-1">labspassword</code>
                </p>
                <label className="mb-4 block text-sm font-medium text-slate-700">
                  CSV or Excel file
                  <input
                    type="file"
                    accept=".csv,.xlsx,.xls,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
                    className="mt-1.5 block w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-teal-50 file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-teal-800"
                    onChange={(e) => setCsvFile(e.target.files?.[0] || null)}
                  />
                </label>
                {csvFile && (
                  <p className="mb-3 text-sm text-slate-600">
                    Selected: <span className="font-semibold">{csvFile.name}</span>
                  </p>
                )}
                <button
                  type="button"
                  disabled={busy || !csvFile}
                  onClick={addCandidatesFromCsv}
                  className="w-full rounded-xl bg-[var(--accent)] py-2.5 text-sm font-semibold text-white disabled:opacity-50"
                >
                  {busy ? "Uploading…" : "Upload & add candidates"}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
