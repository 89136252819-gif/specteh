"use client";

import { FormEvent, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, X } from "lucide-react";
import { updateOrderDetails } from "@/actions/orders";
import { AddressSuggest } from "@/components/address-suggest";
import { CenterModal } from "@/components/center-modal";
import { OrderCustomerPicker } from "@/components/order-customer-picker";
import type { PaymentOrgMap } from "@/components/payment-vat-fields";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/fields";
import { applyManualTotals, roundMoney, totalsFromLines, type DocLine } from "@/lib/pricing-shared";
import { PAYMENT_METHOD_LABELS, PAYMENT_METHODS } from "@/lib/constants";
import { money, toDatetimeLocal } from "@/lib/utils";

function uid() {
  return Math.random().toString(36).slice(2, 9);
}

const DATE_INPUT_RE = /^\d{4}-\d{2}-\d{2}$/;

type LineRow = DocLine & { key: string };
type CustomerOption = { id: string; name: string; phone: string };

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h4 className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-slate-500">{title}</h4>
      {children}
    </section>
  );
}

export function EditOrderButton({
  orderId,
  customerId,
  customers,
  address,
  scheduledAt,
  siteContact,
  sitePhone,
  comment,
  paymentMethod,
  vatRate,
  orgs,
  canEditBasics,
  hasDocuments,
  invoiceDate = "",
  actDate = "",
  paymentPurpose = "",
  initialLines,
  initialTotal,
  initialVatAmount,
}: {
  orderId: string;
  customerId: string;
  customers: CustomerOption[];
  address: string;
  scheduledAt: string | Date;
  siteContact: string | null;
  sitePhone: string | null;
  comment: string | null;
  paymentMethod: string;
  vatRate: number | null;
  orgs: PaymentOrgMap;
  canEditBasics: boolean;
  hasDocuments: boolean;
  invoiceDate?: string;
  actDate?: string;
  paymentPurpose?: string;
  initialLines?: DocLine[];
  initialTotal?: number;
  initialVatAmount?: number;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  const [mode, setMode] = useState<"existing" | "new">("existing");
  const [selectedId, setSelectedId] = useState(customerId);
  const [invoiceIssuedAt, setInvoiceIssuedAt] = useState(invoiceDate);
  const [actIssuedAt, setActIssuedAt] = useState(actDate);
  const [purpose, setPurpose] = useState(paymentPurpose);
  const [method, setMethod] = useState(paymentMethod);
  const [vatRateState, setVatRateState] = useState(
    paymentMethod === PAYMENT_METHODS.CASHLESS_VAT ? (vatRate ?? orgs[paymentMethod]?.vatRate ?? 20) : 0,
  );
  const [lines, setLines] = useState<LineRow[]>(() =>
    (initialLines?.length ? initialLines : [{ name: "", qty: 1, unit: "час", price: 0, sum: 0 }]).map((line) => ({
      ...line,
      key: uid(),
    })),
  );
  const auto = useMemo(() => totalsFromLines(lines, vatRateState), [lines, vatRateState]);
  const [manual, setManual] = useState(() => {
    if (initialTotal == null || !Number.isFinite(initialTotal)) return false;
    const probe = totalsFromLines((initialLines?.length ? initialLines : []).map((line) => ({ ...line })), vatRate ?? 0);
    return Math.abs(probe.total - initialTotal) > 0.01 || Math.abs(probe.vatAmount - (initialVatAmount ?? 0)) > 0.01;
  });
  const [manualTotal, setManualTotal] = useState(() =>
    initialTotal != null && Number.isFinite(initialTotal) ? String(initialTotal) : "",
  );
  const [manualVatAmount, setManualVatAmount] = useState(() =>
    initialVatAmount != null && Number.isFinite(initialVatAmount) ? String(initialVatAmount) : "",
  );

  const calc = useMemo(() => {
    if (!manual) return auto;
    return applyManualTotals(auto, {
      total: Number(manualTotal),
      vatAmount: vatRateState > 0 ? Number(manualVatAmount) : 0,
    });
  }, [auto, manual, manualTotal, manualVatAmount, vatRateState]);

  function openModal() {
    setError("");
    setMode("existing");
    setSelectedId(customerId);
    setInvoiceIssuedAt(invoiceDate);
    setActIssuedAt(actDate);
    setPurpose(paymentPurpose);
    setMethod(paymentMethod);
    setVatRateState(
      paymentMethod === PAYMENT_METHODS.CASHLESS_VAT ? (vatRate ?? orgs[paymentMethod]?.vatRate ?? 20) : 0,
    );
    setLines(
      (initialLines?.length ? initialLines : [{ name: "", qty: 1, unit: "час", price: 0, sum: 0 }]).map((line) => ({
        ...line,
        key: uid(),
      })),
    );
    setOpen(true);
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

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const fd = new FormData(event.currentTarget);
    fd.set("orderId", orderId);
    fd.set("customerMode", mode);
    fd.set("customerId", mode === "existing" ? selectedId : "");
    if (hasDocuments) {
      if (!DATE_INPUT_RE.test(invoiceIssuedAt) || !DATE_INPUT_RE.test(actIssuedAt)) {
        setError("Укажите дату счёта и дату акта");
        return;
      }
      fd.set("invoiceIssuedAt", invoiceIssuedAt);
      fd.set("actIssuedAt", actIssuedAt);
      fd.set("paymentPurpose", purpose.trim());
      fd.set("lines", JSON.stringify(auto.lines));
      if (manual) {
        const total = Number(manualTotal);
        if (!Number.isFinite(total) || total <= 0) {
          setError("Укажите корректную итоговую сумму");
          return;
        }
        fd.set("manualTotals", "1");
        fd.set("manualTotal", String(roundMoney(total)));
        fd.set("manualVatAmount", String(vatRateState > 0 ? roundMoney(Number(manualVatAmount) || 0) : 0));
      }
    }
    start(async () => {
      setError("");
      const result = await updateOrderDetails(fd);
      if (result && "error" in result && result.error) {
        setError(result.error);
        return;
      }
      router.refresh();
      setOpen(false);
    });
  }

  return (
    <>
      <Button onClick={openModal} size="sm" type="button">
        Редактировать заявку
      </Button>
      <CenterModal
        className="max-w-3xl h-[min(88vh,52rem)] overflow-hidden sm:!max-h-[min(88vh,52rem)]"
        labelledBy="edit-order-title"
        onClose={() => setOpen(false)}
        open={open}
        placement="center"
      >
        <form className="flex h-full min-h-0 flex-col overflow-hidden" onSubmit={onSubmit}>
          <div className="flex shrink-0 items-start justify-between gap-3 border-b border-slate-100 px-5 py-4">
            <div>
              <h3 className="text-lg font-extrabold text-navy" id="edit-order-title">
                Редактировать заявку
              </h3>
              <p className="mt-1 text-sm text-slate-500">
                Заказчик, подача, оплата{hasDocuments ? ", суммы и даты счёта/акта" : ""} — в одном окне.
              </p>
            </div>
            <button
              aria-label="Закрыть"
              className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-navy"
              onClick={() => setOpen(false)}
              type="button"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-5 py-4">
            <Section title="Заказчик">
              <OrderCustomerPicker
                customers={customers}
                defaultCustomerId={customerId}
                mode={mode}
                onModeChange={setMode}
                onSelectedIdChange={setSelectedId}
                selectedId={selectedId}
              />
            </Section>

            <Section title="Подача">
              {canEditBasics ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field className="sm:col-span-2" label="Адрес объекта">
                    <AddressSuggest defaultValue={address} name="address" placeholder="Омск, улица, ориентир" required />
                  </Field>
                  <Field label="Дата и время подачи">
                    <Input defaultValue={toDatetimeLocal(scheduledAt)} name="scheduledAt" required type="datetime-local" />
                  </Field>
                  <Field label="Контакт на объекте">
                    <Input defaultValue={siteContact || ""} name="siteContact" />
                  </Field>
                  <Field label="Телефон на объекте">
                    <Input defaultValue={sitePhone || ""} name="sitePhone" />
                  </Field>
                  <Field className="sm:col-span-2" label="Комментарий">
                    <Textarea defaultValue={comment || ""} name="comment" />
                  </Field>
                </div>
              ) : (
                <p className="text-sm text-slate-500">Адрес и время подачи в оплаченной заявке не меняются.</p>
              )}
            </Section>

            <Section title="Оплата и НДС">
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Способ оплаты">
                  <Select
                    name="paymentMethod"
                    onChange={(e) => {
                      const next = e.target.value;
                      setMethod(next);
                      if (next === PAYMENT_METHODS.CASHLESS_VAT) {
                        setVatRateState(orgs[next]?.vatRate ?? 20);
                      } else {
                        setVatRateState(0);
                        if (manual) setManualVatAmount("0");
                      }
                    }}
                    required
                    value={method}
                  >
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
                      onChange={(e) => setVatRateState(Number(e.target.value))}
                      step="0.01"
                      type="number"
                      value={vatRateState}
                    />
                  </Field>
                ) : (
                  <input name="vatRate" readOnly type="hidden" value="0" />
                )}
                {orgs[method]?.shortName ? (
                  <p className="text-xs text-slate-500 sm:col-span-2">Документы выйдут от {orgs[method].shortName}</p>
                ) : (
                  <p className="text-xs font-semibold text-amber-700 sm:col-span-2">
                    Нет активного юрлица для этого способа оплаты
                  </p>
                )}
              </div>
            </Section>

            {hasDocuments ? (
              <>
                <Section title="Даты документов">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Field label="Дата счёта">
                      <Input onChange={(e) => setInvoiceIssuedAt(e.target.value)} type="date" value={invoiceIssuedAt} />
                    </Field>
                    <Field label="Дата акта">
                      <Input onChange={(e) => setActIssuedAt(e.target.value)} type="date" value={actIssuedAt} />
                    </Field>
                    <p className="text-xs text-slate-500 sm:col-span-2">
                      Дата уйдёт в PDF и отчёты. Срок оплаты сдвинется вместе с датой счёта.
                    </p>
                  </div>
                </Section>

                <Section title="Назначение платежа">
                  <Textarea
                    onChange={(e) => setPurpose(e.target.value)}
                    placeholder="Текст для банковского перевода и PDF счёта"
                    rows={3}
                    value={purpose}
                  />
                </Section>

                <Section title="Позиции и суммы">
                  <div className="space-y-2">
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
                        <Button
                          onClick={() => {
                            setManual(false);
                            setManualTotal("");
                            setManualVatAmount("");
                          }}
                          size="sm"
                          type="button"
                          variant="secondary"
                        >
                          Авторасчёт
                        </Button>
                      ) : (
                        <Button
                          onClick={() => {
                            setManualTotal(String(auto.total));
                            setManualVatAmount(String(auto.vatAmount));
                            setManual(true);
                          }}
                          size="sm"
                          type="button"
                          variant="secondary"
                        >
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
                        {vatRateState > 0 ? (
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
                      </div>
                    ) : (
                      <>
                        <div className="flex justify-between py-0.5">
                          <span>Подытог</span>
                          <span>{money(calc.subtotal)}</span>
                        </div>
                        {vatRateState > 0 ? (
                          <div className="flex justify-between py-0.5">
                            <span>Сумма НДС {vatRateState}% -</span>
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
                </Section>
              </>
            ) : null}

            {error ? <p className="text-sm font-semibold text-rose-800">{error}</p> : null}
          </div>

          <div className="flex shrink-0 flex-wrap gap-2 border-t border-slate-100 bg-white px-5 py-4">
            <Button disabled={pending} type="submit">
              {pending ? "Сохраняем…" : "Сохранить заявку"}
            </Button>
            <Button disabled={pending} onClick={() => setOpen(false)} type="button" variant="secondary">
              Отмена
            </Button>
          </div>
        </form>
      </CenterModal>
    </>
  );
}
