"use client";

import { Button } from "@/components/ui/button";
import { CenterModal } from "@/components/center-modal";
import { money } from "@/lib/utils";

export type CancelWarningStep = "docs" | "payments" | null;

function recordsWord(count: number) {
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod10 === 1 && mod100 !== 11) return "запись";
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return "записи";
  return "записей";
}

function documentsLead(invoiceNumber?: string | null, actNumber?: string | null) {
  if (invoiceNumber && actNumber) {
    return `По заявке выставлены счёт ${invoiceNumber} и акт ${actNumber}. При отмене они будут удалены.`;
  }
  if (invoiceNumber) return `По заявке выставлен счёт ${invoiceNumber}. При отмене он будет удалён.`;
  if (actNumber) return `По заявке выставлен акт ${actNumber}. При отмене он будет удалён.`;
  return "По заявке выставлены документы. При отмене они будут удалены.";
}

export function CancelDocumentsModals({
  step,
  invoiceNumber,
  actNumber,
  paid,
  paymentCount,
  pending,
  onContinue,
  onClose,
}: {
  step: CancelWarningStep;
  invoiceNumber?: string | null;
  actNumber?: string | null;
  paid: number;
  paymentCount: number;
  pending: boolean;
  onContinue: () => void;
  onClose: () => void;
}) {
  const payments = step === "payments";
  return (
    <CenterModal
      className="max-w-md"
      labelledBy="cancel-docs-title"
      onClose={() => {
        if (!pending) onClose();
      }}
      open={step !== null}
      placement="center"
    >
      <div className="px-5 py-5">
        <h3 className="text-lg font-extrabold text-navy" id="cancel-docs-title">
          {payments
            ? "По счёту отмечена оплата"
            : invoiceNumber && actNumber
              ? "Счёт и акт будут удалены"
              : invoiceNumber
                ? "Счёт будет удалён"
                : "Акт будет удалён"}
        </h3>
        {payments ? (
          <div className="mt-2 space-y-2 text-sm text-slate-600">
            <p>
              По счёту {invoiceNumber || "—"} отмечена оплата {money(paid)} ({paymentCount}{" "}
              {recordsWord(paymentCount)}).
            </p>
            <p>
              Вместе со счётом эти оплаты будут удалены. Они пропадут из истории оплат и из суммы «оплачено». Вернуть
              записи из заявки нельзя.
            </p>
          </div>
        ) : (
          <div className="mt-2 space-y-2 text-sm text-slate-600">
            <p>{documentsLead(invoiceNumber, actNumber)}</p>
            <p>
              Долг по этой заявке пропадёт из карточки заказчика, документов и финансов. Публичная ссылка на PDF
              перестанет открываться. Номер счёта и акта повторно не выдаётся.
            </p>
          </div>
        )}
        <div className="mt-5 flex flex-wrap gap-2">
          <Button disabled={pending} onClick={onContinue} type="button" variant="danger">
            {pending ? "Отменяем…" : "Всё равно продолжить"}
          </Button>
          <Button disabled={pending} onClick={onClose} type="button" variant="secondary">
            Не отменять
          </Button>
        </div>
      </div>
    </CenterModal>
  );
}
