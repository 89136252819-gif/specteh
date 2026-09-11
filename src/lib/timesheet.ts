import { BUSINESS_TZ } from "@/lib/utils";

/** YYYY-MM-DD в Asia/Omsk. */
export function omskYmd(value = new Date(), timeZone = BUSINESS_TZ) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(value);
}

/** Начало календарного дня Омска (00:00 +06). */
export function startOfDay(value = new Date()) {
  const ymd = omskYmd(value);
  return new Date(`${ymd}T00:00:00+06:00`);
}

export function startOfMonth(value = new Date()) {
  const ymd = omskYmd(value);
  const [y, m] = ymd.split("-").map(Number);
  return new Date(`${y}-${String(m).padStart(2, "0")}-01T00:00:00+06:00`);
}

/** Границы месяца `YYYY-MM` в Asia/Omsk: [start, end). */
export function omskMonthRange(monthKey: string) {
  const [y, m] = monthKey.split("-").map(Number);
  const start = new Date(`${y}-${String(m).padStart(2, "0")}-01T00:00:00+06:00`);
  const end =
    m === 12
      ? new Date(`${y + 1}-01-01T00:00:00+06:00`)
      : new Date(`${y}-${String(m + 1).padStart(2, "0")}-01T00:00:00+06:00`);
  return { start, end, year: y, month: m };
}

export function fromIsoDay(iso: string, end = false) {
  const day = iso.slice(0, 10);
  if (end) {
    const start = new Date(`${day}T00:00:00+06:00`);
    return new Date(start.getTime() + 24 * 60 * 60 * 1000 - 1);
  }
  return new Date(`${day}T00:00:00+06:00`);
}

export function elapsedInRange(
  startedAt: Date,
  endedAt: Date | null,
  from: Date,
  to: Date,
  now = new Date(),
) {
  const start = Math.max(startedAt.getTime(), from.getTime());
  const end = Math.min((endedAt ?? now).getTime(), to.getTime());
  return Math.max(0, end - start);
}
