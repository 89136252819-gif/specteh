import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2, Clock3, MapPin, PhoneCall, ShieldCheck, Truck } from "lucide-react";
import { prisma } from "@/lib/db";
import { BrandLogo } from "@/components/brand-logo";
import { PublicOrderForm } from "@/components/public-order-form";
import { EquipmentTypeIcon } from "@/components/equipment-type-icon";
import { PRICE_KINDS } from "@/lib/constants";
import { formatPublicPrice, phoneHref, phonePretty } from "@/lib/utils";
import { isHiddenFromPublicCatalog } from "@/lib/public-catalog";
import { getMaxSetup } from "@/lib/max";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Аренда спецтехники — Рэдианс-СпецТех",
  description: "Экскаватор, самосвал и манипулятор с экипажем в Омске. Заявка на сайте — диспетчер перезвонит и подтвердит подачу.",
};

const TYPE_LEAD: Record<string, string> = {
  "Экскаватор-погрузчик": "Котлованы, траншеи, планировка, погрузка",
  "Самосвал 8х4": "Вывоз грунта и доставка сыпучих",
  Автоманипулятор: "Перевозка и установка без отдельного крана",
  "Мини-трактор": "Уборка, планировка, работы во дворе и на участке",
  Газель: "Доставка грузов и материалы по городу",
  Экскаватор: "Котлованы, траншеи, планировка площадки",
  Самосвал: "Вывоз грунта и доставка сыпучих",
  Манипулятор: "Перевозка и установка без отдельного крана",
};

const STEPS = [
  { title: "Заявка на сайте", text: "Техника, адрес и удобное время — без звонка в офис." },
  { title: "Звонок диспетчера", text: "Перезвоним, уточним объект и закрепим машину." },
  { title: "Подача и закрытие", text: "Водитель выезжает на объект. Счёт и акт — после смены." },
];

