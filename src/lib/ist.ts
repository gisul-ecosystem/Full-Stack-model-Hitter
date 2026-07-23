/** Indian Standard Time — used for all display and submit-window editing. */
export const IST_TIMEZONE = "Asia/Kolkata";
export const IST_OFFSET_MS = (5 * 60 + 30) * 60 * 1000;

function asDate(value: Date | string | null | undefined): Date | null {
  if (value == null || value === "") return null;
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** IST calendar parts from a UTC instant (IST has no DST). */
export function utcToIstParts(date: Date) {
  const ist = new Date(date.getTime() + IST_OFFSET_MS);
  return {
    year: ist.getUTCFullYear(),
    month: ist.getUTCMonth() + 1,
    day: ist.getUTCDate(),
    hour: ist.getUTCHours(),
    minute: ist.getUTCMinutes(),
    second: ist.getUTCSeconds(),
  };
}

/** Build a UTC Date from IST wall-clock components. */
export function istWallToUtcDate(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  second = 0
): Date {
  const asIfUtc = Date.UTC(year, month - 1, day, hour, minute, second);
  return new Date(asIfUtc - IST_OFFSET_MS);
}

/**
 * Display any instant in IST, 12-hour clock.
 * Example: "23 Jul 2026, 3:00 pm"
 */
export function formatIst(
  value: Date | string | null | undefined,
  style: "dateTime" | "date" | "time" = "dateTime"
): string {
  const d = asDate(value);
  if (!d) return "—";

  if (style === "date") {
    return d.toLocaleDateString("en-IN", {
      timeZone: IST_TIMEZONE,
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  }

  if (style === "time") {
    return d.toLocaleTimeString("en-IN", {
      timeZone: IST_TIMEZONE,
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  }

  return d.toLocaleString("en-IN", {
    timeZone: IST_TIMEZONE,
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

/** Same as formatIst dateTime, with an “IST” suffix. */
export function formatIstLabel(value: Date | string | null | undefined): string {
  const formatted = formatIst(value, "dateTime");
  if (formatted === "—") return formatted;
  return `${formatted} IST`;
}

/**
 * UTC / ISO → value for `<input type="datetime-local" />` as IST wall clock.
 * (Input has no timezone; we always mean IST.)
 */
export function toIstDatetimeLocalValue(
  isoOrDate?: string | Date | null
): string {
  const d = asDate(isoOrDate ?? null);
  if (!d) return "";
  const p = utcToIstParts(d);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${p.year}-${pad(p.month)}-${pad(p.day)}T${pad(p.hour)}:${pad(p.minute)}`;
}

/**
 * `<input type="datetime-local" />` value interpreted as IST → UTC ISO.
 * Does not use browser or server local timezone.
 */
export function istDatetimeLocalToIso(local: string): string | null {
  const trimmed = local.trim();
  if (!trimmed) return null;
  const match = trimmed.match(
    /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/
  );
  if (!match) return null;
  const [, y, mo, da, h, mi, se] = match;
  return istWallToUtcDate(
    Number(y),
    Number(mo),
    Number(da),
    Number(h),
    Number(mi),
    Number(se || 0)
  ).toISOString();
}

/**
 * Parse API date bodies.
 * - ISO with Z/offset → absolute instant
 * - Bare `YYYY-MM-DDTHH:mm` → IST wall clock → UTC
 */
export function parseIstAwareDate(raw: unknown): Date | null | undefined {
  if (raw === null) return null;
  if (raw === undefined) return undefined;
  if (typeof raw !== "string") return undefined;
  const trimmed = raw.trim();
  if (!trimmed) return null;

  if (/Z$|[+-]\d{2}:?\d{2}$/.test(trimmed)) {
    const d = new Date(trimmed);
    if (Number.isNaN(d.getTime())) throw new Error("Invalid date/time");
    return d;
  }

  const iso = istDatetimeLocalToIso(
    trimmed.includes("T") ? trimmed : `${trimmed}T00:00`
  );
  if (!iso) throw new Error("Invalid date/time");
  return new Date(iso);
}
