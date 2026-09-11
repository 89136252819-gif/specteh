import { PRICE_KIND_LABELS, PRICE_KINDS } from "./constants";

export type DocLine = {
  name: string;
  qty: number;
  unit: string;
  price: number;
  sum: number;
  kind?: string;
};

export type CalcResult = {
  lines: DocLine[];
  subtotal: number;
  vatRate: number;
  vatAmount: number;
  total: number;
};

export type PriceRate = {
  kind: string;
  label: string;
  unit: string;
  amount: number;
};

export const PRICE_UNITS: Record<string, string> = {
  [PRICE_KINDS.DELIVERY]: "подача",
  [PRICE_KINDS.DELIVERY_REGION]: "подача",
  [PRICE_KINDS.HOUR]: "час",
  [PRICE_KINDS.MIN_HOURS]: "час",
  [PRICE_KINDS.IDLE]: "час",
  [PRICE_KINDS.KM]: "км",
  [PRICE_KINDS.WEEKEND]: "час",
};

export function roundMoney(value: number) {
  return Math.round(value * 100) / 100;
}

export function resolveVatRate(
  paymentMethod: string,
  override: number | null | undefined,
  orgVatRate: number,
) {
  if (paymentMethod !== "CASHLESS_VAT") return 0;
  if (override != null && Number.isFinite(override)) return override;
  return orgVatRate;
}

export function storedDocVatRate(opts: {
  vatRate: number | null | undefined;
  vatAmount: number;
  amount: number;
  paymentMethod: string;
  orgVatRate: number;
}) {
  if (opts.vatRate != null && Number.isFinite(opts.vatRate)) return opts.vatRate;
  if (opts.vatAmount > 0) {
    const subtotal = opts.amount - opts.vatAmount;
    if (subtotal > 0) return roundMoney((opts.vatAmount / subtotal) * 100);
  }
  return resolveVatRate(opts.paymentMethod, null, opts.orgVatRate);
}

export function totalsFromLines(lines: DocLine[], vatRate: number): CalcResult {
  const normalized = lines
    .map((line) => {
      const qty = Number(line.qty) || 0;
      const price = Number(line.price) || 0;
      return {
        name: String(line.name || "").trim(),
        qty,
        unit: String(line.unit || "").trim() || "шт",
        price,
        sum: roundMoney(qty * price),
        kind: line.kind,
      };
    })
    .filter((line) => line.name && line.qty);
  const subtotal = roundMoney(normalized.reduce((sum, line) => sum + line.sum, 0));
  const vatAmount = roundMoney(subtotal * (vatRate / 100));
  return {
    lines: normalized,
    subtotal,
    vatRate,
    vatAmount,
    total: roundMoney(subtotal + vatAmount),
  };
}

/** Подставляет вручную введённые итог и НДС поверх расчёта по строкам. */
export function applyManualTotals(
  calc: CalcResult,
  override?: { total?: number | null; vatAmount?: number | null } | null,
): CalcResult {
  if (!override) return calc;
  const hasTotal = override.total != null && Number.isFinite(override.total);
  const hasVat = override.vatAmount != null && Number.isFinite(override.vatAmount);
  if (!hasTotal && !hasVat) return calc;

  const total = hasTotal ? roundMoney(Number(override.total)) : calc.total;
  let vatAmount = hasVat ? roundMoney(Number(override.vatAmount)) : calc.vatAmount;
  if (calc.vatRate <= 0) vatAmount = 0;
  if (vatAmount < 0) vatAmount = 0;
  if (vatAmount > total) vatAmount = total;
  const subtotal = roundMoney(Math.max(total - vatAmount, 0));
  return { ...calc, subtotal, vatAmount, total };
}

export function parseBillingJson(json: string | null | undefined): CalcResult | null {
  if (!json) return null;
  try {
    const parsed = JSON.parse(json) as { lines?: DocLine[]; vatRate?: number };
    if (!Array.isArray(parsed.lines)) return null;
    return totalsFromLines(parsed.lines, Number(parsed.vatRate) || 0);
  } catch {
    return null;
  }
}

export function linesFromQty(
  qty: { deliveryQty: number; hours: number; idleHours: number; km: number; isWeekend: boolean },
  rates: PriceRate[],
): DocLine[] {
  const byKind = new Map(rates.map((item) => [item.kind, item]));
  const add = (kind: string, value: number) => {
    if (!value) return null;
    const item = byKind.get(kind);
    const price = item?.amount ?? 0;
    return {
      name: item?.label || PRICE_KIND_LABELS[kind] || kind,
      qty: value,
      unit: item?.unit || PRICE_UNITS[kind] || "шт",
      price,
      sum: roundMoney(value * price),
      kind,
    } satisfies DocLine;
  };
  const lines: DocLine[] = [];
  const push = (kind: string, value: number) => {
    const row = add(kind, value);
    if (row) lines.push(row);
  };
  const minHours = byKind.get(PRICE_KINDS.MIN_HOURS)?.amount || 0;
  push(PRICE_KINDS.DELIVERY, qty.deliveryQty);
  push(PRICE_KINDS.HOUR, qty.hours ? Math.max(qty.hours, minHours) : 0);
  push(PRICE_KINDS.IDLE, qty.idleHours);
  push(PRICE_KINDS.KM, qty.km);
  if (qty.isWeekend) push(PRICE_KINDS.WEEKEND, qty.hours);
  return lines;
}
