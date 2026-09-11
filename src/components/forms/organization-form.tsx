"use client";

import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/fields";
import { SubmitButton } from "@/components/submit-button";
import { OrganizationFacsimileFields } from "@/components/organization-facsimile-fields";
import { PAYMENT_METHOD_LABELS } from "@/lib/constants";

export type OrganizationValues = {
  id: string;
  name: string;
  shortName: string;
  inn: string;
  kpp: string | null;
  ogrn: string | null;
  legalAddress: string;
  phone: string | null;
  email: string | null;
  bankName: string;
  bik: string;
  account: string;
  corrAccount: string;
  directorName: string;
  directorTitle: string;
  vatRate: number;
  paymentMethod: string;
  invoicePrefix: string;
  actPrefix: string;
  signatureFile: string | null;
  stampFile: string | null;
};

export function OrganizationForm({
  action,
  organization,
  onCancel,
}: {
  action: (formData: FormData) => Promise<void>;
  organization: OrganizationValues;
  onCancel?: () => void;
}) {
  return (
    <form action={action} className="grid gap-3 sm:grid-cols-2">
      <input name="id" type="hidden" value={organization.id} />
      <Field className="sm:col-span-2" label="Полное наименование">
        <Input name="name" required defaultValue={organization.name} />
      </Field>
      <Field label="Краткое">
        <Input name="shortName" required defaultValue={organization.shortName} />
      </Field>
      <Field label="ИНН">
        <Input name="inn" required defaultValue={organization.inn} />
      </Field>
      <Field label="КПП">
        <Input name="kpp" defaultValue={organization.kpp || ""} />
      </Field>
      <Field label="ОГРН">
        <Input name="ogrn" defaultValue={organization.ogrn || ""} />
      </Field>
      <Field className="sm:col-span-2" label="Юр. адрес">
        <Input name="legalAddress" required defaultValue={organization.legalAddress} />
      </Field>
      <Field label="Телефон">
        <Input name="phone" defaultValue={organization.phone || ""} />
      </Field>
      <Field label="Email">
        <Input name="email" defaultValue={organization.email || ""} />
      </Field>
      <Field label="Банк">
        <Input name="bankName" defaultValue={organization.bankName} />
      </Field>
      <Field label="БИК">
        <Input name="bik" defaultValue={organization.bik} />
      </Field>
      <Field label="Р/с">
        <Input name="account" defaultValue={organization.account} />
      </Field>
      <Field label="К/с">
        <Input name="corrAccount" defaultValue={organization.corrAccount} />
      </Field>
      <Field label="Руководитель">
        <Input name="directorName" defaultValue={organization.directorName} />
      </Field>
      <Field label="Должность">
        <Input name="directorTitle" defaultValue={organization.directorTitle} />
      </Field>
      <Field label="НДС, %">
        <Input name="vatRate" step="0.01" type="number" defaultValue={organization.vatRate} />
      </Field>
      <Field label="Способ оплаты">
        <Select name="paymentMethod" defaultValue={organization.paymentMethod}>
          {Object.entries(PAYMENT_METHOD_LABELS).map(([key, label]) => (
            <option key={key} value={key}>
              {label}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Префикс счетов">
        <Input name="invoicePrefix" defaultValue={organization.invoicePrefix} />
      </Field>
      <Field label="Префикс актов">
        <Input name="actPrefix" defaultValue={organization.actPrefix} />
      </Field>
      <OrganizationFacsimileFields
        orgId={organization.id}
        signatureFile={organization.signatureFile}
        stampFile={organization.stampFile}
      />
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
