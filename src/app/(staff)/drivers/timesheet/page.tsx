import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireStaff } from "@/lib/auth";
import { PageHeader } from "@/components/page-header";
import { SummaryStat } from "@/components/directory-chrome";
import { PersonAvatar } from "@/components/person-avatar";
import { Table, Td, Th } from "@/components/ui/table";
import { Select } from "@/components/ui/fields";
import { formatDate, formatHoursMinutes, shiftDurationMs } from "@/lib/utils";
import { startOfDay } from "@/lib/timesheet";

function timeOnly(value: Date) {
  return new Intl.DateTimeFormat("ru-RU", { hour: "2-digit", minute: "2-digit" }).format(value);
}

export default async function DriverTimesheetPage({
  searchParams,
}: {
  searchParams: Promise<{ driverId?: string }>;
}) {
  await requireStaff();
  const { driverId } = await searchParams;
  const from = new Date(startOfDay().getTime() - 29 * 86_400_000);

  const [drivers, openShifts, shifts] = await Promise.all([
    prisma.driver.findMany({ include: { user: true }, orderBy: { user: { name: "asc" } } }),
    prisma.driverShift.findMany({
      where: { endedAt: null, ...(driverId ? { driverId } : {}) },
      include: { driver: { include: { user: true } } },
      orderBy: { startedAt: "asc" },
    }),
    prisma.driverShift.findMany({
      where: { startedAt: { gte: from }, ...(driverId ? { driverId } : {}) },
      include: { driver: { include: { user: true } } },
      orderBy: { startedAt: "desc" },
    }),
  ]);

  const now = Date.now();
  const uniqueDrivers = new Set(shifts.map((shift) => shift.driverId)).size;

  return (
    <div className="space-y-4">
      <PageHeader
        title="Табель смен"
        subtitle="Начало и конец рабочей смены, которые водители отмечают в кабинете с телефона."
        actions={
          <Link className="text-sm font-semibold text-menu-hover hover:underline" href="/drivers">
            К водителям
          </Link>
        }
      />

      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        <SummaryStat hint="начали смену" label="На линии" tone="accent" value={openShifts.length} />
        <SummaryStat hint="за 30 дней" label="Смен" value={shifts.length} />
        <SummaryStat hint="с отметками в периоде" label="Водителей" value={uniqueDrivers} />
      </div>

      <div className="panel">
        <div className="flex flex-col gap-3 border-b border-slate-100 px-4 py-4 sm:flex-row sm:items-end sm:justify-between">
          <form className="flex flex-wrap items-end gap-3">
            <label className="block text-sm font-semibold text-stone-700">
              Водитель
              <Select className="mt-1 w-72" defaultValue={driverId || ""} name="driverId">
                <option value="">Все</option>
                {drivers.map((driver) => (
                  <option key={driver.id} value={driver.id}>
                    {driver.user.name}
                  </option>
                ))}
              </Select>
            </label>
            <button className="inline-flex h-10 items-center rounded-2xl bg-navy px-4 text-sm font-semibold text-white" type="submit">
              Показать
            </button>
          </form>
        </div>

        <div className="border-b border-slate-100 px-4 py-4">
          <h2 className="mb-3 text-sm font-extrabold text-navy">Сейчас на линии</h2>
          {openShifts.length === 0 ? (
            <p className="rounded-2xl bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">Никто не отметил начало смены</p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {openShifts.map((shift) => (
                <div className="flex items-start gap-3 rounded-2xl bg-navy px-4 py-3 text-white" key={shift.id}>
                  <PersonAvatar className="bg-white/15 text-white" name={shift.driver.user.name} />
                  <div className="min-w-0">
                    <div className="truncate font-extrabold">{shift.driver.user.name}</div>
                    <div className="mt-1 text-sm text-white/70">
                      с {formatDate(shift.startedAt)} {timeOnly(shift.startedAt)}
                    </div>
                    <div className="mt-1 text-sm font-semibold text-menu-soft">
                      {formatHoursMinutes(shiftDurationMs(shift.startedAt, null, now))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {shifts.length === 0 ? (
          <p className="px-6 py-12 text-center text-sm text-slate-500">За последние 30 дней смен нет</p>
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Дата</Th>
                <Th>Водитель</Th>
                <Th>Начало</Th>
                <Th>Конец</Th>
                <Th>Часы</Th>
              </tr>
            </thead>
            <tbody>
              {shifts.map((shift) => (
                <tr key={shift.id}>
                  <Td>{formatDate(shift.startedAt)}</Td>
                  <Td>
                    <div className="flex items-center gap-2">
                      <PersonAvatar name={shift.driver.user.name} size="sm" />
                      <span className="font-medium">{shift.driver.user.name}</span>
                    </div>
                  </Td>
                  <Td>{timeOnly(shift.startedAt)}</Td>
                  <Td>{shift.endedAt ? timeOnly(shift.endedAt) : "идёт"}</Td>
                  <Td className="font-semibold">{formatHoursMinutes(shiftDurationMs(shift.startedAt, shift.endedAt, now))}</Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </div>
    </div>
  );
}
