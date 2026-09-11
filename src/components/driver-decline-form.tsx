"use client";

import { useState, useTransition } from "react";
import { driverDecline } from "@/actions/driver";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/fields";

export function DriverDeclineForm({ orderId }: { orderId: string }) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();

  if (!open) {
    return (
      <button
        className="w-full py-3 text-center text-sm font-semibold text-slate-500"
        onClick={() => setOpen(true)}
        type="button"
      >
        Не могу взять заявку
      </button>
    );
  }

  return (
    <form
      className="space-y-2 rounded-2xl bg-white p-3 ring-1 ring-slate-200"
      onSubmit={(e) => {
        e.preventDefault();
        const data = new FormData(e.currentTarget);
        const reason = String(data.get("reason") || "").trim();
        if (!reason) return;
        start(() => {
          void driverDecline(orderId, reason);
        });
      }}
    >
      <Textarea className="min-h-20 text-base" name="reason" placeholder="Почему не можете взять?" required />
      <div className="grid grid-cols-2 gap-2">
        <Button onClick={() => setOpen(false)} size="lg" type="button" variant="secondary">
          Отмена
        </Button>
        <Button className="w-full" disabled={pending} size="lg" type="submit" variant="danger">
          {pending ? "Отправляем…" : "Отказаться"}
        </Button>
      </div>
    </form>
  );
}
