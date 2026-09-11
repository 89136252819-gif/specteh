"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { CenterModal } from "@/components/center-modal";
import { IssueDocsForm } from "@/components/issue-docs-form";
import { Button } from "@/components/ui/button";
import type { PaymentOrgMap } from "@/components/payment-vat-fields";
import type { DocLine } from "@/lib/pricing-shared";

export function EditDocsButton({
  orderId,
  paymentMethod,
  vatRate,
  orgs,
  initialLines,
  customerId,
  customers,
  paymentPurpose,
  initialTotal,
  initialVatAmount,
}: {
  orderId: string;
  paymentMethod: string;
  vatRate: number;
  orgs: PaymentOrgMap;
  initialLines: DocLine[];
  customerId: string;
  customers: { id: string; name: string; phone: string }[];
  paymentPurpose: string;
  initialTotal?: number;
  initialVatAmount?: number;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button onClick={() => setOpen(true)} type="button" variant="primary">
        Редактировать счёт и акт
      </Button>
      <CenterModal
        className="max-w-3xl"
        labelledBy="edit-docs-title"
        onClose={() => setOpen(false)}
        open={open}
        placement="center"
      >
        <div className="flex max-h-[min(90vh,52rem)] flex-col">
          <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-4">
            <div>
              <h3 className="text-lg font-extrabold text-navy" id="edit-docs-title">
                Редактировать счёт и акт
              </h3>
              <p className="mt-1 text-sm text-slate-500">Заказчик, позиции, НДС и способ оплаты</p>
            </div>
            <button
              aria-label="Закрыть"
              className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-navy"
              onClick={() => setOpen(false)}
              type="button"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="overflow-y-auto px-5 py-4">
            <IssueDocsForm
              customerId={customerId}
              customers={customers}
              initialLines={initialLines}
              initialTotal={initialTotal}
              initialVatAmount={initialVatAmount}
              mode="edit"
              onSaved={() => setOpen(false)}
              orderId={orderId}
              orgs={orgs}
              paymentMethod={paymentMethod}
              paymentPurpose={paymentPurpose}
              vatRate={vatRate}
            />
          </div>
        </div>
      </CenterModal>
    </>
  );
}
