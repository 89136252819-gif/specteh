import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatPublicPrice(opts: {
  hourPrice?: number | null;
  deliveryPrice?: number | null;
  regionDeliveryPrice?: number | null;
  minHours?: number | null;
}) {
  const hour = opts.hourPrice ?? null;
  const rub = (value: number) => `${Math.round(value).toLocaleString("ru-RU")} ₽`;
  const parts: string[] = [];
  if (hour != null) parts.push(`${rub(hour)}/ч`);
  if (opts.deliveryPrice != null && opts.regionDeliveryPrice != null) {
    parts.push(`подача ${rub(opts.deliveryPrice)} город / ${rub(opts.regionDeliveryPrice)} область`);
  } else if (opts.deliveryPrice != null) {
    parts.push(`подача ${rub(opts.deliveryPrice)}`);
  }
  if (opts.minHours) parts.push(`минимум ${opts.minHours} ч`);
  return parts.join(" · ") || "Цена по запросу";
}

export function money(value: number) {
  return new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: "RUB",
    maximumFractionDigits: 2,
  }).format(value);
}

export function moneyPlain(value: number) {
  return new Intl.NumberFormat("ru-RU", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatDate(value: Date | string) {
  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(value));
}

export function formatDateTime(value: Date | string) {
  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export function formatTime(value: Date | string) {
  return new Intl.DateTimeFormat("ru-RU", { hour: "2-digit", minute: "2-digit" }).format(new Date(value));
}

export const BUSINESS_TZ = "Asia/Omsk";

export function toDatetimeLocal(value: Date | string) {
  return toDatetimeLocalInTz(value, BUSINESS_TZ);
}

/** Значение для input[type=datetime-local] в заданном поясе (по умолчанию Омск). */
export function toDatetimeLocalInTz(value: Date | string, timeZone = BUSINESS_TZ) {
  const d = new Date(value);
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(d);
  const get = (type: string) => parts.find((part) => part.type === type)?.value || "00";
  return `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}`;
}

/**
 * Парсит `YYYY-MM-DDTHH:mm` из datetime-local как стенные часы Asia/Omsk (+06:00).
 * Без offset браузер/сервер иначе берут TZ контейнера (часто UTC).
 */
export function parseOmskDatetimeLocal(value: string): Date | null {
  const match = value.trim().match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/);
  if (!match) {
    const fallback = new Date(value);
    return Number.isNaN(fallback.getTime()) ? null : fallback;
  }
  const [, y, m, d, h, min, s] = match;
  const iso = `${y}-${m}-${d}T${h}:${min}:${s || "00"}+06:00`;
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function omskTomorrowMorning() {
  const iso = new Intl.DateTimeFormat("en-CA", {
    timeZone: BUSINESS_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  const [y, m, d] = iso.split("-").map(Number);
  const next = new Date(Date.UTC(y, m - 1, d + 1));
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${next.getUTCFullYear()}-${pad(next.getUTCMonth() + 1)}-${pad(next.getUTCDate())}T08:00`;
}

export function formatPhoneMask(value: string) {
  let digits = value.replace(/\D/g, "");
  if (digits.startsWith("8")) digits = `7${digits.slice(1)}`;
  if (!digits.startsWith("7")) digits = `7${digits}`;
  digits = digits.slice(0, 11);
  const rest = digits.slice(1);
  if (rest.length <= 3) return `+7 ${rest}`.trim();
  if (rest.length <= 6) return `+7 ${rest.slice(0, 3)} ${rest.slice(3)}`;
  if (rest.length <= 8) return `+7 ${rest.slice(0, 3)} ${rest.slice(3, 6)}-${rest.slice(6)}`;
  return `+7 ${rest.slice(0, 3)} ${rest.slice(3, 6)}-${rest.slice(6, 8)}-${rest.slice(8, 10)}`;
}

export function phonePretty(phone: string) {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 11) {
    return `+${digits[0]} (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7, 9)}-${digits.slice(9)}`;
  }
  return phone;
}

export function phoneHref(phone: string) {
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 10) return null;
  const normalized = digits.length === 11 && digits.startsWith("8") ? `7${digits.slice(1)}` : digits;
  return `tel:+${normalized}`;
}

export function mapsHref(address: string) {
  return `https://yandex.ru/maps/?text=${encodeURIComponent(address)}`;
}

/** Ссылка для людей (MAX, письма). IP из старого APP_URL подменяем на домен. */
export function publicAppUrl() {
  const raw = (process.env.APP_URL || "").replace(/\/$/, "");
  const site = "https://specteh.rad55.ru";
  if (!raw) return site;
  try {
    const url = new URL(raw.includes("://") ? raw : `https://${raw}`);
    if (url.hostname === "localhost" || url.hostname === "127.0.0.1") return raw;
    if (/^\d{1,3}(\.\d{1,3}){3}$/.test(url.hostname)) return site;
    url.protocol = "https:";
    return url.origin;
  } catch {
    return site;
  }
}

export function escapeMaxMarkdown(value: string) {
  return value.replace(/([\\*_`[\]()#+>~|])/g, "\\$1");
}

export function maxBotStartUrl(username: string, payload?: string) {
  const nick = username.replace(/^@/, "").trim();
  if (!nick) return "";
  const base = `https://max.ru/${nick}`;
  if (!payload) return base;
  return `${base}?start=${encodeURIComponent(payload)}`;
}

export function formatDriverWhen(value: Date | string) {
  const d = new Date(value);
  const time = new Intl.DateTimeFormat("ru-RU", { hour: "2-digit", minute: "2-digit" }).format(d);
  const today = new Date();
  const startToday = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  const startThat = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const diff = Math.round((startThat - startToday) / 86_400_000);
  if (diff === 0) return `Сегодня, ${time}`;
  if (diff === 1) return `Завтра, ${time}`;
  if (diff === -1) return `Вчера, ${time}`;
  return `${formatDate(d)}, ${time}`;
}

export function formatDayHeading(value: Date | string) {
  const d = new Date(value);
  const today = new Date();
  const startToday = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  const startThat = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const diff = Math.round((startThat - startToday) / 86_400_000);
  if (diff === 0) return "Сегодня";
  if (diff === 1) return "Завтра";
  if (diff === -1) return "Вчера";
  return new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "long" }).format(d);
}

export function randomToken() {
  const bytes = new Uint8Array(18);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

export function formatClock(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function formatHoursMinutes(ms: number) {
  const totalMin = Math.max(0, Math.floor(ms / 60_000));
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h === 0) return `${m} мин`;
  if (m === 0) return `${h} ч`;
  return `${h} ч ${m} мин`;
}

export function shiftDurationMs(startedAt: Date | string, endedAt?: Date | string | null, now = Date.now()) {
  const start = new Date(startedAt).getTime();
  const end = endedAt ? new Date(endedAt).getTime() : now;
  return Math.max(0, end - start);
}

export function parsePhotos(json: string): string[] {
  try {
    const parsed = JSON.parse(json);
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return [];
  }
}

export function photoSrc(src: string) {
  if (src.startsWith("/uploads/")) return `/api/media/${src.slice("/uploads/".length)}`;
  return src;
}
