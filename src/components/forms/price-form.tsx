"use client";

import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/fields";
import { SubmitButton } from "@/components/submit-button";
import { PRICE_KIND_LABELS, PRICE_KINDS } from "@/lib/constants";

type Option = { id: string; name: string };

export type PriceValues = {
  id: string;
  equipmentTypeId: string;
  kind: string;
  amount: number;
  customerId: string | null;
  label: string;
};

export function PriceForm({
  action,
  types,
  customers,
  price,
  onCancel,
}: {
  action: (formData: FormData) => Promise<void>;
  types: Option[];
  customers: Option[];
  price?: PriceValues;
  onCancel?: () => void;
}) {
  return (
    <form action={action} className="grid gap-3 sm:grid-cols-2">
      {price ? <input name="id" type="hidden" value={price.id} /> : null}
      <Field className="sm:col-span-2" label="Тип техники">
        <Select name="equipmentTypeId" required defaultValue={price?.equipmentTypeId || types[0]?.id}>
          {types.map((type) => (
            <option key={type.id} value={type.id}>
              {type.name}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Вид">
        <Select name="kind" defaultValue={price?.kind || PRICE_KINDS.HOUR}>
          {Object.entries(PRICE_KIND_LABELS).map(([key, label]) => (
            <option key={key} value={key}>
              {label}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Цена, ₽">
        <Input name="amount" required step="0.01" type="number" defaultValue={price?.amount} />
      </Field>
      <Field className="sm:col-span-2" label="Заказчик">
        <Select name="customerId" defaultValue={price?.customerId || ""}>
          <option value="">Базовый прайс</option>
          {customers.map((customer) => (
            <option key={customer.id} value={customer.id}>
              {customer.name}
            </option>
          ))}
        </Select>
      </Field>
      <Field className="sm:col-span-2" label="Наименование в акте">
        <Input name="label" required placeholder="Моточас экскаватора" defaultValue={price?.label} />
      </Field>
      <div className="flex flex-wrap gap-2 sm:col-span-2">
        <SubmitButton>{price ? "Сохранить" : "Добавить"}</SubmitButton>
        {onCancel ? (
          <Button onClick={onCancel} type="button" variant="secondary">
            Отмена
          </Button>
        ) : null}
      </div>
    </form>
  );
}
