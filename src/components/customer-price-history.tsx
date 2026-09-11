import Link from "next/link";
import { Fragment } from "react";
import { Table, Td, Th } from "@/components/ui/table";
import { StatusBadge } from "@/components/ui/badge";
import { formatDateTime, money } from "@/lib/utils";
import { linesFromJson } from "@/lib/pdf-from-record";
import { parseBillingJson, type DocLine } from "@/lib/pricing-shared";
import { PRICE_KIND_LABELS } from "@/lib/constants";

type OrderRow = {
  id: string;
  number: string;
  scheduledAt: Date;
  status: string;
  equipmentType: { name: string };
  invoice: { amount: number; linesJson: string } | null;
  report: { billingJson: string | null } | null;
};

type OverrideRow = {
  id: string;
  kind: string;
  label: string;
  amount: number;
  equipmentType: { name: string };
};

function linesForOrder(order: OrderRow): DocLine[] {
  if (order.invoice?.linesJson) {
    const fromInvoice = linesFromJson(order.invoice.linesJson);
    if (fromInvoice.length) {
      return fromInvoice.map((line) => ({
        name: line.name,
        qty: line.qty,
        unit: line.unit,
        price: line.price,
        sum: line.sum,
      }));
    }
  }
  const fromBilling = parseBillingJson(order.report?.billingJson);
  return fromBilling?.lines ?? [];
}

export function CustomerPriceHistory({
  orders,
  overrides,
}: {
  orders: OrderRow[];
  overrides: OverrideRow[];
}) {
  return (
    <div className="space-y-6">
      {overrides.length ? (
        <div>
          <h2 className="mb-3 font-semibold">Индивидуальные тарифы</h2>
          <Table>
            <thead>
              <tr>
                <Th>Техника</Th>
                <Th>Позиция</Th>
                <Th>Ставка</Th>
              </tr>
            </thead>
            <tbody>
              {overrides.map((item) => (
                <tr key={item.id}>
                  <Td>{item.equipmentType.name}</Td>
                  <Td>{item.label || PRICE_KIND_LABELS[item.kind] || item.kind}</Td>
                  <Td>{money(item.amount)}</Td>
                </tr>
              ))}
            </tbody>
          </Table>
        </div>
      ) : null}

      <div>
        <h2 className="mb-3 font-semibold">История заявок и ставок</h2>
        <Table>
          <thead>
            <tr>
              <Th>№</Th>
              <Th>Дата</Th>
              <Th>Техника</Th>
              <Th>Статус</Th>
              <Th>Счёт</Th>
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => {
              const lines = linesForOrder(o);
              return (
                <Fragment key={o.id}>
                  <tr>
                    <Td>
                      <Link className="text-brand-hover hover:underline" href={`/orders/${o.id}`}>
                        {o.number}
                      </Link>
                    </Td>
                    <Td>{formatDateTime(o.scheduledAt)}</Td>
                    <Td>{o.equipmentType.name}</Td>
                    <Td>
                      <StatusBadge status={o.status} />
                    </Td>
                    <Td>{o.invoice ? money(o.invoice.amount) : "—"}</Td>
                  </tr>
                  {lines.length ? (
                    <tr>
                      <Td className="bg-slate-50/80 text-xs text-slate-600" colSpan={5}>
                        <div className="flex flex-wrap gap-x-4 gap-y-1 py-0.5">
                          {lines.map((line, i) => (
                            <span key={`${o.id}-line-${i}`}>
                              {line.name}:{" "}
                              <span className="font-semibold text-navy">
                                {money(line.price)}
                              </span>
                              /{line.unit}
                              {line.qty ? (
                                <span className="text-slate-400">
                                  {" "}
                                  × {line.qty} = {money(line.sum)}
                                </span>
                              ) : null}
                            </span>
                          ))}
                        </div>
                      </Td>
                    </tr>
                  ) : null}
                </Fragment>
              );
            })}
          </tbody>
        </Table>
        {!orders.length ? <p className="mt-2 text-sm text-slate-500">Заявок пока нет.</p> : null}
      </div>
    </div>
  );
}
