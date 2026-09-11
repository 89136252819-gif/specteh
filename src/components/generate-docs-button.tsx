"use client";

import { useState, useTransition } from "react";
import { generateDocuments } from "@/actions/orders";
import { Button } from "@/components/ui/button";
import { CenterModal } from "@/components/center-modal";

export function GenerateDocsButton({ orderId }: { orderId: string }) {
  const [pending, start] = useTransition();
  const [gaps, setGaps] = useState<string[]>([]);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");

  function run(force = false) {
    start(async () => {
      setError("");
      const result = await generateDocuments(orderId, { forceGaps: force });
      if (result && "needsConfirm" in result && result.needsConfirm) {
        setGaps(result.gaps);
        setOpen(true);
        return;
      }
      if (result && "error" in result && result.error) {
        setError(result.error);
        return;
      }
      setOpen(false);
    });
  }

  return (
    <>
      <Button className="mt-4" disabled={pending} onClick={() => run(false)} type="button">
        {pending ? "Формируем…" : "Сформировать счёт и акт"}
      </Button>
      {error ? <p className="mt-2 text-xs font-semibold text-rose-700">{error}</p> : null}
      <CenterModal
        className="max-w-md"
        labelledBy="docs-gaps-title"
        onClose={() => !pending && setOpen(false)}
        open={open}
        placement="center"
      >
        <div className="px-5 py-5">
          <h3 className="text-lg font-extrabold text-navy" id="docs-gaps-title">
            Нулевые ставки в прайсе
          </h3>
          <p className="mt-2 text-sm text-slate-500">В расчёте есть позиции без цены. Всё равно выставить документы?</p>
          <ul className="mt-3 space-y-1 text-sm text-amber-950">
            {gaps.map((item) => (
              <li className="rounded-xl bg-amber-50 px-3 py-2 ring-1 ring-amber-200" key={item}>
                {item}
              </li>
            ))}
          </ul>
          <div className="mt-5 flex gap-2">
            <Button disabled={pending} onClick={() => run(true)} type="button">
              {pending ? "Формируем…" : "Выставить всё равно"}
            </Button>
            <Button disabled={pending} onClick={() => setOpen(false)} type="button" variant="secondary">
              Отмена
            </Button>
          </div>
        </div>
      </CenterModal>
    </>
  );
}
