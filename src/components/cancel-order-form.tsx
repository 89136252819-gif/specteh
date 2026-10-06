"use client";

import { useRef, useState, useTransition } from "react";
import { cancelOrder } from "@/actions/orders";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/fields";
import { CancelDocumentsModals, type CancelWarningStep } from "@/components/cancel-documents-modals";

export function CancelOrderForm({
  orderId,
  invoiceNumber,
  actNumber,
  paid,
  paymentCount,
}: {
  orderId: string;
  invoiceNumber?: string | null;
  actNumber?: string | null;
  paid: number;
  paymentCount: number;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [step, setStep] = useState<CancelWarningStep>(null);
  const [shownPaid, setShownPaid] = useState(paid);
  const [shownPayments, setShownPayments] = useState(paymentCount);
  const [pending, start] = useTransition();
  const hasDocs = Boolean(invoiceNumber || actNumber);

  function submit(confirmDocs: boolean, confirmPayments: boolean) {
    const form = formRef.current;
    if (!form) return;
    const data = new FormData(form);
    if (confirmDocs) data.set("confirmRemoveDocs", "1");
    if (confirmPayments) data.set("confirmRemovePayments", "1");
    start(async () => {
      const result = await cancelOrder(data);
      if (result && "needsDocsConfirm" in result) {
        setStep("docs");
        return;
      }
      if (result && "needsPaymentConfirm" in result) {
        setShownPaid(result.paid);
        setShownPayments(result.paymentCount);
        setStep("payments");
        return;
      }
      setStep(null);
    });
  }

  return (
    <>
      <form
        className="space-y-3"
        ref={formRef}
        onSubmit={(event) => {
          event.preventDefault();
          if (hasDocs) {
            setStep("docs");
            return;
          }
          submit(false, false);
        }}
      >
        <input name="orderId" type="hidden" value={orderId} />
        <Textarea name="cancelReason" placeholder="Причина отмены" />
        <Button disabled={pending} type="submit" variant="danger">
          {pending ? "Отменяем…" : "Отменить заявку"}
        </Button>
      </form>
      <CancelDocumentsModals
        actNumber={actNumber}
        invoiceNumber={invoiceNumber}
        onClose={() => setStep(null)}
        onContinue={() => {
          if (step === "docs" && shownPayments > 0) {
            setStep("payments");
            return;
          }
          submit(true, step === "payments");
        }}
        paid={shownPaid}
        paymentCount={shownPayments}
        pending={pending}
        step={step}
      />
    </>
  );
}
