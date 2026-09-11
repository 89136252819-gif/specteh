"use client";

import { useTransition } from "react";
import { copyOrder } from "@/actions/orders";
import { Button } from "@/components/ui/button";

export function CopyOrderButton({ orderId }: { orderId: string }) {
  const [pending, start] = useTransition();
  return (
    <Button disabled={pending} onClick={() => start(() => { void copyOrder(orderId); })} type="button" variant="secondary">
      {pending ? "Копируем…" : "Копировать"}
    </Button>
  );
}
