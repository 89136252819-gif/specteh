"use client";

import { useTransition } from "react";
import { MapPinned, Navigation } from "lucide-react";
import { driverAdvance } from "@/actions/driver";
import { Button } from "@/components/ui/button";

export function DriverAdvanceButton({ orderId, label }: { orderId: string; label: string }) {
  const [pending, start] = useTransition();
  const Icon = label.startsWith("Выехал") ? Navigation : MapPinned;

  return (
    <Button
      className="h-14 w-full text-lg"
      disabled={pending}
      onClick={() =>
        start(() => {
          void driverAdvance(orderId);
        })
      }
      size="lg"
      variant="success"
    >
      <Icon className="h-5 w-5" />
      {pending ? "Обновляем…" : label}
    </Button>
  );
}
