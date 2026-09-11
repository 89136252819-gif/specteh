import { prisma } from "@/lib/db";
import { BUSINESS_TZ } from "@/lib/utils";

/** Дата создания в Омске как ДДММГГ для шифра заявки. */
export function orderNumberDateStamp(date = new Date(), timeZone = BUSINESS_TZ) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
  }).formatToParts(date);
  const get = (type: string) => parts.find((part) => part.type === type)?.value || "00";
  return `${get("day")}${get("month")}${get("year")}`;
}

export function formatOrderNumber(seq: number, date = new Date()) {
  return `З-${orderNumberDateStamp(date)}-${String(seq).padStart(4, "0")}`;
}

export async function nextOrderNumber() {
  const seq = await prisma.appSequence.upsert({
    where: { key: "order" },
    update: { value: { increment: 1 } },
    create: { key: "order", value: 1 },
  });
  return formatOrderNumber(seq.value);
}
