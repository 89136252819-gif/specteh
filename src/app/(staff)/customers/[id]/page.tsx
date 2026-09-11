import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { saveCustomer } from "@/actions/catalogs";
import { PageHeader } from "@/components/page-header";
import { Card, CardBody } from "@/components/ui/card";
import { CustomerForm } from "@/components/forms/customer-form";
import { CustomerMergeForm } from "@/components/customer-merge-form";
import { CustomerPriceHistory } from "@/components/customer-price-history";

export default async function CustomerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const customer = await prisma.customer.findUnique({
    where: { id },
    include: {
      priceOverrides: {
        include: { equipmentType: true },
        orderBy: [{ equipmentTypeId: "asc" }, { kind: "asc" }],
      },
      orders: {
        orderBy: { scheduledAt: "desc" },
        take: 80,
        include: {
          equipmentType: true,
          invoice: { select: { amount: true, linesJson: true } },
          report: { select: { billingJson: true } },
        },
      },
    },
  });
  if (!customer) notFound();

  const others = await prisma.customer.findMany({
    where: { id: { not: id } },
    orderBy: { name: "asc" },
    select: { id: true, name: true, phone: true, inn: true },
    take: 500,
  });

  return (
    <div className="space-y-6">
      <PageHeader title={customer.name} subtitle={customer.contactName} />
      <Card>
        <CardBody className="space-y-6">
          <CustomerForm action={saveCustomer} customer={customer} />
          <CustomerMergeForm keepId={customer.id} others={others} />
        </CardBody>
      </Card>
      <Card>
        <CardBody>
          <CustomerPriceHistory orders={customer.orders} overrides={customer.priceOverrides} />
        </CardBody>
      </Card>
    </div>
  );
}
