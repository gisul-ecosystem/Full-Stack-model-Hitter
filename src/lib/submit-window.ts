import type { ITest } from "@/lib/models/Test";
import {
  IST_TIMEZONE,
  formatIstLabel,
  parseIstAwareDate,
  toIstDatetimeLocalValue,
  istDatetimeLocalToIso,
} from "@/lib/ist";

export { IST_TIMEZONE, formatIstLabel, toIstDatetimeLocalValue, istDatetimeLocalToIso };
export const APP_TIMEZONE = IST_TIMEZONE;

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
      message: `Submissions open at ${formatIstLabel(startsAt)}.`,
      startsAt,
      endsAt,
    };
  }

  if (endsAt && now.getTime() > endsAt.getTime()) {
    return {
      open: false,
      reason: "ended",
      message: `Submissions closed at ${formatIstLabel(endsAt)}.`,
      startsAt,
      endsAt,
    };
  }

  return { open: true, startsAt, endsAt };
}

/** @deprecated use parseIstAwareDate — kept for API imports */
export function parseOptionalDate(raw: unknown): Date | null | undefined {
  return parseIstAwareDate(raw);
}

/** @deprecated use toIstDatetimeLocalValue */
export function toDatetimeLocalValue(isoOrDate?: string | Date | null): string {
  return toIstDatetimeLocalValue(isoOrDate);
}

/** @deprecated use istDatetimeLocalToIso */
export function datetimeLocalToIso(local: string): string | null {
  return istDatetimeLocalToIso(local);
}
