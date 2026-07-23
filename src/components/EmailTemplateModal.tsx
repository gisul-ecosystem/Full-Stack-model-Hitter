"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  buildCandidateEmailHtml,
  renderTemplate,
  testCandidateToVars,
} from "@/lib/email-template";
import { StatusPill } from "@/components/ui";

const PLACEHOLDERS = [
  "{{name}}",
  "{{email}}",
  "{{submission_url}}",
  "{{test_title}}",
  "{{labsemail}}",
  "{{labspassword}}",
];

type EmailModalContextValue = {
  openEmailTemplate: (testId?: string | null) => void;
  closeEmailTemplate: () => void;
};

const EmailModalContext = createContext<EmailModalContextValue | null>(null);

export function useEmailTemplateModal() {
  const ctx = useContext(EmailModalContext);
  if (!ctx) {
    throw new Error("useEmailTemplateModal must be used within EmailTemplateModalProvider");
  }
  return ctx;
}

export function EmailTemplateModalProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [testId, setTestId] = useState<string | null>(null);

  const openEmailTemplate = useCallback((id?: string | null) => {
    setTestId(id || null);
    setOpen(true);
  }, []);

  const closeEmailTemplate = useCallback(() => setOpen(false), []);

  const value = useMemo(
    () => ({ openEmailTemplate, closeEmailTemplate }),
    [openEmailTemplate, closeEmailTemplate]
  );

  return (
    <EmailModalContext.Provider value={value}>
      {children}
      {open && <EmailTemplateModal testId={testId} onClose={closeEmailTemplate} />}
    </EmailModalContext.Provider>
  );
}

type TestDto = {
  _id: string;
  title: string;
  subjectTemplate: string;
  bodyTemplate: string;
};

type CandidateDto = {
  _id: string;
  name: string;
  email: string;
  emailStatus: string;
  labsEmail?: string;
  labsPassword?: string;
};

