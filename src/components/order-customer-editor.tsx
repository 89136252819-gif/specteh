"use client";

import { useState, useTransition } from "react";
import { updateOrderCustomer } from "@/actions/orders";
import { OrderCustomerPicker } from "@/components/order-customer-picker";
import { Button } from "@/components/ui/button";
import { SubmitButton } from "@/components/submit-button";

export function OrderCustomerEditor({
  orderId,
  customerId,
  customers,
}: {
  orderId: string;
  customerId: string;
  customers: { id: string; name: string; phone: string }[];
}) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const [pending, start] = useTransition();

  if (!open) {
    return (
      <Button onClick={() => setOpen(true)} size="sm" type="button" variant="secondary">
        Сменить заказчика
      </Button>
    );
  }

  return (
    <form
      action={(fd) => {
        start(async () => {
          setError("");
          const result = await updateOrderCustomer(fd);
          if (result && "error" in result && result.error) {
            setError(result.error);
            return;
          }
          setOpen(false);
        });
      }}
      className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200/80"
    >
      <input name="orderId" type="hidden" value={orderId} />
      <OrderCustomerPicker customers={customers} defaultCustomerId={customerId} />
      {error ? <p className="mt-2 text-sm font-semibold text-rose-800">{error}</p> : null}
      <div className="mt-3 flex flex-wrap gap-2">
        <SubmitButton>{pending ? "Сохраняем…" : "Сохранить заказчика"}</SubmitButton>
        <Button disabled={pending} onClick={() => setOpen(false)} type="button" variant="secondary">
          Отмена
        </Button>
      </div>
    </form>
  );
}
