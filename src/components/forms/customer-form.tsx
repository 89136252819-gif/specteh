"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/fields";
import { SubmitButton } from "@/components/submit-button";
import { InnFillField } from "@/components/inn-fill-field";
import { PAYMENT_METHOD_LABELS } from "@/lib/constants";

export type CustomerValues = {
  id: string;
  type: string;
  name: string;
  inn: string | null;
  kpp: string | null;
  address: string | null;
  contactName: string;
  phone: string;
  email: string | null;
  defaultPaymentMethod: string;
  notes: string | null;
};

export function CustomerForm({
  action,
  customer,
  onCancel,
}: {
  action: (formData: FormData) => Promise<void>;
  customer?: CustomerValues;
  onCancel?: () => void;
}) {
  const [type, setType] = useState(customer?.type || "COMPANY");
  const [name, setName] = useState(customer?.name || "");
  const [inn, setInn] = useState(customer?.inn || "");
  const [kpp, setKpp] = useState(customer?.kpp || "");
  const [address, setAddress] = useState(customer?.address || "");
  const [contactName, setContactName] = useState(customer?.contactName || "");

  return (
    <form action={action} className="grid gap-4 sm:grid-cols-2">
      {customer ? <input name="id" type="hidden" value={customer.id} /> : null}
      <InnFillField
        className="sm:col-span-2"
        onChange={setInn}
        onFilled={(party) => {
          setType(party.type);
          setName(party.name);
          setInn(party.inn);
          setKpp(party.kpp || "");
          setAddress(party.address || "");
          setContactName(party.contactName);
        }}
        value={inn}
      />
      <Field label="Тип">
        <Select name="type" onChange={(e) => setType(e.target.value)} value={type}>
          <option value="COMPANY">Юрлицо / ИП</option>
          <option value="INDIVIDUAL">Физлицо</option>
        </Select>
      </Field>
      <Field label="Название / ФИО">
        <Input name="name" onChange={(e) => setName(e.target.value)} required value={name} />
      </Field>
      <Field label="КПП">
        <Input name="kpp" onChange={(e) => setKpp(e.target.value)} value={kpp} />
      </Field>
      <Field className="sm:col-span-2" label="Адрес">
        <Input name="address" onChange={(e) => setAddress(e.target.value)} value={address} />
      </Field>
      <Field label="Контактное лицо">
        <Input name="contactName" onChange={(e) => setContactName(e.target.value)} required value={contactName} />
      </Field>
      <Field label="Телефон для SMS">
        <Input name="phone" required defaultValue={customer?.phone} />
      </Field>
      <Field label="Email">
        <Input name="email" type="email" defaultValue={customer?.email || ""} />
      </Field>
      <Field label="Оплата по умолчанию">
        <Select name="defaultPaymentMethod" defaultValue={customer?.defaultPaymentMethod || "CASHLESS_VAT"}>
          {Object.entries(PAYMENT_METHOD_LABELS).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </Select>
      </Field>
      <Field className="sm:col-span-2" label="Заметки">
        <Textarea name="notes" defaultValue={customer?.notes || ""} />
      </Field>
      <label className="flex items-center gap-2 text-sm text-slate-600 sm:col-span-2">
        <input className="h-4 w-4 rounded border-stone-300" name="forceDuplicate" type="checkbox" value="1" />
        Сохранить несмотря на возможный дубль (ИНН/телефон)
      </label>
      <div className="flex flex-wrap gap-2 sm:col-span-2">
        <SubmitButton>Сохранить</SubmitButton>
        {onCancel ? (
          <Button onClick={onCancel} type="button" variant="secondary">
            Отмена
          </Button>
        ) : null}
      </div>
    </form>
  );
}
