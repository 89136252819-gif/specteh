import { Clock3 } from "lucide-react";
import { prisma } from "@/lib/db";
import { requireDriver } from "@/lib/auth";
import { DriverShiftCard } from "@/components/driver-shift-card";
import { elapsedInRange, startOfDay, startOfMonth } from "@/lib/timesheet";
import { formatDayHeading, formatHoursMinutes, shiftDurationMs } from "@/lib/utils";

export default async function DriverShiftPage() {
  const session = await requireDriver();
  const today = startOfDay();
  const tomorrow = new Date(today.getTime() + 86_400_000);
  const monthStart = startOfMonth();

  const [openShift, shifts] = await Promise.all([
    prisma.driverShift.findFirst({
      where: { driverId: session.driverId, endedAt: null },
    }),
    prisma.driverShift.findMany({
      where: { driverId: session.driverId, startedAt: { gte: monthStart } },
      orderBy: { startedAt: "desc" },
    }),
  ]);

  const now = new Date();
  const todayMs = shifts.reduce((sum, shift) => sum + elapsedInRange(shift.startedAt, shift.endedAt, today, tomorrow, now), 0);
  const monthMs = shifts.reduce((sum, shift) => sum + shiftDurationMs(shift.startedAt, shift.endedAt, now.getTime()), 0);

  const groups = new Map<string, typeof shifts>();
  for (const shift of shifts) {
    const key = formatDayHeading(shift.startedAt);
    const list = groups.get(key) ?? [];
    list.push(shift);
    groups.set(key, list);
  }

  return (
    <div className="space-y-5">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-400">Учёт времени</p>
        <h1 className="mt-1 text-2xl font-extrabold text-navy">Смена</h1>
      </div>

      <DriverShiftCard startedAt={openShift?.startedAt.toISOString() ?? null} todayMs={todayMs} />

      <div className="grid grid-cols-2 gap-3">
        <Stat label="Сегодня" value={formatHoursMinutes(todayMs)} />
        <Stat label="За месяц" value={formatHoursMinutes(monthMs)} />
      </div>

      {shifts.length === 0 ? (
        <div className="rounded-3xl bg-white/90 px-6 py-12 text-center shadow-sm ring-1 ring-slate-200/70">
          <Clock3 className="mx-auto h-10 w-10 text-slate-300" />
          <p className="mt-3 font-semibold text-navy">Смен пока нет</p>
          <p className="mt-1 text-sm text-slate-500">Начните смену на главном экране — время запишется сюда</p>
        </div>
      ) : (
        [...groups.entries()].map(([heading, items]) => (
          <section className="space-y-2" key={heading}>
            <h2 className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">{heading}</h2>
            {items.map((shift) => (
              <article className="rounded-3xl bg-white px-4 py-3 shadow-sm ring-1 ring-slate-200/70" key={shift.id}>
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-[15px] font-extrabold text-navy">
                      {timeOnly(shift.startedAt)}
                      {" — "}
                      {shift.endedAt ? timeOnly(shift.endedAt) : "идёт"}
                    </div>
                    <div className="mt-0.5 text-sm text-slate-500">
                      {shift.endedAt ? formatHoursMinutes(shiftDurationMs(shift.startedAt, shift.endedAt)) : "Смена открыта"}
                    </div>
                  </div>
                  {!shift.endedAt ? (
                    <span className="rounded-full bg-menu-soft px-2.5 py-1 text-[11px] font-bold text-menu-hover">Сейчас</span>
                  ) : null}
                </div>
              </article>
            ))}
          </section>
        ))
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-3xl bg-white px-4 py-3 shadow-sm ring-1 ring-slate-200/70">
      <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400">{label}</div>
      <div className="mt-1 break-words text-lg font-extrabold leading-tight text-navy">{value}</div>
    </div>
  );
}

function timeOnly(value: Date) {
  return new Intl.DateTimeFormat("ru-RU", { hour: "2-digit", minute: "2-digit" }).format(value);
}
