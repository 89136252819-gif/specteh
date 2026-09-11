import Link from "next/link";
import { MapPin, Phone } from "lucide-react";
import { StatusBadge } from "@/components/ui/badge";
import { DispatchAssignForm, type DispatchDriverOption, type DispatchUnitOption } from "@/components/dispatch-assign-form";
import { DispatchQuickActions } from "@/components/dispatch-quick-actions";
import { PAYMENT_METHOD_LABELS, type PaymentMethod } from "@/lib/constants";
import { formatDriverWhen, mapsHref, money, phoneHref, phonePretty } from "@/lib/utils";

export type DispatchOrder = {
  id: string;
  number: string;
  status: string;
  address: string;
  comment: string | null;
  scheduledAt: Date;
  paymentMethod: string;
  siteContact: string | null;
  sitePhone: string | null;
  equipmentTypeId: string;
  equipmentId: string | null;
  driverId: string | null;
  customerDebt?: number;
  customer: { name: string; phone: string };
  equipmentType: { name: string };
  equipment: { name: string; plateNumber: string } | null;
  driver: { user: { name: string; phone: string | null } } | null;
};

const ASSIGNABLE = new Set(["NEW", "ASSIGNED", "DECLINED", "ACCEPTED"]);

export function DispatchOrderCard({
  order,
  late,
  units,
  drivers,
}: {
  order: DispatchOrder;
  late?: boolean;
  units: DispatchUnitOption[];
  drivers: DispatchDriverOption[];
}) {
  const sitePhone = order.sitePhone || order.customer.phone;
  const callHref = sitePhone ? phoneHref(sitePhone) : null;
  const driverCall = order.driver?.user.phone ? phoneHref(order.driver.user.phone) : null;
  const showAssign = ASSIGNABLE.has(order.status);

  return (
    <article
      className={`rounded-2xl border bg-white p-3 shadow-sm ring-1 ring-slate-200/70 ${
        late ? "border-amber-300 ring-amber-200" : order.status === "DECLINED" ? "border-stone-300" : "border-white"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <Link className="min-w-0 font-extrabold text-navy hover:text-menu-hover hover:underline" href={`/orders/${order.id}`}>
          {order.number}
        </Link>
        <StatusBadge className="shrink-0" status={order.status} />
      </div>
      <div className="mt-1 text-xs font-semibold text-slate-500">
        {formatDriverWhen(order.scheduledAt)}
        {late ? <span className="ml-1 text-amber-700">· опоздание</span> : null}
      </div>
      <div className="mt-1 truncate text-sm font-semibold text-slate-800">{order.customer.name}</div>
      {order.customerDebt && order.customerDebt > 0.01 ? (
        <div className="mt-0.5 text-[11px] font-bold text-amber-800">долг {money(order.customerDebt)}</div>
      ) : null}
      <a
        className="mt-1 flex items-start gap-1.5 text-sm leading-snug text-navy hover:text-menu-hover"
        href={mapsHref(order.address)}
        rel="noreferrer"
        target="_blank"
      >
        <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-menu-hover" />
        <span className="min-w-0 break-words">{order.address}</span>
      </a>
      <div className="mt-1.5 text-xs text-slate-500">
        {order.equipment ? `${order.equipment.plateNumber} · ${order.equipment.name}` : order.equipmentType.name}
        {order.driver ? ` · ${order.driver.user.name}` : " · без водителя"}
      </div>
      <div className="mt-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
        {PAYMENT_METHOD_LABELS[order.paymentMethod as PaymentMethod] || order.paymentMethod}
      </div>
      {order.comment ? <p className="mt-1 line-clamp-2 text-xs text-slate-500">{order.comment}</p> : null}
      <div className="mt-2 flex flex-wrap gap-1.5">
        {callHref ? (
          <a
            className="inline-flex h-7 items-center gap-1 rounded-full bg-menu-soft px-2 text-[11px] font-bold text-menu-hover"
            href={callHref}
          >
            <Phone className="h-3 w-3" />
            {order.siteContact || "Объект"} {phonePretty(sitePhone)}
          </a>
        ) : null}
        {driverCall && order.driver ? (
          <a
            className="inline-flex h-7 items-center gap-1 rounded-full bg-slate-100 px-2 text-[11px] font-bold text-navy"
            href={driverCall}
          >
            <Phone className="h-3 w-3" />
            {order.driver.user.name}
          </a>
        ) : null}
      </div>
      {showAssign ? (
        <DispatchAssignForm
          driverId={order.driverId}
          drivers={drivers}
          equipmentId={order.equipmentId}
          equipmentTypeId={order.equipmentTypeId}
          orderId={order.id}
          units={units}
        />
      ) : null}
      <DispatchQuickActions orderId={order.id} status={order.status} />
    </article>
  );
}
