"use client";

import { forceSetOrderStatus } from "@/actions/orders";
import { Field, Select, Textarea } from "@/components/ui/fields";
import { SubmitButton } from "@/components/submit-button";
import { ORDER_STATUS_LABELS, type OrderStatus } from "@/lib/constants";

const STATUS_OPTIONS = Object.entries(ORDER_STATUS_LABELS) as [OrderStatus, string][];

export function ForceOrderStatusForm({ orderId, status }: { orderId: string; status: string }) {
  return (
    <form action={forceSetOrderStatus} className="space-y-3">
      <input name="orderId" type="hidden" value={orderId} />
      <Field label="Новый статус">
        <Select defaultValue={status} name="status" required>
          {STATUS_OPTIONS.map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Причина / комментарий">
        <Textarea name="note" placeholder="Необязательно — почему меняете вручную" />
      </Field>
      <p className="text-xs text-slate-500">
        Доступно только главному менеджеру. Статус ставится сразу, без обычных шагов водителя.
      </p>
      <SubmitButton variant="secondary">Установить статус</SubmitButton>
    </form>
  );
}
