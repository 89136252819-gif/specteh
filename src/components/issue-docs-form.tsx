"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";
import { issueManualDocuments, updateOrderDocuments } from "@/actions/orders";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/fields";
import type { PaymentOrgMap } from "@/components/payment-vat-fields";
import { PAYMENT_METHOD_LABELS, PAYMENT_METHODS } from "@/lib/constants";
import { money } from "@/lib/utils";
import { applyManualTotals, roundMoney, totalsFromLines, type DocLine } from "@/lib/pricing-shared";

function uid() {
  return Math.random().toString(36).slice(2, 9);
}

const DATE_INPUT_RE = /^\d{4}-\d{2}-\d{2}$/;

type LineRow = DocLine & { key: string };

export function IssueDocsForm({
  orderId,
  paymentMethod: initialPayment,
  vatRate: initialVat,
  orgs,
  initialLines,
  mode = "create",
  customerId: initialCustomerId,
  customers = [],
  paymentPurpose: initialPaymentPurpose = "",
  initialTotal,
  initialVatAmount,
  invoiceDate: initialInvoiceDate = "",
  actDate: initialActDate = "",
  onSaved,
}: {
  orderId: string;
  paymentMethod: string;
  vatRate: number;
  orgs: PaymentOrgMap;
  initialLines?: DocLine[];
  mode?: "create" | "edit";
  customerId?: string;
  customers?: { id: string; name: string; phone: string }[];
  paymentPurpose?: string;
  initialTotal?: number;
  initialVatAmount?: number;
  invoiceDate?: string;
  actDate?: string;
  onSaved?: () => void;
}) {
  const [paymentMethod, setPaymentMethod] = useState(initialPayment);
  const [vatRate, setVatRate] = useState(initialVat);
  const [customerId, setCustomerId] = useState(initialCustomerId || "");
  const [customerQuery, setCustomerQuery] = useState("");
  const [paymentPurpose, setPaymentPurpose] = useState(initialPaymentPurpose);
  const [invoiceDate, setInvoiceDate] = useState(initialInvoiceDate);
  const [actDate, setActDate] = useState(initialActDate);
  const [lines, setLines] = useState<LineRow[]>(() =>
    (initialLines?.length
      ? initialLines
      : [{ name: "", qty: 1, unit: "час", price: 0, sum: 0 }]
    ).map((line) => ({ ...line, key: uid() })),
  );
  const auto = useMemo(() => totalsFromLines(lines, vatRate), [lines, vatRate]);
  const [manual, setManual] = useState(() => {
    if (initialTotal == null || !Number.isFinite(initialTotal)) return false;
    const probe = totalsFromLines(
      (initialLines?.length ? initialLines : []).map((line) => ({ ...line })),
      initialVat,
    );
    return Math.abs(probe.total - initialTotal) > 0.01 || Math.abs(probe.vatAmount - (initialVatAmount ?? 0)) > 0.01;
  });
  const [manualTotal, setManualTotal] = useState(() =>
    initialTotal != null && Number.isFinite(initialTotal) ? String(initialTotal) : "",
  );
  const [manualVatAmount, setManualVatAmount] = useState(() =>
    initialVatAmount != null && Number.isFinite(initialVatAmount) ? String(initialVatAmount) : "",
  );
  const [error, setError] = useState("");
  const [ok, setOk] = useState(false);
  const [pending, start] = useTransition();
  const editing = mode === "edit";
  const router = useRouter();

  const calc = useMemo(() => {
    if (!manual) return auto;
    return applyManualTotals(auto, {
      total: Number(manualTotal),
      vatAmount: vatRate > 0 ? Number(manualVatAmount) : 0,
    });
  }, [auto, manual, manualTotal, manualVatAmount, vatRate]);

  const orgName = orgs[paymentMethod]?.shortName;
  const filteredCustomers = useMemo(() => {
    const q = customerQuery.trim().toLowerCase();
    if (!q) return customers.slice(0, 80);
    return customers
      .filter((row) => `${row.name} ${row.phone}`.toLowerCase().includes(q))
      .slice(0, 80);
  }, [customers, customerQuery]);
  const selectedCustomer = customers.find((row) => row.id === customerId);

  function changeMethod(next: string) {
    setPaymentMethod(next);
    if (next === PAYMENT_METHODS.CASHLESS_VAT) {
      setVatRate(orgs[next]?.vatRate ?? 20);
    } else {
      setVatRate(0);
      if (manual) setManualVatAmount("0");
    }
  }

  function enableManual() {
    setManualTotal(String(auto.total));
    setManualVatAmount(String(auto.vatAmount));
    setManual(true);
  }

  function disableManual() {
    setManual(false);
    setManualTotal("");
    setManualVatAmount("");
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

  function submit() {
    start(async () => {
      setError("");
      setOk(false);
      if (editing && (!DATE_INPUT_RE.test(invoiceDate) || !DATE_INPUT_RE.test(actDate))) {
        setError("Укажите дату счёта и дату акта");
        return;
      }
      if (manual) {
        const total = Number(manualTotal);
        if (!Number.isFinite(total) || total <= 0) {
          setError("Укажите корректную итоговую сумму");
          return;
        }
        if (vatRate > 0) {
          const vat = Number(manualVatAmount);
          if (!Number.isFinite(vat) || vat < 0) {
            setError("Укажите корректную сумму НДС");
            return;
          }
          if (vat > total) {
            setError("НДС не может быть больше итоговой суммы");
            return;
          }
        }
      }
      const formData = new FormData();
      formData.set("orderId", orderId);
      formData.set("paymentMethod", paymentMethod);
      formData.set("vatRate", String(vatRate));
      formData.set("lines", JSON.stringify(auto.lines));
      formData.set("paymentPurpose", paymentPurpose.trim());
      if (manual) {
        formData.set("manualTotals", "1");
        formData.set("manualTotal", String(roundMoney(Number(manualTotal))));
        formData.set("manualVatAmount", String(vatRate > 0 ? roundMoney(Number(manualVatAmount)) : 0));
      }
      if (customerId) formData.set("customerId", customerId);
      if (editing) {
        formData.set("invoiceIssuedAt", invoiceDate);
        formData.set("actIssuedAt", actDate);
      }
      const result = editing ? await updateOrderDocuments(formData) : await issueManualDocuments(formData);
      if (result && "error" in result && result.error) {
        setError(result.error);
        return;
      }
      if (editing) {
        setOk(true);
        router.refresh();
        onSaved?.();
      }
    });
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-500">
        {editing
          ? "Можно поправить заказчика, даты, позиции, НДС и способ оплаты. Счёт и акт обновятся вместе."
          : "Счёт и акт создаются сразу и привязываются к этой заявке. Можно заполнить строки вручную — отчёт водителя не обязателен."}
      </p>

      {customers.length > 0 ? (
        <div className="space-y-2">
          <Field label="Заказчик">
            <Input
              onChange={(e) => setCustomerQuery(e.target.value)}
              placeholder="Поиск по имени или телефону"
              value={customerQuery}
            />
          </Field>
          {selectedCustomer ? (
            <div className="rounded-2xl bg-menu-soft/70 px-3 py-2 text-sm font-semibold text-navy ring-1 ring-menu/20">
              Сейчас: {selectedCustomer.name}
              {selectedCustomer.phone ? ` · ${selectedCustomer.phone}` : ""}
            </div>
          ) : null}
          <ul className="max-h-44 overflow-auto rounded-2xl border border-slate-200 bg-white">
            {filteredCustomers.map((row) => (
              <li key={row.id}>
                <button
                  className={
                    row.id === customerId
                      ? "flex w-full flex-col items-start bg-menu-soft px-3 py-2 text-left text-sm"
                      : "flex w-full flex-col items-start px-3 py-2 text-left text-sm hover:bg-menu-soft/50"
                  }
                  onClick={() => setCustomerId(row.id)}
                  type="button"
                >
                  <span className="font-semibold text-navy">{row.name}</span>
                  {row.phone ? <span className="text-xs text-slate-500">{row.phone}</span> : null}
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {editing ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Дата счёта">
            <Input onChange={(e) => setInvoiceDate(e.target.value)} type="date" value={invoiceDate} />
          </Field>
          <Field label="Дата акта">
            <Input onChange={(e) => setActDate(e.target.value)} type="date" value={actDate} />
          </Field>
          <p className="text-xs text-slate-500 sm:col-span-2">
            Дата уйдёт в PDF, выгрузку для бухгалтерии и отчёты. Срок оплаты сдвинется вместе с датой счёта.
          </p>
        </div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2">
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
          <p className="self-end text-xs text-slate-500">Без НДС</p>
        )}
      </div>
      {orgName ? (
        <p className="text-xs text-slate-500">Документы от {orgName}</p>
      ) : (
        <p className="text-xs font-semibold text-amber-700">Нет юрлица для этого способа оплаты</p>
      )}

      <Field label="Назначение платежа">
        <Textarea
          onChange={(e) => setPaymentPurpose(e.target.value)}
          placeholder={
            editing
              ? "Текст для банковского перевода и PDF счёта"
              : "Если пусто — сформируется автоматически после выставления"
          }
          rows={3}
          value={paymentPurpose}
        />
      </Field>

      <div className="space-y-2">
        <div className="text-sm font-semibold text-navy">Позиции</div>
        {lines.map((line) => (
          <div
            className="grid gap-2 rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-200 sm:grid-cols-[1fr_5rem_5rem_6rem_auto]"
            key={line.key}
          >
            <Input
              onChange={(e) => patch(line.key, { name: e.target.value })}
              placeholder="Наименование"
              value={line.name}
            />
            <Input
              min={0}
              onChange={(e) => patch(line.key, { qty: Number(e.target.value) })}
              placeholder="Кол-во"
              step="0.01"
              type="number"
              value={line.qty}
            />
            <Input onChange={(e) => patch(line.key, { unit: e.target.value })} placeholder="Ед." value={line.unit} />
            <Input
              min={0}
              onChange={(e) => patch(line.key, { price: Number(e.target.value) })}
              placeholder="Цена"
              step="0.01"
              type="number"
              value={line.price}
            />
            <button
              aria-label="Удалить строку"
              className="flex h-10 w-10 items-center justify-center rounded-2xl text-slate-400 hover:bg-white hover:text-rose-600"
              onClick={() => setLines((prev) => (prev.length <= 1 ? prev : prev.filter((row) => row.key !== line.key)))}
              type="button"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
        <button
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-menu-hover"
          onClick={() =>
            setLines((prev) => [...prev, { key: uid(), name: "", qty: 1, unit: "час", price: 0, sum: 0 }])
          }
          type="button"
        >
          <Plus className="h-4 w-4" />
          Добавить строку
        </button>
      </div>

      <div className="max-w-sm space-y-3 rounded-2xl bg-slate-50 p-4 text-sm">
        <div className="flex items-center justify-between gap-2">
          <span className="font-semibold text-navy">Итоги</span>
          {manual ? (
            <Button onClick={disableManual} size="sm" type="button" variant="secondary">
              Авторасчёт
            </Button>
          ) : (
            <Button onClick={enableManual} size="sm" type="button" variant="secondary">
              Ручной ввод
            </Button>
          )}
        </div>

        {manual ? (
          <div className="space-y-3">
            <Field label="Итого, ₽">
              <Input
                min={0.01}
                onChange={(e) => setManualTotal(e.target.value)}
                step="0.01"
                type="number"
                value={manualTotal}
              />
            </Field>
            {vatRate > 0 ? (
              <Field label="Сумма НДС, ₽">
                <Input
                  min={0}
                  onChange={(e) => setManualVatAmount(e.target.value)}
                  step="0.01"
                  type="number"
                  value={manualVatAmount}
                />
              </Field>
            ) : (
              <p className="text-xs text-slate-500">Без НДС</p>
            )}
            <div className="flex justify-between py-0.5 text-xs text-slate-500">
              <span>Подытог (итог − НДС)</span>
              <span>{money(calc.subtotal)}</span>
            </div>
            <p className="text-xs text-slate-500">
              По строкам было {money(auto.total)}
              {auto.vatAmount > 0 ? `, НДС ${money(auto.vatAmount)}` : ""}
            </p>
          </div>
        ) : (
          <>
            <div className="flex justify-between py-0.5">
              <span>Подытог</span>
              <span>{money(calc.subtotal)}</span>
            </div>
            {vatRate > 0 ? (
              <div className="flex justify-between py-0.5">
                <span>Сумма НДС {vatRate}% -</span>
                <span>{money(calc.vatAmount)}</span>
              </div>
            ) : null}
            <div className="mt-2 flex justify-between font-semibold">
              <span>Итого</span>
              <span>{money(calc.total)}</span>
            </div>
          </>
        )}
      </div>

      {error ? <p className="text-sm font-semibold text-rose-700">{error}</p> : null}
      {ok ? <p className="text-sm font-semibold text-emerald-700">Сохранено — PDF обновится при следующем открытии</p> : null}

      <Button disabled={pending || !orgName} onClick={submit} type="button">
        {pending ? "Сохраняем…" : editing ? "Сохранить изменения" : "Выставить счёт и акт"}
      </Button>
    </div>
  );
}
