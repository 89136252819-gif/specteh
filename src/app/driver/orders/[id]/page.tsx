import Link from "next/link";
import { notFound } from "next/navigation";
import { Check, ChevronLeft, MapPinned, Navigation, Phone } from "lucide-react";
import { prisma } from "@/lib/db";
import { requireDriver } from "@/lib/auth";
import { driverAccept } from "@/actions/driver";
import { StatusBadge } from "@/components/ui/badge";
import { SubmitButton } from "@/components/submit-button";
import { DriverDeclineForm } from "@/components/driver-decline-form";
import { DriverAdvanceButton } from "@/components/driver-advance-button";
import { DriverReportForm } from "@/components/driver-report-form";
import { ReportPhotos } from "@/components/report-photos";
import { AddressMap } from "@/components/address-map";
import { DRIVER_ADVANCE_LABEL, DRIVER_STEPS, driverStepDone } from "@/lib/driver-ui";
import { formatDriverWhen, mapsHref, parsePhotos, phoneHref, phonePretty } from "@/lib/utils";

export default async function DriverOrderPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireDriver();
  const { id } = await params;
  const order = await prisma.order.findUnique({
    where: { id },
    include: { customer: true, equipment: true, equipmentType: true, report: true },
  });
  if (!order || order.driverId !== session.driverId) notFound();

  const contactName = order.siteContact || order.customer.contactName;
  const contactPhone = order.sitePhone || order.customer.phone;
  const callHref = contactPhone ? phoneHref(contactPhone) : null;
  const routeHref = mapsHref(order.address);
  const advanceLabel = DRIVER_ADVANCE_LABEL[order.status];
  const equipment = order.equipment
    ? `${order.equipment.name} · ${order.equipment.plateNumber}`
    : order.equipmentType.name;
  const hasSticky =
    order.status === "ASSIGNED" || Boolean(advanceLabel) || order.status === "ON_SITE";

  return (
    <div className={hasSticky ? "space-y-4 pb-28" : "space-y-4"}>
      <Link className="inline-flex min-h-10 items-center gap-1 text-sm font-semibold text-slate-500" href="/driver">
        <ChevronLeft className="h-4 w-4" />
        К заявкам
      </Link>

      <div className="flex min-w-0 items-start justify-between gap-2">
        <div className="min-w-0">
          <h1 className="break-words text-xl font-extrabold text-navy">{order.number}</h1>
          <p className="mt-0.5 text-sm text-slate-500">{formatDriverWhen(order.scheduledAt)}</p>
        </div>
        <StatusBadge className="max-w-[9rem] shrink-0 whitespace-normal text-center leading-tight" status={order.status} />
      </div>

      <DriverStepper status={order.status} />

      <section className="overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-200/70">
        <div className="p-4">
          <div className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">Объект</div>
          <p className="mt-1 break-words text-[17px] font-semibold leading-snug text-navy">{order.address}</p>
          <p className="mt-2 break-words text-sm text-slate-500">{order.customer.name}</p>
        </div>
        <div className="grid grid-cols-2 gap-px bg-slate-100">
          {callHref ? (
            <a
              className="flex min-h-14 items-center justify-center gap-2 bg-white text-sm font-bold text-menu-hover"
              href={callHref}
            >
              <Phone className="h-4 w-4" />
              Позвонить
            </a>
          ) : (
            <div className="flex min-h-14 items-center justify-center bg-white text-sm text-slate-400">Нет телефона</div>
          )}
          <a
            className="flex min-h-14 items-center justify-center gap-2 bg-white text-sm font-bold text-navy"
            href={routeHref}
            rel="noreferrer"
            target="_blank"
          >
            <Navigation className="h-4 w-4" />
            Маршрут
          </a>
        </div>
        <div className="border-t border-slate-100 p-3">
          <AddressMap address={order.address} compact />
        </div>
      </section>

      <section className="rounded-3xl bg-white p-4 text-[15px] shadow-sm ring-1 ring-slate-200/70">
        <Row label="Контакт" value={`${contactName}${contactPhone ? ` · ${phonePretty(contactPhone)}` : ""}`} />
        <Row label="Техника" value={equipment} />
        {order.comment ? <Row label="Комментарий" value={order.comment} /> : null}
      </section>

      {order.status === "ASSIGNED" ? (
        <div className="space-y-2">
          <form
            action={async () => {
              "use server";
              await driverAccept(order.id);
            }}
          >
            <div className="driver-sticky-cta">
              <SubmitButton className="h-14 w-full text-lg" size="lg" variant="success">
                Принять заявку
              </SubmitButton>
            </div>
          </form>
          <DriverDeclineForm orderId={order.id} />
        </div>
      ) : null}

      {advanceLabel ? (
        <div className="driver-sticky-cta">
          <DriverAdvanceButton label={advanceLabel} orderId={order.id} />
        </div>
      ) : null}

      {order.status === "ON_SITE" ? (
        <section className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-200/70">
          <DriverReportForm orderId={order.id} />
        </section>
      ) : null}

      {order.report ? (
        <section className="rounded-3xl bg-white p-4 text-sm shadow-sm ring-1 ring-slate-200/70">
          <h2 className="mb-2 flex items-center gap-2 font-extrabold text-navy">
            <MapPinned className="h-4 w-4 text-menu-hover" />
            Сданный отчёт
          </h2>
          <Row label="Подача" value={String(order.report.deliveryQty)} />
          <Row label="Часы" value={String(order.report.hours)} />
          <Row label="Простой" value={String(order.report.idleHours)} />
          <Row label="Км" value={String(order.report.km)} />
          {order.report.isWeekend ? <Row label="Выходной" value="Да" /> : null}
          {order.report.comment ? <Row label="Комментарий" value={order.report.comment} /> : null}
          <ReportPhotos photos={parsePhotos(order.report.photosJson)} />
        </section>
      ) : null}
    </div>
  );
}

function DriverStepper({ status }: { status: string }) {
  const done = driverStepDone(status);
  return (
    <ol className="grid grid-cols-4 gap-1">
      {DRIVER_STEPS.map((label, index) => {
        const complete = done > index;
        const current = done === index;
        return (
          <li className="flex flex-col items-center gap-1.5" key={label}>
            <span
              className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ${
                complete
                  ? "bg-menu text-white"
                  : current
                    ? "bg-menu-soft text-menu-hover ring-2 ring-menu/40"
                    : "bg-slate-200 text-slate-500"
              }`}
            >
              {complete ? <Check className="h-4 w-4" /> : index + 1}
            </span>
            <span className={`text-center text-[11px] font-semibold leading-tight ${complete || current ? "text-navy" : "text-slate-400"}`}>
              {label}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-b border-slate-100 py-2.5 last:border-0">
      <div className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">{label}</div>
      <div className="mt-0.5 break-words leading-snug text-navy">{value}</div>
    </div>
  );
}
