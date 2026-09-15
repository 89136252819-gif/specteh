"use client";

import { FormEvent, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
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
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  const [mode, setMode] = useState<"existing" | "new">("existing");
  const [selectedId, setSelectedId] = useState(customerId);

  if (!open) {
    return (
      <Button
        onClick={() => {
          setError("");
          setMode("existing");
          setSelectedId(customerId);
          setOpen(true);
        }}
        size="sm"
        type="button"
        variant="secondary"
      >
        Сменить заказчика
      </Button>
    );
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const fd = new FormData(event.currentTarget);
    fd.set("orderId", orderId);
    fd.set("customerMode", mode);
    fd.set("customerId", mode === "existing" ? selectedId : "");
    start(async () => {
      setError("");
      const result = await updateOrderCustomer(fd);
      if (result && "error" in result && result.error) {
        setError(result.error);
        return;
      }
      router.refresh();
      setOpen(false);
    });
  }

  return (
    <form className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200/80" onSubmit={onSubmit}>
      <input name="orderId" readOnly type="hidden" value={orderId} />
      <OrderCustomerPicker
        customers={customers}
        defaultCustomerId={customerId}
        mode={mode}
        onModeChange={setMode}
        onSelectedIdChange={setSelectedId}
        selectedId={selectedId}
      />
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
