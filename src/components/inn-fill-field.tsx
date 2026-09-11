"use client";

import { useState, useTransition } from "react";
import { lookupCustomerByInn } from "@/actions/inn";
import type { PartyByInn } from "@/lib/inn-lookup";
import { normalizeInn } from "@/lib/inn-lookup";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/fields";

export function InnFillField({
  value,
  onChange,
  onFilled,
  name = "inn",
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  onFilled: (party: PartyByInn) => void;
  name?: string;
  className?: string;
}) {
  const [pending, start] = useTransition();
  const [error, setError] = useState("");

  function fill() {
    setError("");
    start(async () => {
      const result = await lookupCustomerByInn(value);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      onFilled(result.party);
    });
  }

  return (
    <Field className={className} label="ИНН">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-stretch">
        <Input
          className="sm:flex-1"
          inputMode="numeric"
          name={name}
          onChange={(event) => {
            setError("");
            onChange(normalizeInn(event.target.value));
          }}
          placeholder="10 или 12 цифр"
          value={value}
        />
        <Button
          className="shrink-0"
          disabled={pending || normalizeInn(value).length < 10}
          onClick={fill}
          type="button"
          variant="secondary"
        >
          {pending ? "Ищем…" : "Заполнить по ИНН"}
        </Button>
      </div>
      {error ? <p className="mt-1 text-xs font-semibold text-red-600">{error}</p> : null}
      <p className="mt-1 text-xs text-slate-400">
        Подтянем название, КПП, адрес и руководителя из ЕГРЮЛ/ЕГРИП. Для юрлиц работает сразу; для ИП надёжнее с ключом DaData.
      </p>
    </Field>
  );
}
