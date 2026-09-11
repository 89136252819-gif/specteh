import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/page-header";
import { PricesDirectory } from "@/components/prices-directory";

export default async function PricesPage() {
  const [types, customers, prices] = await Promise.all([
    prisma.equipmentType.findMany({ orderBy: { name: "asc" } }),
    prisma.customer.findMany({ orderBy: { name: "asc" } }),
    prisma.priceItem.findMany({
      include: { equipmentType: true, customer: true },
      orderBy: [{ equipmentType: { name: "asc" } }, { kind: "asc" }],
    }),
  ]);

  return (
    <div>
      <PageHeader title="Прайс" subtitle="Базовые ставки и цены для конкретного заказчика. Добавление и правка — в карточке." />
      <PricesDirectory
        customers={customers.map((customer) => ({ id: customer.id, name: customer.name }))}
        prices={prices.map((price) => ({
          id: price.id,
          equipmentTypeId: price.equipmentTypeId,
          kind: price.kind,
          amount: price.amount,
          customerId: price.customerId,
          label: price.label,
          typeName: price.equipmentType.name,
          customerName: price.customer?.name || null,
        }))}
        types={types.map((type) => ({ id: type.id, name: type.name }))}
      />
    </div>
  );
}
