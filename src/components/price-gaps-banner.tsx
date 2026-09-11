"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { verifyReport } from "@/actions/orders";
import { Button } from "@/components/ui/button";
import { CenterModal } from "@/components/center-modal";

export function PriceGapsBanner({ orderId, gapsParam }: { orderId: string; gapsParam?: string }) {
  const [open, setOpen] = useState(Boolean(gapsParam));
  const [gaps, setGaps] = useState(() =>
    gapsParam ? gapsParam.split(" | ").map((item) => item.trim()).filter(Boolean) : [],
  );
  const [pending, start] = useTransition();
  const router = useRouter();

  useEffect(() => {
    if (!gapsParam) return;
    setGaps(gapsParam.split(" | ").map((item) => item.trim()).filter(Boolean));
    setOpen(true);
  }, [gapsParam]);

  if (!gaps.length) return null;

  return (
    <CenterModal
      className="max-w-md"
      labelledBy="price-gaps-title"
      onClose={() => {
        if (pending) return;
        setOpen(false);
        router.replace(`/orders/${orderId}`);
      }}
      open={open}
      placement="center"
    >
      <div className="px-5 py-5">
        <h3 className="text-lg font-extrabold text-navy" id="price-gaps-title">
          Нулевые ставки в прайсе
        </h3>
        <p className="mt-2 text-sm text-slate-500">
          Расчёт сохранён. Перед подтверждением отчёта проверьте прайс. Продолжить с нулевыми ставками?
        </p>
        <ul className="mt-3 space-y-1 text-sm text-amber-950">
          {gaps.map((item) => (
            <li className="rounded-xl bg-amber-50 px-3 py-2 ring-1 ring-amber-200" key={item}>
              {item}
            </li>
          ))}
        </ul>
        <div className="mt-5 flex gap-2">
          <Button
            disabled={pending}
            onClick={() => {
              start(async () => {
                await verifyReport(orderId, { forceGaps: true });
                setOpen(false);
                router.replace(`/orders/${orderId}`);
                router.refresh();
              });
            }}
            type="button"
            variant="success"
          >
            {pending ? "Проверяем…" : "Подтвердить всё равно"}
          </Button>
          <Button
            disabled={pending}
            onClick={() => {
              setOpen(false);
              router.replace(`/orders/${orderId}`);
            }}
            type="button"
            variant="secondary"
          >
            Отмена
          </Button>
        </div>
      </div>
    </CenterModal>
  );
}
