import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/page-header";
import { CtaLink } from "@/components/ui/cta";
import { DriversDirectory } from "@/components/drivers-directory";
import { formatDriverWhen } from "@/lib/utils";

export default async function DriversPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string; error?: string }>;
}) {
  const { id, error } = await searchParams;
  const [drivers, units] = await Promise.all([
    prisma.driver.findMany({
      include: {
        user: true,
        defaultEquipment: true,
        orders: { where: { status: { notIn: ["PAID", "CANCELLED"] } } },
        shifts: { where: { endedAt: null }, orderBy: { startedAt: "desc" }, take: 1 },
      },
      orderBy: { user: { name: "asc" } },
    }),
    prisma.equipment.findMany({ orderBy: { plateNumber: "asc" } }),
  ]);

  return (
    <div>
      <PageHeader
        title="Водители"
        subtitle="Справочник учёток, смен и закреплённой техники. Добавление и правка — в карточке записи."
        actions={<CtaLink href="/drivers/timesheet">Табель смен</CtaLink>}
      />
      <DriversDirectory
        drivers={drivers.map((driver) => ({
          id: driver.id,
          name: driver.user.name,
          login: driver.user.login,
          phone: driver.user.phone || "",
          licenseNumber: driver.licenseNumber,
          defaultEquipmentId: driver.defaultEquipmentId,
          equipmentLabel: driver.defaultEquipment
            ? `${driver.defaultEquipment.plateNumber} · ${driver.defaultEquipment.name}`
            : null,
          onShiftSince: driver.shifts[0] ? formatDriverWhen(driver.shifts[0].startedAt) : null,
          activeOrders: driver.orders.length,
          maxLinked: Boolean(driver.user.maxUserId),
        }))}
        initialId={id}
        loginError={error === "login"}
        units={units.map((unit) => ({ id: unit.id, name: unit.name, plateNumber: unit.plateNumber }))}
      />
    </div>
  );
}
