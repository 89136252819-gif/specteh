"use client";

import { FormEvent, useState, useTransition } from "react";
import { returnVatInvoice } from "@/actions/vat-invoices";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/fields";

export function VatInvoiceReturnForm({ orderId, replace }: { orderId: string; replace?: boolean }) {
  const [error, setError] = useState("");
  const [pending, start] = useTransition();

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    start(async () => {
      const result = await returnVatInvoice(data);
      if (result && "error" in result && result.error) {
        setError(result.error);
        return;
      }
      setError("");
      form.reset();
    });
  }

  return (
    <form className="space-y-3" onSubmit={onSubmit}>
      <input name="orderId" type="hidden" value={orderId} />
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Номер счёт-фактуры">
          <Input name="number" placeholder="Как на документе бухгалтера" required />
        </Field>
        <Field label="Дата документа">
          <Input name="issuedAt" required type="date" />
        </Field>
      </div>
      <Field label="Файл PDF">
        <Input accept="application/pdf,.pdf" className="h-auto py-2" name="file" required type="file" />
      </Field>
      <Field label="Комментарий">
        <Input name="comment" placeholder="Необязательно" />
      </Field>
      {error ? <p className="text-sm font-semibold text-rose-700">{error}</p> : null}
      <Button disabled={pending} type="submit" variant="primary">
        {pending ? "Сохраняем…" : replace ? "Заменить счёт-фактуру" : "Вернуть счёт-фактуру"}
      </Button>
    </form>
  );
}
