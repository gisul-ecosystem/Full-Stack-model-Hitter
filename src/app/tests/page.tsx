"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { AlertBanner, PageHeader, Panel, StatusPill } from "@/components/ui";

type TestRow = {
  _id: string;
  title: string;
  description?: string;
  status: string;
  candidateCount: number;
  emailedCount: number;
  scoredCount: number;
  submitToken: string;
  createdAt: string;
};

export default function TestsPage() {
  const [tests, setTests] = useState<TestRow[]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/tests", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load tests");
      setTests(data.tests || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load tests");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) {
      setError("Title is required");
      return;
    }
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch("/api/tests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, description }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Create failed");
      setTitle("");
      setDescription("");
      setMessage(`Created “${data.test.title}”. Open it to add candidates.`);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Create failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main>
      <PageHeader
        eyebrow="Tests"
        title="Tests"
        description="Create a test, upload candidates by CSV, email them the isolated submit link, then track scores."
      />

      {error && <AlertBanner tone="error">{error}</AlertBanner>}
      {message && !error && <AlertBanner tone="success">{message}</AlertBanner>}

      <Panel title="Create test" className="mb-6">
        <form onSubmit={handleCreate} className="grid max-w-xl gap-3">
          <label className="block text-sm">
            Title
            <input
              className="mt-1 w-full rounded-lg border border-[var(--line)] bg-white px-3 py-2"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Lab 2 — REST APIs"
              required
            />
          </label>
          <label className="block text-sm">
            Description (optional)
            <textarea
              rows={3}
              className="mt-1 w-full rounded-lg border border-[var(--line)] bg-white px-3 py-2"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </label>
          <button
            type="submit"
            disabled={busy}
            className="w-fit rounded-lg bg-[var(--accent)] px-4 py-2.5 text-white hover:bg-[var(--accent-dark)] disabled:opacity-60"
          >
            {busy ? "Creating…" : "Create test"}
          </button>
        </form>
      </Panel>

      <Panel title="All tests">
        <div className="overflow-auto">
          <table className="w-full min-w-[40rem] border-collapse text-left">
            <thead>
              <tr className="border-b border-[var(--line)]">
                <th className="py-2 pr-3">Title</th>
                <th className="py-2 pr-3">Status</th>
                <th className="py-2 pr-3">Candidates</th>
                <th className="py-2 pr-3">Emailed</th>
                <th className="py-2 pr-3">Scored</th>
                <th className="py-2">Open</th>
              </tr>
            </thead>
            <tbody>
              {tests.map((t) => (
                <tr key={t._id} className="border-b border-[var(--line)]">
                  <td className="py-2.5 pr-3 font-medium">{t.title}</td>
                  <td className="py-2.5 pr-3">
                    <StatusPill status={t.status} />
                  </td>
                  <td className="py-2.5 pr-3">{t.candidateCount}</td>
                  <td className="py-2.5 pr-3">{t.emailedCount}</td>
                  <td className="py-2.5 pr-3">{t.scoredCount}</td>
                  <td className="py-2.5">
                    <Link
                      href={`/tests/${t._id}`}
                      className="font-medium text-[var(--accent)] underline"
                    >
                      Manage
                    </Link>
                  </td>
                </tr>
              ))}
              {!loading && tests.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-[var(--muted)]">
                    No tests yet. Create one above.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Panel>
    </main>
  );
}
