"use client";

import { useState, type ReactNode } from "react";
import { X } from "lucide-react";
import { CenterModal } from "@/components/center-modal";
import { IssueDocsForm } from "@/components/issue-docs-form";
import { Button } from "@/components/ui/button";
import type { PaymentOrgMap } from "@/components/payment-vat-fields";
import type { DocLine } from "@/lib/pricing-shared";

type DocsFormFields = {
  orderId: string;
  paymentMethod: string;
  vatRate: number;
  orgs: PaymentOrgMap;
  initialLines?: DocLine[];
  customerId?: string;
  customers?: { id: string; name: string; phone: string }[];
  paymentPurpose?: string;
  initialTotal?: number;
  initialVatAmount?: number;
  invoiceDate?: string;
  actDate?: string;
};

function DocsFormModal({
  open,
  onClose,
  labelledBy,
  title,
  subtitle,
  children,
}: {
  open: boolean;
  onClose: () => void;
  labelledBy: string;
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  return (
    <CenterModal
      className="max-w-3xl h-[min(88vh,52rem)] overflow-hidden sm:!max-h-[min(88vh,52rem)]"
      labelledBy={labelledBy}
      onClose={onClose}
      open={open}
      placement="center"
    >
      <div className="flex h-full min-h-0 flex-col overflow-hidden">
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-slate-100 px-5 py-4">
          <div>
            <h3 className="text-lg font-extrabold text-navy" id={labelledBy}>
              {title}
            </h3>
            <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
          </div>
          <button
            aria-label="Закрыть"
            className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-navy"
            onClick={onClose}
            type="button"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        {children}
      </div>
    </CenterModal>
  );
}

export function IssueDocsButton(props: DocsFormFields) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button onClick={() => setOpen(true)} type="button">
        Выставить счёт и акт
      </Button>
      <DocsFormModal
        labelledBy="issue-docs-title"
        onClose={() => setOpen(false)}
        open={open}
        subtitle="Заказчик, оплата, НДС, назначение платежа, позиции и итоги"
        title="Выставить счёт и акт"
      >
        <IssueDocsForm
          {...props}
          layout="modal"
          mode="create"
          onCancel={() => setOpen(false)}
          onSaved={() => setOpen(false)}
        />
      </DocsFormModal>
    </>
  );
}

export function EditDocsButton({
  invoiceDate = "",
  actDate = "",
  ...props
}: DocsFormFields & { invoiceDate: string; actDate: string }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button onClick={() => setOpen(true)} type="button" variant="primary">
        Редактировать счёт и акт
      </Button>
      <DocsFormModal
        labelledBy="edit-docs-title"
        onClose={() => setOpen(false)}
        open={open}
        subtitle="Заказчик, даты, позиции, НДС и способ оплаты"
        title="Редактировать счёт и акт"
      >
        <IssueDocsForm
          {...props}
          actDate={actDate}
          invoiceDate={invoiceDate}
          layout="modal"
          mode="edit"
          onCancel={() => setOpen(false)}
          onSaved={() => setOpen(false)}
        />
      </DocsFormModal>
    </>
  );
}
