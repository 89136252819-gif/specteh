import Link from "next/link";
import { ChevronRight, Clock, MapPin, Navigation, Phone, Truck } from "lucide-react";
import { StatusBadge } from "@/components/ui/badge";
import { DRIVER_NEXT_ACTION } from "@/lib/driver-ui";
import { formatDriverWhen, mapsHref, phoneHref } from "@/lib/utils";

type DriverOrderCardProps = {
  id: string;
  number: string;
  status: string;
  scheduledAt: Date | string;
  address: string;
  equipmentLabel: string;
  customerName?: string;
  contactPhone?: string | null;
  showNext?: boolean;
};

export function DriverOrderCard({
  id,
  number,
  status,
  scheduledAt,
  address,
  equipmentLabel,
  customerName,
  contactPhone,
  showNext = true,
}: DriverOrderCardProps) {
  const next = DRIVER_NEXT_ACTION[status];
  const callHref = contactPhone ? phoneHref(contactPhone) : null;
  const routeHref = mapsHref(address);

  return (
    <article className="relative min-w-0 overflow-hidden rounded-3xl border border-white bg-white shadow-[0_10px_28px_rgba(31,41,51,0.07)] ring-1 ring-slate-200/70">
      <span className="absolute inset-y-0 left-0 w-1.5 bg-menu" />
      <Link className="block p-4 pl-5" href={`/driver/orders/${id}`}>
        <div className="flex min-w-0 items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="truncate text-[15px] font-extrabold text-navy">{number}</div>
            <div className="mt-0.5 flex min-w-0 items-center gap-1.5 text-sm text-slate-500">
              <Clock className="h-3.5 w-3.5 shrink-0" />
              <span className="min-w-0 truncate">{formatDriverWhen(scheduledAt)}</span>
            </div>
          </div>
          <StatusBadge className="max-w-[9rem] shrink-0 whitespace-normal text-center leading-tight" status={status} />
        </div>
        {customerName ? <div className="mt-2 break-words text-sm font-semibold text-slate-700">{customerName}</div> : null}
        <div className="mt-2 flex min-w-0 items-start gap-2 text-[15px] leading-snug text-navy">
          <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-menu-hover" />
          <span className="min-w-0 break-words">{address}</span>
        </div>
        <div className="mt-2 flex min-w-0 items-center gap-2 text-sm text-slate-500">
          <Truck className="h-4 w-4 shrink-0 text-slate-400" />
          <span className="min-w-0 break-words">{equipmentLabel}</span>
        </div>
        {showNext && next ? (
          <div className="mt-3 flex min-w-0 items-center justify-between gap-2 rounded-2xl bg-menu-soft/80 px-3 py-2.5 text-sm font-bold text-menu-hover">
            <span className="min-w-0 break-words">{next}</span>
            <ChevronRight className="h-5 w-5 shrink-0" />
          </div>
        ) : null}
      </Link>
      <div className="grid grid-cols-2 gap-px border-t border-slate-100 bg-slate-100">
        {callHref ? (
          <a
            className="inline-flex min-h-11 items-center justify-center gap-2 bg-white text-sm font-bold text-menu-hover"
            href={callHref}
          >
            <Phone className="h-4 w-4" />
            Позвонить
          </a>
        ) : (
          <span className="inline-flex min-h-11 items-center justify-center gap-2 bg-white text-sm text-slate-300">
            <Phone className="h-4 w-4" />
            Нет телефона
          </span>
        )}
        <a
          className="inline-flex min-h-11 items-center justify-center gap-2 bg-white text-sm font-bold text-menu-hover"
          href={routeHref}
          rel="noopener noreferrer"
          target="_blank"
        >
          <Navigation className="h-4 w-4" />
          Маршрут
        </a>
      </div>
    </article>
  );
}
