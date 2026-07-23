import type { ITest } from "@/lib/models/Test";

export type SubmitWindowState =
  | { open: true; reason?: undefined; startsAt?: Date; endsAt?: Date }
  | {
      open: false;
      reason: "not_started" | "ended" | "closed";
      message: string;
      startsAt?: Date;
      endsAt?: Date;
    };

function asDate(value: Date | string | undefined | null): Date | undefined {
  if (!value) return undefined;
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? undefined : d;
}

/** Submit link is allowed only between startsAt and endsAt (inclusive), and when not closed. */
export function getSubmitWindowState(
  test: Pick<ITest, "status" | "startsAt" | "endsAt">,
  now = new Date()
): SubmitWindowState {
  const startsAt = asDate(test.startsAt);
  const endsAt = asDate(test.endsAt);

  if (test.status === "closed") {
    return {
      open: false,
      reason: "closed",
      message: "This test is closed. Submissions are no longer accepted.",
      startsAt,
      endsAt,
    };
  }

  if (startsAt && now.getTime() < startsAt.getTime()) {
    return {
      open: false,
      reason: "not_started",
      message: `Submissions open at ${startsAt.toLocaleString()}.`,
      startsAt,
      endsAt,
    };
  }

  if (endsAt && now.getTime() > endsAt.getTime()) {
    return {
      open: false,
      reason: "ended",
      message: `Submissions closed at ${endsAt.toLocaleString()}.`,
      startsAt,
      endsAt,
    };
  }

  return { open: true, startsAt, endsAt };
}

export function parseOptionalDate(raw: unknown): Date | null | undefined {
  if (raw === null) return null;
  if (raw === undefined) return undefined;
  if (typeof raw !== "string") return undefined;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const d = new Date(trimmed);
  if (Number.isNaN(d.getTime())) {
    throw new Error("Invalid date/time");
  }
  return d;
}

/** Value for `<input type="datetime-local" />` in local timezone. */
export function toDatetimeLocalValue(isoOrDate?: string | Date | null): string {
  if (!isoOrDate) return "";
  const d = isoOrDate instanceof Date ? isoOrDate : new Date(isoOrDate);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