export default async function PublicOrderPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string }>;
}) {
  const { type: typeParam } = await searchParams;
  const [types, organizations, maxSetup] = await Promise.all([
    prisma.equipmentType.findMany({
      orderBy: { name: "asc" },
      include: {
        priceItems: { where: { customerId: null } },
        units: { where: { status: { not: "REPAIR" } }, orderBy: { plateNumber: "asc" }, take: 3 },
      },
    }),
    prisma.organization.findMany({
      where: { isActive: true },
      select: { shortName: true, name: true, phone: true, paymentMethod: true },
      orderBy: { shortName: "asc" },
    }),
    getMaxSetup(),
  ]);

  const options = types
    .filter((type) => !isHiddenFromPublicCatalog(type.name))
    .map((type) => {
      const hour = type.priceItems.find((item) => item.kind === PRICE_KINDS.HOUR);
      const delivery = type.priceItems.find((item) => item.kind === PRICE_KINDS.DELIVERY);
      const region = type.priceItems.find((item) => item.kind === PRICE_KINDS.DELIVERY_REGION);
      const minHours = type.priceItems.find((item) => item.kind === PRICE_KINDS.MIN_HOURS);
      return {
        id: type.id,
        name: type.name,
        hourPrice: hour?.amount ?? null,
        deliveryPrice: delivery?.amount ?? null,
        regionDeliveryPrice: region?.amount ?? null,
        minHours: minHours?.amount ?? null,
        lead: TYPE_LEAD[type.name] || "С экипажем, по заявке",
        units: type.units.map((unit) =>
          unit.plateNumber === "БЕЗ НОМЕРА" ? unit.name : `${unit.name} · ${unit.plateNumber}`,
        ),
      };
    });

  const dispatchPhone = organizations.find((org) => org.phone)?.phone || "+79507862923";
  const tel = phoneHref(dispatchPhone) || "tel:+79507862923";
  const wa = `https://wa.me/${dispatchPhone.replace(/\D/g, "")}`;

  return (
    <div className="public-site min-h-screen w-full max-w-full overflow-x-clip bg-transparent pb-20 md:pb-0">
      <header className="sticky top-0 z-20 border-b border-white/80 bg-white/80 px-4 py-3 backdrop-blur-xl sm:px-8">
        <div className="mx-auto flex w-full max-w-6xl min-w-0 items-center justify-between gap-2 sm:gap-3">
          <BrandLogo className="min-w-0 text-navy" subtitle="аренда спецтехники" />
          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            <a
              className="inline-flex items-center gap-1.5 rounded-full bg-menu-soft px-2.5 py-2 text-xs font-semibold text-menu-hover sm:px-3 sm:text-sm"
              href={tel}
            >
              <PhoneCall className="h-4 w-4 shrink-0" />
              <span className="whitespace-nowrap">{phonePretty(dispatchPhone)}</span>
            </a>
            <Link
              className="rounded-full bg-white px-3 py-2 text-sm font-semibold text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50"
              href="/login"
            >
              <span className="sm:hidden">Вход</span>
              <span className="hidden sm:inline">Вход для сотрудников</span>
            </Link>
          </div>
        </div>
      </header>

      <section className="relative overflow-hidden bg-[#3a434d] px-4 py-16 text-white sm:px-8 sm:py-24">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_16%_10%,rgba(30,179,168,0.32),transparent_38%),radial-gradient(circle_at_90%_88%,rgba(255,255,255,0.08),transparent_40%)]" />
        <div
          className="absolute inset-0 opacity-[0.1]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.7) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.7) 1px, transparent 1px)",
            backgroundSize: "48px 48px",
          }}
        />
        <div className="float-orb absolute -left-16 top-10 h-72 w-72 rounded-full bg-menu/25 blur-3xl" />
        <div className="relative mx-auto grid max-w-6xl gap-10 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-menu-soft">ООО «Рэдианс» · Омск</p>
            <h1 className="mt-4 max-w-xl text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-5xl">
              Спецтехника на объект — в день заявки
            </h1>
            <p className="mt-5 max-w-lg text-base leading-relaxed text-white/70">
              Экскаваторы, самосвалы и манипуляторы со своими водителями. Диспетчер перезвонит и подтвердит подачу. Счёт и акт — после смены.
            </p>
            <div className="mt-8 flex flex-wrap gap-2">
              {["Свой парк", "Экипаж", "Счета и акты", "Подача по Омску и области"].map((item) => (
                <span
                  className="rounded-full bg-white/10 px-3.5 py-1.5 text-xs font-semibold text-white/90 ring-1 ring-white/15"
                  key={item}
                >
                  {item}
                </span>
              ))}
            </div>
            <div className="mt-8 flex flex-wrap gap-3">
              <a
                className="inline-flex h-12 items-center rounded-2xl bg-menu px-6 text-sm font-bold text-white shadow-lg shadow-black/20 hover:bg-menu-hover"
                href="#order"
              >
                Заказать технику
              </a>
              <a
                className="inline-flex h-12 items-center rounded-2xl bg-white/10 px-5 text-sm font-bold text-white ring-1 ring-white/20 hover:bg-white/15"
                href={tel}
              >
                {phonePretty(dispatchPhone)}
              </a>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {[
              { icon: Clock3, title: "Быстрый ответ", text: "Диспетчер связывается после заявки" },
              { icon: Truck, title: "Свой парк", text: "Машины на линии, не «с рынка»" },
              { icon: ShieldCheck, title: "По договору", text: "Безнал с НДС, без НДС или наличные" },
              { icon: CheckCircle2, title: "Закрывающие", text: "Счёт и акт после выполнения" },
            ].map((item) => (
              <div className="rounded-3xl bg-white/10 p-4 ring-1 ring-white/10" key={item.title}>
                <item.icon className="h-5 w-5 text-menu-soft" />
                <div className="mt-3 font-bold">{item.title}</div>
                <div className="mt-1 text-sm text-white/60">{item.text}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 py-16 sm:px-8">
        <div className="mx-auto max-w-6xl">
          <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-menu-hover">Парк</p>
          <h2 className="mt-2 text-3xl font-extrabold text-navy">Какую технику подаём</h2>
          <div className={`mt-8 grid gap-4 sm:grid-cols-2 ${options.length >= 4 ? "lg:grid-cols-4" : "lg:grid-cols-3"}`}>
            {options.map((type) => (
              <a
                className="rounded-[1.75rem] border border-white bg-white/90 p-5 shadow-sm ring-1 ring-slate-100 transition hover:-translate-y-0.5 hover:shadow-md"
                href={`/order?type=${type.id}#order`}
                key={type.id}
              >
                <EquipmentTypeIcon className="mb-3" name={type.name} size="lg" />
                <div className="text-lg font-extrabold text-navy">{type.name}</div>
                <p className="mt-2 text-sm leading-relaxed text-slate-500">{type.lead}</p>
                {type.units.length ? (
                  <p className="mt-2 text-xs leading-snug text-slate-400">{type.units.join(" · ")}</p>
                ) : null}
                <div className="mt-4 text-sm font-bold leading-snug text-menu-hover">{formatPublicPrice(type)}</div>
              </a>
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 pb-8 sm:px-8">
        <div className="mx-auto max-w-6xl">
          <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-menu-hover">Как работаем</p>
          <h2 className="mt-2 text-3xl font-extrabold text-navy">От заявки до акта</h2>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {STEPS.map((step, index) => (
              <div className="rounded-[1.75rem] bg-white p-6 ring-1 ring-slate-100" key={step.title}>
                <div className="text-sm font-bold text-menu">{String(index + 1).padStart(2, "0")}</div>
                <h3 className="mt-2 text-lg font-extrabold text-navy">{step.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-500">{step.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="scroll-mt-24 px-4 py-16 sm:px-8" id="order">
        <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-menu-hover">Заявка</p>
            <h2 className="mt-2 text-3xl font-extrabold text-navy">Оставьте заказ — перезвоним</h2>
            <p className="mt-3 max-w-md text-sm leading-relaxed text-slate-500">
              Заявка сразу попадает диспетчеру. Подтвердим наличие машины и время подачи.
            </p>
            <ul className="mt-6 space-y-3 text-sm text-slate-600">
              <li className="flex gap-2">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-menu" />
                Омск, область и соседние регионы по согласованию
              </li>
              <li className="flex gap-2">
                <Clock3 className="mt-0.5 h-4 w-4 shrink-0 text-menu" />
                Подача в удобный слот, в том числе на утро смены
              </li>
              <li className="flex gap-2">
                <PhoneCall className="mt-0.5 h-4 w-4 shrink-0 text-menu" />
                <a className="font-semibold text-navy hover:text-menu-hover" href={tel}>
                  {phonePretty(dispatchPhone)}
                </a>
                <span className="text-slate-400">·</span>
                <a className="hover:text-menu-hover" href={wa} rel="noopener noreferrer" target="_blank">
                  WhatsApp
                </a>
              </li>
            </ul>
          </div>
          <div className="rounded-[2rem] border border-white bg-white/95 p-6 shadow-[0_24px_60px_rgba(31,41,51,0.08)] ring-1 ring-slate-100 sm:p-8">
            <PublicOrderForm botUsername={maxSetup.botUsername} initialTypeId={typeParam} types={options} />
          </div>
        </div>
      </section>

      <footer className="border-t border-slate-200/80 px-4 py-8 text-sm text-slate-500 sm:px-8">
        <div className="mx-auto flex max-w-6xl flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-2">
            <p className="font-semibold text-navy">© ООО «Рэдианс» · Омск</p>
            <p>
              <a className="font-semibold text-navy hover:text-menu-hover" href={tel}>
                {phonePretty(dispatchPhone)}
              </a>
            </p>
          </div>
          <Link className="font-semibold text-navy hover:text-menu-hover" href="/login">
            Вход в диспетчерскую
          </Link>
        </div>
      </footer>

      <a className="public-sticky-cta" href="#order">
        Заказать технику
      </a>
    </div>
  );
}
