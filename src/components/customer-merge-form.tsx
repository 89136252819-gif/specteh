"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { mergeCustomers } from "@/actions/catalogs";
import { Button } from "@/components/ui/button";
import { Field, Select } from "@/components/ui/fields";

type Option = { id: string; name: string; phone: string; inn: string | null };

export function CustomerMergeForm({ keepId, others }: { keepId: string; others: Option[] }) {
  const [absorbId, setAbsorbId] = useState("");
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  const router = useRouter();

  if (others.length === 0) return null;

  return (
    <div className="space-y-3 rounded-2xl bg-amber-50/80 p-4 ring-1 ring-amber-200">
      <div>
        <h3 className="text-sm font-bold text-navy">Объединить с другим заказчиком</h3>
        <p className="mt-1 text-xs text-slate-600">
          Заявки и цены выбранной карточки перейдут сюда, дубль будет удалён. Действие необратимо.
        </p>
      </div>
      <Field label="Поглотить (удалить) карточку">
        <Select onChange={(e) => setAbsorbId(e.target.value)} value={absorbId}>
          <option value="">Выберите дубль…</option>
          {others.map((row) => (
            <option key={row.id} value={row.id}>
              {row.name}
              {row.inn ? ` · ИНН ${row.inn}` : ""}
              {row.phone ? ` · ${row.phone}` : ""}
            </option>
          ))}
        </Select>
      </Field>
      {error ? <p className="text-xs font-semibold text-rose-700">{error}</p> : null}
      <Button
        disabled={pending || !absorbId}
        onClick={() => {
          if (!absorbId) return;
          if (!window.confirm("Объединить карточки? Дубль будет удалён.")) return;
          start(async () => {
            setError("");
            const result = await mergeCustomers(keepId, absorbId);
            if (!result?.ok) {
              setError(result?.error || "Не удалось объединить");
              return;
            }
            router.refresh();
          });
        }}
        type="button"
        variant="danger"
      >
        {pending ? "Объединяем…" : "Объединить в эту карточку"}
      </Button>
    </div>
  );
}
