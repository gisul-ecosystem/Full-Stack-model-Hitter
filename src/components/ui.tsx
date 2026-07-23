import type { ReactNode } from "react";

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="max-w-3xl">
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h1 className="mt-2">{title}</h1>
        {description && <p className="page-desc">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function Panel({
  title,
  children,
  className = "",
  action,
}: {
  title?: string;
  children: ReactNode;
  className?: string;
  action?: ReactNode;
}) {
  return (
    <section
      className={`rounded-2xl border border-[var(--line)] bg-[var(--card)] p-5 shadow-sm ${className}`}
    >
      {(title || action) && (
        <div className="mb-4 flex items-center justify-between gap-3">
          {title ? <h2 className="m-0 text-[1.15rem]">{title}</h2> : <span />}
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

export function StatusPill({ status }: { status: string }) {
  const tone =
    status === "sent" || status === "completed" || status === "ready"
      ? "bg-teal-100 text-teal-900"
      : status === "failed"
        ? "bg-red-100 text-red-800"
        : status === "sending" || status === "running" || status === "scoring" || status === "extracting"
          ? "bg-amber-100 text-amber-950"
          : status === "queued" || status === "waiting" || status === "pending" || status === "extracted"
            ? "bg-sky-100 text-sky-950"
            : "bg-stone-100 text-stone-700";

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 font-[family-name:var(--font-display)] text-[0.68rem] font-semibold tracking-wide capitalize ${tone}`}
    >
      {status}
    </span>
  );
}

export function StatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string | number;
  hint?: string;
}) {
  return (
    <div className="rounded-2xl border border-[var(--line)] bg-[var(--card)] p-5 shadow-sm">
      <p className="stat-label m-0">{label}</p>
      <p className="stat-value mt-2.5 mb-0">{value}</p>
      {hint && (
        <p className="mt-2 mb-0 text-[0.9rem] leading-snug text-[var(--muted)]">{hint}</p>
      )}
    </div>
  );
}

export function AlertBanner({
  tone,
  children,
  className = "mb-6",
}: {
  tone: "error" | "success" | "info";
  children: ReactNode;
  className?: string;
}) {
  const styles =
    tone === "error"
      ? "border-red-200 bg-red-50 text-[var(--danger)]"
      : tone === "success"
        ? "border-teal-200 bg-teal-50 text-[var(--accent-dark)]"
        : "border-sky-200 bg-sky-50 text-sky-900";

  return (
    <div
      className={`rounded-xl border px-4 py-3 text-[0.95rem] leading-relaxed ${styles} ${className}`}
    >
      {children}
    </div>
  );
}
