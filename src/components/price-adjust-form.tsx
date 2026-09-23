"use client";

import { useMemo, useState } from "react";
import { Plus, RotateCcw, Trash2 } from "lucide-react";
import { saveOrderBilling } from "@/actions/orders";
import { SubmitButton } from "@/components/submit-button";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/fields";
import type { PaymentOrgMap } from "@/components/payment-vat-fields";
import { PAYMENT_METHOD_LABELS, PAYMENT_METHODS } from "@/lib/constants";
import { money } from "@/lib/utils";
import { linesFromQty, roundMoney, totalsFromLines, type DocLine, type PriceRate } from "@/lib/pricing-shared";

function uid() {
  return Math.random().toString(36).slice(2, 9);
}

type LineRow = DocLine & { key: string };

export function PriceAdjustForm({
  orderId,
  paymentMethod: initialPayment,
  vatRate: initialVat,
  orgs,
  canVerify,
  report,
  rates,
  initialLines,
}: {
  orderId: string;
  paymentMethod: string;
  vatRate: number;
  orgs: PaymentOrgMap;
  canVerify: boolean;
  report: { deliveryQty: number; hours: number; idleHours: number; km: number; isWeekend: boolean };
  rates: PriceRate[];
  initialLines: DocLine[];
}) {
  const [paymentMethod, setPaymentMethod] = useState(initialPayment);
  const [vatRate, setVatRate] = useState(initialVat);
  const [deliveryQty, setDeliveryQty] = useState(report.deliveryQty);
  const [hours, setHours] = useState(report.hours);
  const [idleHours, setIdleHours] = useState(report.idleHours);
  const [km, setKm] = useState(report.km);
  const [isWeekend, setIsWeekend] = useState(report.isWeekend);
  const [lines, setLines] = useState<LineRow[]>(() =>
    (initialLines.length ? initialLines : linesFromQty(report, rates)).map((line) => ({ ...line, key: uid() })),
  );

  const calc = useMemo(() => totalsFromLines(lines, vatRate), [lines, vatRate]);
  const orgName = orgs[paymentMethod]?.shortName;

  function changeMethod(next: string) {
    setPaymentMethod(next);
    if (next === PAYMENT_METHODS.CASHLESS_VAT) {
      setVatRate(orgs[next]?.vatRate ?? 20);
    } else {
      setVatRate(0);
    }
  }

  function rebuildFromPrice() {
    setLines(linesFromQty({ deliveryQty, hours, idleHours, km, isWeekend }, rates).map((line) => ({ ...line, key: uid() })));
  }

  function patch(key: string, next: Partial<LineRow>) {
    setLines((prev) =>
      prev.map((line) => {
        if (line.key !== key) return line;
        const qty = next.qty ?? line.qty;
        const price = next.price ?? line.price;
        return { ...line, ...next, qty, price, sum: roundMoney(qty * price) };
      }),
    );
  }

  return (
    <form action={saveOrderBilling} className="mt-5 space-y-4">
      <input name="orderId" type="hidden" value={orderId} />
      <input name="paymentMethod" type="hidden" value={paymentMethod} />
      <input name="vatRate" type="hidden" value={String(vatRate)} />
      <input name="lines" type="hidden" value={JSON.stringify(calc.lines)} />

      <div>
        <div className="mb-2 text-sm font-semibold text-navy">Расчёт к оплате</div>
        <p className="mb-3 text-sm text-slate-500">
          Можно поправить способ оплаты, НДС, объём работ и ставки. Цифры водителя сверху не меняются — в счёт пойдёт этот расчёт.
        </p>
        <div className="mb-4 grid gap-3 sm:grid-cols-2">
          <Field label="Способ оплаты">
            <Select onChange={(e) => changeMethod(e.target.value)} value={paymentMethod}>
              {Object.entries(PAYMENT_METHOD_LABELS).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </Select>
          </Field>
          {paymentMethod === PAYMENT_METHODS.CASHLESS_VAT ? (
            <Field label="Ставка НДС, %">
              <Input
                max={100}
                min={0}
                onChange={(e) => setVatRate(Number(e.target.value))}
                step="0.01"
                type="number"
                value={vatRate}
              />
            </Field>
          ) : (
            <div className="flex items-end pb-2 text-sm text-slate-500">НДС не начисляется</div>
          )}
          {orgName ? <p className="text-xs text-slate-500 sm:col-span-2">Документы выйдут от {orgName}</p> : null}
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <QtyField label="Подача" onChange={setDeliveryQty} step={1} value={deliveryQty} />
          <QtyField label="Моточасы" onChange={setHours} step={0.5} value={hours} />
          <QtyField label="Простой, ч" onChange={setIdleHours} step={0.5} value={idleHours} />
          <QtyField label="Километраж" onChange={setKm} step={1} value={km} />
          <label className="flex min-h-10 items-end gap-2 pb-1 text-sm font-semibold text-stone-700">
            <input checked={isWeekend} onChange={(e) => setIsWeekend(e.target.checked)} type="checkbox" />
            Выходной
          </label>
        </div>
        <Button className="mt-3" onClick={rebuildFromPrice} type="button" variant="secondary">
          <RotateCcw className="h-4 w-4" />
          Пересчитать строки по прайсу
        </Button>
      </div>

      <div className="overflow-x-auto rounded-2xl ring-1 ring-slate-200">
        <table className="w-full min-w-[40rem] text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-3 py-2 font-semibold">Услуга</th>
              <th className="px-3 py-2 font-semibold">Кол-во</th>
              <th className="px-3 py-2 font-semibold">Ед.</th>
              <th className="px-3 py-2 font-semibold">Цена</th>
              <th className="px-3 py-2 font-semibold">Сумма</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {lines.map((line) => (
              <tr className="border-t border-slate-100" key={line.key}>
                <td className="px-3 py-2">
                  <input
                    className="h-9 w-full rounded-xl border border-stone-200 px-2"
                    onChange={(e) => patch(line.key, { name: e.target.value })}
                    value={line.name}
                  />
                </td>
                <td className="px-3 py-2">
                  <input
                    className="h-9 w-24 rounded-xl border border-stone-200 px-2 text-right"
                    min={0}
                    onChange={(e) => patch(line.key, { qty: Number(e.target.value) })}
                    step="0.01"
                    type="number"
                    value={line.qty}
                  />
                </td>
                <td className="px-3 py-2">
                  <input
                    className="h-9 w-24 rounded-xl border border-stone-200 px-2"
                    onChange={(e) => patch(line.key, { unit: e.target.value })}
                    value={line.unit}
                  />
                </td>
                <td className="px-3 py-2">
                  <input
                    className="h-9 w-28 rounded-xl border border-stone-200 px-2 text-right"
                    min={0}
                    onChange={(e) => patch(line.key, { price: Number(e.target.value) })}
                    step="0.01"
                    type="number"
                    value={line.price}
                  />
                </td>
                <td className="px-3 py-2 font-semibold">{money(line.sum)}</td>
                <td className="px-3 py-2">
                  <button
                    aria-label="Удалить строку"
                    className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-navy"
                    onClick={() => setLines((prev) => prev.filter((item) => item.key !== line.key))}
                    type="button"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <button
        className="inline-flex items-center gap-2 text-sm font-semibold text-menu-hover"
        onClick={() =>
          setLines((prev) => [...prev, { key: uid(), name: "", qty: 1, unit: "шт", price: 0, sum: 0, kind: "CUSTOM" }])
        }
        type="button"
      >
        <Plus className="h-4 w-4" />
        Добавить строку
      </button>

      <div className="max-w-sm rounded-2xl bg-slate-50 p-4 text-sm">
        <div className="flex justify-between py-0.5">
          <span>Подытог</span>
          <span>{money(calc.subtotal)}</span>
        </div>
        {vatRate > 0 ? (
          <div className="flex justify-between py-0.5">
            <span>Сумма НДС {vatRate}% -</span>
            <span>{money(calc.vatAmount)}</span>
          </div>
        ) : (
          <div className="py-0.5 text-slate-500">Без НДС</div>
        )}
        <div className="mt-2 flex justify-between font-semibold">
          <span>Итого</span>
          <span>{money(calc.total)}</span>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <SubmitButton>Сохранить расчёт</SubmitButton>
        {canVerify ? (
          <SubmitButton name="verify" value="1" variant="success">
            Сохранить и подтвердить
          </SubmitButton>
        ) : null}
      </div>
    </form>
  );
}

function QtyField({
  label,
  value,
  onChange,
  step,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  step: number;
}) {
  return (
    <label className="block text-sm font-semibold text-stone-700">
      {label}
      <input
        className="mt-1 h-10 w-full rounded-2xl border border-stone-200 px-3 text-sm"
        min={0}
        onChange={(e) => onChange(Number(e.target.value))}
        step={step}
        type="number"
        value={value}
      />
    </label>
  );
}