function EmailTemplateModal({
  testId,
  onClose,
}: {
  testId: string | null;
  onClose: () => void;
}) {
  const [tests, setTests] = useState<TestDto[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(testId);
  const [test, setTest] = useState<TestDto | null>(null);
  const [candidates, setCandidates] = useState<CandidateDto[]>([]);
  const [submissionUrl, setSubmissionUrl] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [previewEmail, setPreviewEmail] = useState("");
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const loadTest = useCallback(async (id: string) => {
    const res = await fetch(`/api/tests/${id}`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed to load test");
    setTest(data.test);
    setCandidates(data.candidates || []);
    setSubmissionUrl(data.submissionUrl || "");
    setSubject(data.test.subjectTemplate || "");
    setBody(data.test.bodyTemplate || "");
    setSelectedId(id);
    setPreviewEmail(data.candidates?.[0]?.email || "");
    setDirty(false);
  }, []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/tests");
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to load tests");
        const list = (data.tests || []) as TestDto[];
        setTests(list);
        const preferred = testId || list[0]?._id;
        if (preferred) await loadTest(preferred);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load");
      } finally {
        setLoading(false);
      }
    })();
  }, [testId, loadTest]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  const previewCandidate =
    candidates.find((c) => c.email === previewEmail) || candidates[0] || null;

  const previewVars = previewCandidate
    ? testCandidateToVars({
        name: previewCandidate.name,
        email: previewCandidate.email,
        submissionUrl,
        testTitle: test?.title || "",
        labsEmail: previewCandidate.labsEmail,
        labsPassword: previewCandidate.labsPassword,
      })
    : null;

  const previewSubject = previewVars ? renderTemplate(subject, previewVars) : subject;
  const previewHtml = previewVars ? buildCandidateEmailHtml(previewVars) : "";

  const statusCounts = useMemo(
    () => ({
      pending: candidates.filter((c) => c.emailStatus === "pending").length,
      sent: candidates.filter((c) => c.emailStatus === "sent").length,
      failed: candidates.filter((c) => c.emailStatus === "failed").length,
    }),
    [candidates]
  );

  async function handleSave() {
    if (!selectedId) return;
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch(`/api/tests/${selectedId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subjectTemplate: subject.trim(),
          bodyTemplate: body.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Save failed");
      setTest(data.test);
      setDirty(false);
      setMessage("Template saved to database.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setBusy(false);
    }
  }

  async function handleSend(onlyFailed = false) {
    if (!selectedId) return;
    const ok = window.confirm(
      onlyFailed
        ? "Resend only to failed candidates?"
        : "Save template and send emails to pending/failed candidates?"
    );
    if (!ok) return;

    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const saveRes = await fetch(`/api/tests/${selectedId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subjectTemplate: subject.trim(),
          bodyTemplate: body.trim(),
        }),
      });
      const saveData = await saveRes.json();
      if (!saveRes.ok) throw new Error(saveData.error || "Could not save template");

      const res = await fetch(`/api/tests/${selectedId}/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ onlyFailed }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Send failed");

      setDirty(false);
      setMessage(
        `Saved & sent — attempted ${data.batch.attempted}, sent ${data.batch.sent}, failed ${data.batch.failed}.`
      );
      await loadTest(selectedId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Send failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center p-0 sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="email-template-title"
    >
      <button
        type="button"
        className="absolute inset-0 bg-stone-900/50 backdrop-blur-[2px]"
        aria-label="Close dialog"
        onClick={onClose}
      />

      <div className="relative z-10 flex max-h-[100dvh] w-full max-w-5xl flex-col overflow-hidden rounded-t-2xl border border-[var(--line)] bg-[var(--card)] shadow-2xl sm:max-h-[90vh] sm:rounded-2xl">
        <div className="flex items-start justify-between gap-3 border-b border-[var(--line)] px-5 py-4">
          <div>
            <h2 id="email-template-title" className="m-0 text-[1.25rem]">
              Email template
            </h2>
            <p className="mt-1 mb-0 text-[0.95rem] leading-relaxed text-[var(--muted)]">
              Edit subject and body, then Save. Placeholders include the isolated submit URL.
              {dirty ? " · Unsaved changes" : ""}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-[var(--line)] bg-white px-3 py-1.5 text-sm hover:bg-stone-50"
          >
            Close
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {loading ? (
            <p className="text-sm text-[var(--muted)]">Loading…</p>
          ) : !tests.length ? (
            <p className="text-sm text-[var(--muted)]">Create a test first, then open email.</p>
          ) : (
            <>
              {error && (
                <div className="mb-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-[var(--danger)]">
                  {error}
                </div>
              )}
              {message && !error && (
                <div className="mb-3 rounded-xl border border-teal-200 bg-teal-50 px-3 py-2 text-sm text-[var(--accent-dark)]">
                  {message}
                </div>
              )}

              <div className="mb-4 flex flex-wrap items-end gap-3">
                <label className="min-w-[14rem] flex-1 text-sm">
                  Test
                  <select
                    className="mt-1 w-full rounded-lg border border-[var(--line)] bg-white px-3 py-2"
                    value={selectedId || ""}
                    onChange={(e) => {
                      const id = e.target.value;
                      if (!id) return;
                      if (dirty && !window.confirm("Discard unsaved changes?")) return;
                      loadTest(id).catch((err) => setError(err.message));
                    }}
                  >
                    {tests.map((t) => (
                      <option key={t._id} value={t._id}>
                        {t.title}
                      </option>
                    ))}
                  </select>
                </label>
                <p className="pb-2 text-sm text-[var(--muted)]">
                  Pending {statusCounts.pending} · Sent {statusCounts.sent} · Failed{" "}
                  {statusCounts.failed}
                </p>
              </div>

              <div className="grid gap-5 lg:grid-cols-2">
                <div className="space-y-3">
                  <div className="flex flex-wrap gap-2">
                    {PLACEHOLDERS.map((token) => (
                      <button
                        key={token}
                        type="button"
                        className="rounded-full border border-[var(--line)] bg-white px-2 py-0.5 text-xs text-[var(--muted)] hover:bg-stone-50"
                        onClick={() => {
                          setBody((prev) => `${prev}${prev && !prev.endsWith("\n") ? " " : ""}${token}`);
                          setDirty(true);
                          setMessage(null);
                        }}
                      >
                        {token}
                      </button>
                    ))}
                  </div>
                  <label className="block text-sm font-medium">
                    Subject
                    <input
                      className="mt-1 w-full rounded-lg border border-[var(--line)] bg-white px-3 py-2.5"
                      value={subject}
                      onChange={(e) => {
                        setSubject(e.target.value);
                        setDirty(true);
                        setMessage(null);
                      }}
                    />
                  </label>
                  <label className="block text-sm font-medium">
                    Body
                    <textarea
                      rows={12}
                      className="mt-1 w-full rounded-lg border border-[var(--line)] bg-white px-3 py-2.5 font-mono text-sm leading-relaxed"
                      value={body}
                      onChange={(e) => {
                        setBody(e.target.value);
                        setDirty(true);
                        setMessage(null);
                      }}
                    />
                  </label>
                </div>

                <div className="space-y-4">
                  <div>
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <p className="text-sm font-medium">Preview</p>
                      {candidates.length > 0 && (
                        <select
                          className="max-w-[12rem] rounded-lg border border-[var(--line)] bg-white px-2 py-1 text-sm"
                          value={previewEmail}
                          onChange={(e) => setPreviewEmail(e.target.value)}
                        >
                          {candidates.map((c) => (
                            <option key={c._id} value={c.email}>
                              {c.name}
                            </option>
                          ))}
                        </select>
                      )}
                    </div>
                    <div className="overflow-hidden rounded-xl border border-[var(--line)] bg-white">
                      <div className="border-b border-[var(--line)] px-4 py-3">
                        <p className="m-0 text-xs uppercase tracking-wide text-[var(--muted)]">
                          Subject
                        </p>
                        <p className="mt-1 mb-0 font-medium">{previewSubject || "—"}</p>
                      </div>
                      {previewHtml ? (
                        <iframe
                          title="Email preview"
                          srcDoc={previewHtml}
                          className="h-[28rem] w-full border-0 bg-[#f3efe6]"
                        />
                      ) : (
                        <p className="p-4 text-sm text-[var(--muted)]">
                          Add a candidate to preview the styled email.
                        </p>
                      )}
                    </div>
                  </div>
                  <div>
                    <p className="mb-2 text-sm font-medium">Candidates</p>
                    <ul className="max-h-40 divide-y divide-[var(--line)] overflow-auto rounded-xl border border-[var(--line)] bg-white">
                      {candidates.map((c) => (
                        <li
                          key={c._id}
                          className="flex items-center justify-between gap-2 px-3 py-2 text-sm"
                        >
                          <span>
                            {c.name}{" "}
                            <span className="text-xs text-[var(--muted)]">{c.email}</span>
                          </span>
                          <StatusPill status={c.emailStatus} />
                        </li>
                      ))}
                      {!candidates.length && (
                        <li className="px-3 py-3 text-sm text-[var(--muted)]">
                          Add candidates to this test first.
                        </li>
                      )}
                    </ul>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2 border-t border-[var(--line)] bg-stone-50/80 px-5 py-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-[var(--line)] bg-white px-4 py-2 text-sm hover:bg-stone-50"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={busy || !selectedId || statusCounts.failed === 0}
            onClick={() => handleSend(true)}
            className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-[var(--danger)] disabled:opacity-50"
          >
            Resend failed
          </button>
          <button
            type="button"
            disabled={busy || !selectedId || statusCounts.pending + statusCounts.failed === 0}
            onClick={() => handleSend(false)}
            className="rounded-lg border border-[var(--line)] bg-white px-4 py-2 text-sm hover:bg-stone-50 disabled:opacity-50"
          >
            Send emails
          </button>
          <button
            type="button"
            disabled={busy || !selectedId || !subject.trim() || !body.trim()}
            onClick={handleSave}
            className="rounded-lg bg-[var(--accent)] px-4 py-2 text-sm text-white hover:bg-[var(--accent-dark)] disabled:opacity-50"
          >
            {busy ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}
