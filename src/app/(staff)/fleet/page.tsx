import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/page-header";
import { Card, CardBody } from "@/components/ui/card";
import { EquipmentTypesEditor } from "@/components/equipment-types-editor";
import { EquipmentTypeLabel } from "@/components/equipment-type-icon";
import { FleetDirectory } from "@/components/fleet-directory";

export default async function FleetPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; id?: string }>;
}) {
  const { error, id } = await searchParams;
  const [types, units] = await Promise.all([
    prisma.equipmentType.findMany({ orderBy: { name: "asc" }, include: { _count: { select: { units: true } } } }),
    prisma.equipment.findMany({ orderBy: { plateNumber: "asc" }, include: { type: true } }),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Парк техники"
        subtitle="Список единиц — основной экран. Добавление и правка открываются карточкой."
      />
      <Card>
        <CardBody>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <h2 className="flex items-center gap-2 font-semibold text-navy">
              <span className="h-1.5 w-1.5 rounded-full bg-menu" />
              Типы техники
            </h2>
            <EquipmentTypesEditor
              types={types.map((type) => ({ id: type.id, name: type.name, units: type._count.units }))}
            />
          </div>
          <ul className="flex flex-wrap gap-2">
            {types.map((type) => (
              <li
                className="flex items-center gap-2 rounded-2xl bg-slate-50 px-2.5 py-1.5 ring-1 ring-slate-100"
                key={type.id}
              >
                <EquipmentTypeLabel className="text-sm font-medium text-navy" name={type.name} size="sm" />
                <span className="text-xs text-slate-400">{type._count.units}</span>
              </li>
            ))}
          </ul>
        </CardBody>
      </Card>
      <FleetDirectory
        error={error}
        initialId={id}
        types={types.map((type) => ({ id: type.id, name: type.name }))}
        units={units.map((unit) => ({
          id: unit.id,
          name: unit.name,
          plateNumber: unit.plateNumber,
          status: unit.status,
          notes: unit.notes,
          typeId: unit.typeId,
          typeName: unit.type.name,
        }))}
      />
    </div>
  );
}
