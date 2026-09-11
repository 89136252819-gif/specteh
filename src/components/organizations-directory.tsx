"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { saveOrganization } from "@/actions/catalogs";
import { OrganizationForm, type OrganizationValues } from "@/components/forms/organization-form";
import { RecordEditorModal } from "@/components/record-editor-modal";
import { SummaryStat } from "@/components/directory-chrome";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PdfLink } from "@/components/pdf-link";
import { PAYMENT_METHOD_LABELS, type PaymentMethod } from "@/lib/constants";

export function OrganizationsDirectory({ organizations }: { organizations: OrganizationValues[] }) {
  const router = useRouter();
  const [editor, setEditor] = useState<OrganizationValues | null>(null);
  const editing = editor ? organizations.find((row) => row.id === editor.id) || editor : undefined;

  async function save(formData: FormData) {
    await saveOrganization(formData);
    setEditor(null);
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <SummaryStat hint="счета и акты от этих юрлиц" label="Организаций" value={organizations.length} />
        <SummaryStat
          hint="привязка к способу оплаты"
          label="Способов оплаты"
          tone="accent"
          value={new Set(organizations.map((row) => row.paymentMethod)).size}
        />
      </div>

      <div className="grid gap-4">
        {organizations.map((org) => (
          <div className="panel px-5 py-4" key={org.id}>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="font-extrabold text-navy">{org.shortName}</h2>
                  <Badge className="bg-menu-soft text-menu-hover">
                    {PAYMENT_METHOD_LABELS[org.paymentMethod as PaymentMethod] || org.paymentMethod}
                  </Badge>
                </div>
                <p className="mt-1 text-sm text-slate-600">{org.name}</p>
                <dl className="mt-3 grid gap-x-6 gap-y-1 text-sm text-slate-500 sm:grid-cols-2">
                  <div>
                    ИНН {org.inn}
                    {org.kpp ? ` · КПП ${org.kpp}` : ""}
                  </div>
                  <div>
                    НДС {org.vatRate}% · счета {org.invoicePrefix} · акты {org.actPrefix}
                  </div>
                  <div className="sm:col-span-2">{org.legalAddress}</div>
                  <div>
                    {org.directorTitle} {org.directorName}
                  </div>
                  <div>
                    {org.signatureFile || org.stampFile
                      ? `Факсимиле: ${[org.signatureFile ? "подпись" : null, org.stampFile ? "печать" : null].filter(Boolean).join(" · ")}`
                      : "Факсимиле не загружено"}
                  </div>
                  <div>{org.bankName || "Банк не указан"}</div>
                </dl>
              </div>
              <div className="flex shrink-0 flex-wrap gap-2">
                <PdfLink
                  className="inline-flex h-8 items-center rounded-2xl border border-stone-200 bg-white/90 px-3 text-sm font-semibold text-stone-800 shadow-sm hover:border-stone-300"
                  href={`/api/pdf/preview/invoice/${org.id}`}
                >
                  Образец счёта
                </PdfLink>
                <PdfLink
                  className="inline-flex h-8 items-center rounded-2xl border border-stone-200 bg-white/90 px-3 text-sm font-semibold text-stone-800 shadow-sm hover:border-stone-300"
                  href={`/api/pdf/preview/act/${org.id}`}
                >
                  Образец акта
                </PdfLink>
                <Button onClick={() => setEditor(org)} size="sm" type="button" variant="secondary">
                  Изменить
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <RecordEditorModal
        className="max-w-3xl"
        labelledBy="org-editor-title"
        onClose={() => setEditor(null)}
        open={Boolean(editor)}
        subtitle={editing ? `${editing.inn} · ${PAYMENT_METHOD_LABELS[editing.paymentMethod as PaymentMethod] || ""}` : undefined}
        title={editing ? `Изменить «${editing.shortName}»` : "Организация"}
      >
        {editing ? (
          <OrganizationForm action={save} key={editing.id} onCancel={() => setEditor(null)} organization={editing} />
        ) : null}
      </RecordEditorModal>
    </div>
  );
}
