"use client";

import { useState } from "react";
import { Field, Input, Select } from "@/components/ui/fields";
import { PAYMENT_METHOD_LABELS, PAYMENT_METHODS } from "@/lib/constants";

export type PaymentOrgMap = Record<string, { vatRate: number; shortName: string }>;

export function PaymentVatFields({
  defaultMethod,
  defaultVatRate,
  orgs,
}: {
  defaultMethod: string;
  defaultVatRate?: number | null;
  orgs: PaymentOrgMap;
}) {
  const [method, setMethod] = useState(defaultMethod);
  const [vatRate, setVatRate] = useState(() => {
    if (defaultMethod === PAYMENT_METHODS.CASHLESS_VAT) {
      return defaultVatRate ?? orgs[defaultMethod]?.vatRate ?? 20;
    }
    return 0;
  });

  function changeMethod(next: string) {
    setMethod(next);
    if (next === PAYMENT_METHODS.CASHLESS_VAT) {
      setVatRate(orgs[next]?.vatRate ?? 20);
    } else {
      setVatRate(0);
    }
  }

  const orgName = orgs[method]?.shortName;

  return (
    <>
      <Field label="Способ оплаты">
        <Select name="paymentMethod" onChange={(e) => changeMethod(e.target.value)} required value={method}>
          {Object.entries(PAYMENT_METHOD_LABELS).map(([key, label]) => (
            <option key={key} value={key}>
              {label}
            </option>
          ))}
        </Select>
      </Field>
      {method === PAYMENT_METHODS.CASHLESS_VAT ? (
        <Field label="Ставка НДС, %">
          <Input
            max={100}
            min={0}
            name="vatRate"
            onChange={(e) => setVatRate(Number(e.target.value))}
            step="0.01"
            type="number"
            value={vatRate}
          />
        </Field>
      ) : (
        <input className="hidden" name="vatRate" type="hidden" value="0" />
      )}
      {orgName ? (
        <p className="text-xs text-slate-500 sm:col-span-2">Документы выйдут от {orgName}</p>
      ) : (
        <p className="text-xs text-amber-700 sm:col-span-2">Нет активного юрлица для этого способа оплаты</p>
      )}
    </>
  );
}
