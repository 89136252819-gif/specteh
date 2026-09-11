"use client";

import { useActionState, useEffect, useState } from "react";
import { AddressSuggest } from "@/components/address-suggest";
import { submitPublicOrder } from "@/actions/public-order";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/fields";
import { PAYMENT_METHOD_LABELS, PAYMENT_METHODS, type PaymentMethod } from "@/lib/constants";
import { formatPhoneMask, formatPublicPrice, maxBotStartUrl, omskTomorrowMorning, phonePretty } from "@/lib/utils";
import { EquipmentTypeIcon } from "@/components/equipment-type-icon";

export type PublicTypeOption = {
  id: string;
  name: string;
  hourPrice: number | null;
  deliveryPrice: number | null;
  regionDeliveryPrice?: number | null;
  minHours?: number | null;
  units?: string[];
};

const PAY_OPTIONS: PaymentMethod[] = [
  PAYMENT_METHODS.CASH,
  PAYMENT_METHODS.CASHLESS_NO_VAT,
  PAYMENT_METHODS.CASHLESS_VAT,
];

export function PublicOrderForm({
  types,
  initialTypeId,
  botUsername,
}: {
  types: PublicTypeOption[];
  initialTypeId?: string;
  botUsername?: string;
}) {
  const [state, action, pending] = useActionState(submitPublicOrder, null);
  const [typeId, setTypeId] = useState(initialTypeId && types.some((t) => t.id === initialTypeId) ? initialTypeId : types[0]?.id || "");
  const [phone, setPhone] = useState("");
  const [pay, setPay] = useState<PaymentMethod>(PAYMENT_METHODS.CASHLESS_VAT);
  const defaultTime = omskTomorrowMorning();

  useEffect(() => {
    if (initialTypeId && types.some((item) => item.id === initialTypeId)) {
      setTypeId(initialTypeId);
    }
  }, [initialTypeId, types]);

  if (state?.ok) {
    const botUrl = botUsername && state.bindToken ? maxBotStartUrl(botUsername, state.bindToken) : botUsername ? maxBotStartUrl(botUsername) : "";
    return (
      <div className="rounded-[1.75rem] bg-emerald-50 px-6 py-10 text-center ring-1 ring-emerald-100">
        <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-emerald-800">Заявка принята</p>
        <h3 className="mt-3 text-2xl font-extrabold text-navy">{state.number ? `№ ${state.number}` : "Спасибо"}</h3>
        <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-emerald-900/80">
          Диспетчер перезвонит{state.phone ? ` на ${phonePretty(state.phone)}` : ""} и подтвердит технику и время подачи.
        </p>
        {botUrl ? (
          <div className="mx-auto mt-6 max-w-md">
            <a
              className="inline-flex h-12 w-full items-center justify-center rounded-2xl bg-gradient-to-b from-menu to-menu-hover text-base font-semibold text-white shadow-md shadow-menu/25"
              href={botUrl}
              rel="noopener noreferrer"
              target="_blank"
            >
              Получать уведомления в MAX
            </a>
            <p className="mt-3 text-sm leading-relaxed text-slate-600">
              Откроется чат с ботом. Там будет кнопка — статусы этой заявки начнут приходить вам в MAX.
            </p>
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <form action={action} className="space-y-5" id="order-form">
      <input autoComplete="off" className="hidden" name="website" tabIndex={-1} />
      <input name="equipmentTypeId" type="hidden" value={typeId} />
      <input name="paymentMethod" type="hidden" value={pay} />

      <div>
        <div className="mb-2 text-sm font-semibold text-stone-700">Техника</div>
        <div className="grid gap-2 sm:grid-cols-2">
          {types.map((type) => {
            const on = type.id === typeId;
            return (
              <button
                className={`rounded-2xl px-4 py-3 text-left ring-1 transition ${
                  on
                    ? "bg-menu-soft ring-menu text-navy shadow-sm"
                    : "bg-white ring-slate-200 text-slate-700 hover:bg-slate-50"
                }`}
                key={type.id}
                onClick={() => setTypeId(type.id)}
                type="button"
              >
                <div className="flex items-start gap-3">
                  <EquipmentTypeIcon name={type.name} size="sm" />
                  <div className="min-w-0">
                    <div className="font-extrabold">{type.name}</div>
                    <div className="mt-0.5 text-xs leading-snug text-slate-500">{formatPublicPrice(type)}</div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <div className="mb-2 text-sm font-semibold text-stone-700">Оплата</div>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          {PAY_OPTIONS.map((method) => {
            const on = pay === method;
            return (
              <button
                className={`rounded-2xl px-3 py-2.5 text-sm font-semibold ring-1 transition ${
                  on ? "bg-menu-soft ring-menu text-navy" : "bg-white ring-slate-200 text-slate-600 hover:bg-slate-50"
                }`}
                key={method}
                onClick={() => setPay(method)}
                type="button"
              >
                {PAYMENT_METHOD_LABELS[method]}
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Ваше имя">
          <Input autoComplete="name" name="name" placeholder="Иван Петров" required />
        </Field>
        <Field label="Телефон">
          <Input
            autoComplete="tel"
            inputMode="tel"
            name="phone"
            onChange={(e) => setPhone(formatPhoneMask(e.target.value))}
            placeholder="+7 900 000-00-00"
            required
            type="tel"
            value={phone}
          />
        </Field>
        <Field className="sm:col-span-2" label="Компания">
          <Input name="company" placeholder="Необязательно" />
        </Field>
        <Field className="sm:col-span-2" label="Адрес объекта">
          <AddressSuggest name="address" placeholder="Омск, улица, ориентир" required />
        </Field>
        <Field className="sm:col-span-2" label="Дата и время подачи">
          <Input defaultValue={defaultTime} name="scheduledAt" required type="datetime-local" />
        </Field>
        <Field className="sm:col-span-2" label="Комментарий">
          <Textarea name="comment" placeholder="Объём работ, подъезд, смена…" />
        </Field>
      </div>

      {state?.error ? <p className="text-sm font-semibold text-red-600">{state.error}</p> : null}

      <Button className="h-12 w-full text-base" disabled={pending || !typeId} type="submit" variant="success">
        {pending ? (
          <>
            <span className="btn-spinner" />
            Отправляем…
          </>
        ) : (
          "Оставить заявку"
        )}
      </Button>
      <p className="text-center text-xs text-slate-400">Нажимая кнопку, вы соглашаетесь на звонок диспетчера по этой заявке.</p>
    </form>
  );
}
