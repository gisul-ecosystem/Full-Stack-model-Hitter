"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { AlertBanner, PageHeader, Panel } from "@/components/ui";
import { formatIstLabel } from "@/lib/ist";

export default function IsolatedSubmitPage() {
  const params = useParams();
  const token = String(params.token || "");

  const [testTitle, setTestTitle] = useState("");
  const [testDescription, setTestDescription] = useState("");
  const [startsAt, setStartsAt] = useState<string | null>(null);
  const [endsAt, setEndsAt] = useState<string | null>(null);
  const [windowOpen, setWindowOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [resultId, setResultId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError(null);
      setWindowOpen(false);
      try {
        const res = await fetch(`/api/tests/by-token/${token}`);
        const data = await res.json();
        if (data.test?.title) setTestTitle(data.test.title);
        if (data.test?.description) setTestDescription(data.test.description || "");
        setStartsAt(data.test?.startsAt || null);
        setEndsAt(data.test?.endsAt || null);
        if (!res.ok) {
          setWindowOpen(false);
          throw new Error(data.error || "Invalid link");
        }
        setWindowOpen(true);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Invalid submission link");
      } finally {
        setLoading(false);
      }
    })();
  }, [token]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !file) {
      setError("Name, email, and ZIP are required");
      return;
    }

    setBusy(true);
    setError(null);
    setResultId(null);

    try {
      const form = new FormData();
      form.append("name", name.trim());
      form.append("email", email.trim());
      form.append("file", file);

      const res = await fetch(`/api/tests/by-token/${token}/submissions`, {
        method: "POST",
        body: form,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Upload failed");

      setResultId(data.submission.id);
      setFile(null);
      void fetch("/api/queue/process", { method: "POST" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <main>
        <p className="text-[var(--muted)]">Loading submission page…</p>
      </main>
    );
  }

  const windowHint = [
    startsAt ? `Opens ${formatIstLabel(startsAt)}` : null,
    endsAt ? `Closes ${formatIstLabel(endsAt)}` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <main>
      <PageHeader
        eyebrow="Submit"
        title={testTitle || "Project submission"}
        description={
          testDescription ||
          "Enter the same name and email used for this test, then upload your project ZIP."
        }
      />

      {windowHint && (
        <p className="mb-4 text-sm text-[var(--muted)]">{windowHint}</p>
      )}

      {error && <AlertBanner tone="error">{error}</AlertBanner>}
      {resultId && (
        <AlertBanner tone="success">
          ZIP received and queued for scoring (job …{resultId.slice(-8)}). You can close this page.
        </AlertBanner>
      )}

      {windowOpen ? (
        <Panel title="Upload ZIP">
          <form onSubmit={handleSubmit} className="mx-auto max-w-xl space-y-4">
            <label className="block text-sm">
              Name
              <input
                className="mt-1 w-full rounded-lg border border-[var(--line)] bg-white px-3 py-2"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </label>
            <label className="block text-sm">
              Email
              <input
                type="email"
                className="mt-1 w-full rounded-lg border border-[var(--line)] bg-white px-3 py-2"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <span className="mt-1 block text-xs text-[var(--muted)]">
                Must match a candidate invited to this test. Only one ZIP submission is allowed.
              </span>
            </label>
            <label className="block text-sm">
              Project ZIP
              <input
                type="file"
                accept=".zip,application/zip"
                className="mt-1 block w-full rounded-lg border border-[var(--line)] bg-white px-3 py-2 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-teal-50 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-[var(--accent-dark)]"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                required
              />
            </label>
            <button
              type="submit"
              disabled={busy || !testTitle}
              className="rounded-lg bg-[var(--accent)] px-4 py-2.5 text-white hover:bg-[var(--accent-dark)] disabled:opacity-60"
            >
              {busy ? "Uploading…" : "Submit"}
            </button>
          </form>
        </Panel>
      ) : (
        <Panel title="Submission closed">
          <p className="m-0 text-sm text-[var(--muted)]">
            {error || "This submission link is not accepting uploads right now."}
          </p>
          <p className="mt-3 mb-0 text-sm">
            <Link href="/" className="text-[var(--accent)] underline">
              Go home
            </Link>
          </p>
        </Panel>
      )}
    </main>
  );
}
