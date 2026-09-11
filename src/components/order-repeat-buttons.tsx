"use client";

import { useState, useTransition } from "react";
import { repeatOrderInDays, saveOrderAsTemplate } from "@/actions/orders";
import { Button } from "@/components/ui/button";

export function OrderRepeatButtons({ orderId }: { orderId: string }) {
  const [pending, start] = useTransition();
  const [saved, setSaved] = useState(false);

  return (
    <div className="flex flex-wrap gap-2">
      <Button
        disabled={pending}
        onClick={() => start(() => { void repeatOrderInDays(orderId, 7); })}
        type="button"
        variant="secondary"
      >
        {pending ? "…" : "Повторить через 7 дней"}
      </Button>
      <Button
        disabled={pending}
        onClick={() =>
          start(async () => {
            await saveOrderAsTemplate(orderId);
            setSaved(true);
          })
        }
        type="button"
        variant="secondary"
      >
        {saved ? "Шаблон сохранён" : "Сохранить шаблон"}
      </Button>
    </div>
  );
}
