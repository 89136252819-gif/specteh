import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/page-header";
import { OrganizationsDirectory } from "@/components/organizations-directory";

export default async function OrganizationsPage() {
  const organizations = await prisma.organization.findMany({ orderBy: { name: "asc" } });

  return (
    <div>
      <PageHeader
        title="Наши организации"
        subtitle="Счёт и акт идут от юрлица, которое привязано к способу оплаты. Реквизиты и образец документов — в карточке."
      />
      <OrganizationsDirectory
        organizations={organizations.map((org) => ({
          id: org.id,
          name: org.name,
          shortName: org.shortName,
          inn: org.inn,
          kpp: org.kpp,
          ogrn: org.ogrn,
          legalAddress: org.legalAddress,
          phone: org.phone,
          email: org.email,
          bankName: org.bankName,
          bik: org.bik,
          account: org.account,
          corrAccount: org.corrAccount,
          directorName: org.directorName,
          directorTitle: org.directorTitle,
          vatRate: org.vatRate,
          paymentMethod: org.paymentMethod,
          invoicePrefix: org.invoicePrefix,
          actPrefix: org.actPrefix,
          signatureFile: org.signatureFile,
          stampFile: org.stampFile,
        }))}
      />
    </div>
  );
}
