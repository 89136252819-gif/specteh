"use client";

import { updateOrderPayment } from "@/actions/orders";
import { PaymentVatFields, type PaymentOrgMap } from "@/components/payment-vat-fields";
import { SubmitButton } from "@/components/submit-button";

export function OrderPaymentForm({
  orderId,
  paymentMethod,
  vatRate,
  orgs,
}: {
  orderId: string;
  paymentMethod: string;
  vatRate: number | null;
  orgs: PaymentOrgMap;
}) {
  return (
    <form action={updateOrderPayment} className="sm:col-span-2 grid gap-3 sm:grid-cols-2">
      <input name="orderId" type="hidden" value={orderId} />
      <PaymentVatFields defaultMethod={paymentMethod} defaultVatRate={vatRate} orgs={orgs} />
      <div className="sm:col-span-2">
        <SubmitButton>Сохранить оплату</SubmitButton>
      </div>
    </form>
  );
}
