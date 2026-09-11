"use client";

import { useState, useTransition } from "react";
import { updateOrderBasics } from "@/actions/orders";
import { AddressSuggest } from "@/components/address-suggest";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/fields";
import { SubmitButton } from "@/components/submit-button";
import { toDatetimeLocal } from "@/lib/utils";

export function OrderBasicsEditor({
  orderId,
  address,
  scheduledAt,
  siteContact,
  sitePhone,
  comment,
}: {
  orderId: string;
  address: string;
  scheduledAt: string | Date;
  siteContact: string | null;
  sitePhone: string | null;
  comment: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();

  if (!open) {
    return (
      <Button className="w-full sm:w-auto" onClick={() => setOpen(true)} size="sm" type="button" variant="secondary">
        Изменить адрес и время
      </Button>
    );
  }

  return (
    <form
      action={(fd) => {
        start(async () => {
          await updateOrderBasics(fd);
          setOpen(false);
        });
      }}
      className="grid gap-3 rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200/80 sm:grid-cols-2 sm:col-span-2"
    >
      <input name="orderId" type="hidden" value={orderId} />
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
      <div className="flex flex-wrap gap-2 sm:col-span-2">
        <SubmitButton>{pending ? "Сохраняем…" : "Сохранить"}</SubmitButton>
        <Button disabled={pending} onClick={() => setOpen(false)} type="button" variant="secondary">
          Отмена
        </Button>
      </div>
    </form>
  );
}
