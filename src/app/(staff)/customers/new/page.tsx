import { saveCustomer } from "@/actions/catalogs";
import { PageHeader } from "@/components/page-header";
import { Card, CardBody } from "@/components/ui/card";
import { CustomerForm } from "@/components/forms/customer-form";

export default function NewCustomerPage() {
  return (
    <div className="max-w-3xl">
      <PageHeader title="Новый заказчик" />
      <Card>
        <CardBody>
          <CustomerForm action={saveCustomer} />
        </CardBody>
      </Card>
    </div>
  );
}
